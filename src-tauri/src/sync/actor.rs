use tauri::async_runtime::{spawn, spawn_blocking};
use tauri::Emitter;
use tokio::sync::{mpsc, oneshot};
use tokio::time::{sleep_until, Duration, Instant};

use super::ops;
use super::types::{SyncMessage, SyncResult, SyncStatusPayload};

/// Handle to the singleton git actor. Clone to pass into IPC commands.
///
/// All git2 operations are serialized through the actor's mpsc channel,
/// guaranteeing no concurrent git2 calls on the same repository.
#[derive(Clone)]
pub struct ActorHandle {
    sender: mpsc::Sender<SyncMessage>,
}

impl ActorHandle {
    /// Create the actor handle, spawn the actor loop, and return the handle.
    ///
    /// Call once in `setup()` then store via `app.manage()`.
    /// The app handle is used internally for emitting sync-status-changed events.
    pub fn new(app_handle: tauri::AppHandle) -> Self {
        let (sender, receiver) = mpsc::channel(32);
        spawn(run_actor(receiver, app_handle));
        Self { sender }
    }

    /// Send a commit+push message to the actor and await the result.
    pub async fn commit_and_push(
        &self,
        workspace_id: String,
        local_path: String,
        clone_url: String,
        token: String,
    ) -> Result<SyncResult, String> {
        let (reply_tx, reply_rx) = oneshot::channel();
        self.sender
            .send(SyncMessage::CommitAndPush {
                workspace_id,
                local_path,
                clone_url,
                token,
                reply: reply_tx,
            })
            .await
            .map_err(|_| "sync actor dropped".to_string())?;
        reply_rx
            .await
            .map_err(|_| "sync actor reply dropped".to_string())?
    }

    /// Send a pull message to the actor and await the result.
    pub async fn pull(
        &self,
        workspace_id: String,
        local_path: String,
        clone_url: String,
        token: String,
    ) -> Result<SyncResult, String> {
        let (reply_tx, reply_rx) = oneshot::channel();
        self.sender
            .send(SyncMessage::Pull {
                workspace_id,
                local_path,
                clone_url,
                token,
                reply: reply_tx,
            })
            .await
            .map_err(|_| "sync actor dropped".to_string())?;
        reply_rx
            .await
            .map_err(|_| "sync actor reply dropped".to_string())?
    }

    /// Fire-and-forget notification that content has changed.
    ///
    /// The actor debounces these: a commit+push fires 3 seconds after the last
    /// NotifyChange message. If offline, the push is queued until connectivity returns.
    pub async fn notify_change(
        &self,
        workspace_id: String,
        local_path: String,
        clone_url: String,
        token: String,
    ) -> Result<(), String> {
        self.sender
            .send(SyncMessage::NotifyChange {
                workspace_id,
                local_path,
                clone_url,
                token,
            })
            .await
            .map_err(|_| "sync actor dropped".to_string())
    }
}

/// Context for a pending debounced push.
struct PendingPush {
    workspace_id: String,
    local_path: String,
    clone_url: String,
    token: String,
}

