use tauri::async_runtime::{spawn, spawn_blocking};
use tokio::sync::{mpsc, oneshot};

use super::ops;
use super::types::{SyncMessage, SyncResult};

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
    pub fn new() -> Self {
        let (sender, receiver) = mpsc::channel(32);
        spawn(run_actor(receiver));
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
}

/// The actor run loop. Processes messages sequentially from the mpsc receiver.
///
/// Each git2 operation is dispatched to `spawn_blocking` so the async runtime
/// is never blocked. This is the only place git2 ops are executed.
async fn run_actor(mut receiver: mpsc::Receiver<SyncMessage>) {
    while let Some(msg) = receiver.recv().await {
        match msg {
            SyncMessage::CommitAndPush {
                local_path,
                clone_url,
                token,
                reply,
                ..
            } => {
                let result = spawn_blocking(move || {
                    let had_changes = ops::commit_all(&local_path)?;
                    if had_changes {
                        ops::push_to_remote(&local_path, &clone_url, &token)?;
                    }
                    Ok(SyncResult::Pushed { had_changes })
                })
                .await
                .map_err(|e| e.to_string())
                .and_then(|r| r);

                if reply.send(result).is_err() {
                    eprintln!("[sync actor] CommitAndPush: caller dropped reply channel");
                }
            }

            SyncMessage::Pull {
                local_path,
                clone_url,
                token,
                reply,
                ..
            } => {
                let result = spawn_blocking(move || {
                    let conflicts = ops::pull(&local_path, &clone_url, &token)?;
                    if conflicts.is_empty() {
                        Ok(SyncResult::Pulled { conflicts: vec![] })
                    } else {
                        Ok(SyncResult::Pulled { conflicts })
                    }
                })
                .await
                .map_err(|e| e.to_string())
                .and_then(|r| r);

                if reply.send(result).is_err() {
                    eprintln!("[sync actor] Pull: caller dropped reply channel");
                }
            }
        }
    }
}