/// The actor run loop. Processes messages sequentially from the mpsc receiver.
///
/// Uses tokio::select! to multiplex between:
/// - Incoming SyncMessage messages
/// - Debounce timer firing after 3s of inactivity
///
/// Each git2 operation is dispatched to `spawn_blocking` so the async runtime
/// is never blocked. This is the only place git2 ops are executed.
async fn run_actor(mut receiver: mpsc::Receiver<SyncMessage>, app: tauri::AppHandle) {
    // Far-future deadline so the sleep arm never fires until a NotifyChange arrives.
    let far_future = Instant::now() + Duration::from_secs(86400);
    let debounce_sleep = sleep_until(far_future);
    tokio::pin!(debounce_sleep);

    let mut pending_push: Option<PendingPush> = None;
    let mut is_offline = false;

    loop {
        tokio::select! {
            // Arm 1: Debounce timer fired — execute the pending push.
            () = &mut debounce_sleep, if pending_push.is_some() && !is_offline => {
                if let Some(pending) = pending_push.take() {
                    emit_status(&app, &pending.workspace_id, "syncing", None, vec![]);

                    let lp = pending.local_path.clone();
                    let cu = pending.clone_url.clone();
                    let tk = pending.token.clone();
                    let result = spawn_blocking(move || {
                        let had_changes = ops::commit_all(&lp)?;
                        if had_changes {
                            ops::push_to_remote(&lp, &cu, &tk)?;
                        }
                        Ok::<SyncResult, String>(SyncResult::Pushed { had_changes })
                    })
                    .await
                    .map_err(|e| e.to_string())
                    .and_then(|r| r);

                    match result {
                        Ok(_) => {
                            emit_status(&app, &pending.workspace_id, "synced", None, vec![]);
                        }
                        Err(ref e) if is_network_error(e) => {
                            is_offline = true;
                            // Re-queue the push context so it fires when connectivity returns.
                            pending_push = Some(PendingPush {
                                workspace_id: pending.workspace_id.clone(),
                                local_path: pending.local_path,
                                clone_url: pending.clone_url,
                                token: pending.token,
                            });
                            emit_status(&app, &pending.workspace_id, "offline", Some(e.clone()), vec![]);
                        }
                        Err(e) => {
                            emit_status(&app, &pending.workspace_id, "error", Some(e), vec![]);
                        }
                    }

                    // Reset sleep to far future regardless of outcome.
                    debounce_sleep.as_mut().reset(Instant::now() + Duration::from_secs(86400));
                }
            }

            // Arm 2: Incoming message.
            maybe_msg = receiver.recv() => {
                let msg = match maybe_msg {
                    Some(m) => m,
                    None => break, // Sender dropped; shut down the actor.
                };

                match msg {
                    SyncMessage::NotifyChange {
                        workspace_id,
                        local_path,
                        clone_url,
                        token,
                    } => {
                        // Always store the latest context (supersedes previous pending push).
                        pending_push = Some(PendingPush { workspace_id, local_path, clone_url, token });

                        // Reset the debounce timer — but only if we are online.
                        // While offline, there is no point timing since we cannot push.
                        if !is_offline {
                            debounce_sleep.as_mut().reset(Instant::now() + Duration::from_secs(3));
                        }
                    }

                    SyncMessage::CommitAndPush {
                        workspace_id,
                        local_path,
                        clone_url,
                        token,
                        reply,
                    } => {
                        let lp = local_path.clone();
                        let cu = clone_url.clone();
                        let tk = token.clone();
                        let result = spawn_blocking(move || {
                            let had_changes = ops::commit_all(&lp)?;
                            if had_changes {
                                ops::push_to_remote(&lp, &cu, &tk)?;
                            }
                            Ok(SyncResult::Pushed { had_changes })
                        })
                        .await
                        .map_err(|e| e.to_string())
                        .and_then(|r| r);

                        if let Err(ref e) = result {
                            if is_network_error(e) {
                                is_offline = true;
                                emit_status(&app, &workspace_id, "offline", Some(e.clone()), vec![]);
                            }
                        }

                        if reply.send(result).is_err() {
                            eprintln!("[sync actor] CommitAndPush: caller dropped reply channel");
                        }
                    }

                    SyncMessage::Pull {
                        workspace_id,
                        local_path,
                        clone_url,
                        token,
                        reply,
                    } => {
                        let lp = local_path.clone();
                        let cu = clone_url.clone();
                        let tk = token.clone();
                        let result = spawn_blocking(move || {
                            let conflicts = ops::pull(&lp, &cu, &tk)?;
                            if conflicts.is_empty() {
                                Ok(SyncResult::Pulled { conflicts: vec![] })
                            } else {
                                Ok(SyncResult::Pulled { conflicts })
                            }
                        })
                        .await
                        .map_err(|e| e.to_string())
                        .and_then(|r| r);

                        match &result {
                            Ok(_) if is_offline => {
                                // Reconnected — clear offline flag.
                                is_offline = false;
                                emit_status(&app, &workspace_id, "synced", None, vec![]);

                                // Flush any pending push immediately (D-06 reconnection flush).
                                if let Some(pending) = pending_push.take() {
                                    let lp2 = pending.local_path.clone();
                                    let cu2 = pending.clone_url.clone();
                                    let tk2 = pending.token.clone();
                                    emit_status(&app, &pending.workspace_id, "syncing", None, vec![]);
                                    let flush_result = spawn_blocking(move || {
                                        let had_changes = ops::commit_all(&lp2)?;
                                        if had_changes {
                                            ops::push_to_remote(&lp2, &cu2, &tk2)?;
                                        }
                                        Ok::<SyncResult, String>(SyncResult::Pushed { had_changes })
                                    })
                                    .await
                                    .map_err(|e| e.to_string())
                                    .and_then(|r| r);

                                    match flush_result {
                                        Ok(_) => emit_status(&app, &pending.workspace_id, "synced", None, vec![]),
                                        Err(e) => emit_status(&app, &pending.workspace_id, "error", Some(e), vec![]),
                                    }
                                }

                                // Reset debounce timer to far future (no pending push left).
                                debounce_sleep.as_mut().reset(Instant::now() + Duration::from_secs(86400));
                            }
                            Err(e) if is_network_error(e) => {
                                is_offline = true;
                                emit_status(&app, &workspace_id, "offline", Some(e.clone()), vec![]);
                            }
                            _ => {}
                        }

                        if reply.send(result).is_err() {
                            eprintln!("[sync actor] Pull: caller dropped reply channel");
                        }
                    }
                }
            }
        }
    }
}

/// Returns true if the error string represents a network connectivity failure
/// (not an auth failure, merge conflict, or other non-network error).
///
/// pub(crate) so tests.rs can call it directly.
pub(crate) fn is_network_error(err: &str) -> bool {
    let lower = err.to_lowercase();
    let is_network = lower.contains("could not connect")
        || lower.contains("network")
        || lower.contains("timed out")
        || lower.contains("connection refused")
        || lower.contains("resolve address")
        || lower.contains("nodename nor servname")
        || lower.contains("ssl");
    let is_auth = lower.contains("authentication failed") || lower.contains("not_authenticated");
    is_network && !is_auth
}

/// Emit a `sync-status-changed` Tauri event. Logs on error (never panics).
fn emit_status(
    app: &tauri::AppHandle,
    workspace_id: &str,
    status: &str,
    message: Option<String>,
    conflicts: Vec<String>,
) {
    if let Err(e) = app.emit(
        "sync-status-changed",
        SyncStatusPayload {
            workspace_id: workspace_id.to_string(),
            status: status.to_string(),
            message,
            conflicted_files: conflicts,
        },
    ) {
        eprintln!("[sync actor] Failed to emit sync-status-changed: {e}");
    }
}
