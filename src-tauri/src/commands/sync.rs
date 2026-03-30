use tauri::{Emitter, Manager};

use crate::auth::token;
use crate::sync::{actor::is_network_error, ActorHandle, SyncResult, SyncStatusPayload};
use crate::workspace::registry;

/// Commit all local changes, push to remote, then pull to apply remote updates.
///
/// This is the primary sync command triggered by the TopBar sync chip (D-07).
/// Emits `sync-status-changed` events at every status transition.
///
/// On push rejection (non-fast-forward): pulls first, then retries the push once.
#[tauri::command]
#[specta::specta]
pub async fn sync_workspace(
    app: tauri::AppHandle,
    workspace_id: String,
) -> Result<(), String> {
    // --- Resolve workspace ---
    let entries = registry::load_registry(&app)?;
    let entry = entries
        .iter()
        .find(|e| e.id == workspace_id)
        .ok_or_else(|| format!("Workspace not found: {workspace_id}"))?
        .clone();

    let clone_url = entry
        .clone_url
        .ok_or_else(|| "Cannot sync a local workspace".to_string())?;
    let local_path = entry.local_path.clone();

    // --- Load token ---
    let token = token::load_token(&app)?.ok_or_else(|| "not_authenticated".to_string())?;

    // --- Emit syncing ---
    app.emit(
        "sync-status-changed",
        SyncStatusPayload {
            workspace_id: workspace_id.clone(),
            status: "syncing".to_string(),
            message: None,
            conflicted_files: vec![],
        },
    )
    .map_err(|e| e.to_string())?;

    let actor = app.state::<ActorHandle>();

    // --- Commit + push ---
    let push_result = actor
        .commit_and_push(
            workspace_id.clone(),
            local_path.clone(),
            clone_url.clone(),
            token.clone(),
        )
        .await;

    // Handle non-fast-forward rejection: pull first, then retry push once
    let push_result = match push_result {
        Err(ref e) if e.contains("non-fast-forward") || e.contains("rejected") => {
            // Pull first to get remote changes
            let _ = actor
                .pull(
                    workspace_id.clone(),
                    local_path.clone(),
                    clone_url.clone(),
                    token.clone(),
                )
                .await;
            // Retry push
            actor
                .commit_and_push(
                    workspace_id.clone(),
                    local_path.clone(),
                    clone_url.clone(),
                    token.clone(),
                )
                .await
        }
        other => other,
    };

    if let Err(ref push_err) = push_result {
        let err_msg: String = push_err.clone();
        let status = if is_network_error(&err_msg) { "offline" } else { "error" };
        app.emit(
            "sync-status-changed",
            SyncStatusPayload {
                workspace_id: workspace_id.clone(),
                status: status.to_string(),
                message: Some(err_msg.clone()),
                conflicted_files: vec![],
            },
        )
        .map_err(|e| e.to_string())?;
        return Err(format!("Sync failed: {err_msg}"));
    }

    // --- Pull to apply remote changes ---
    let pull_result = actor
        .pull(
            workspace_id.clone(),
            local_path,
            clone_url,
            token,
        )
        .await;

    match pull_result {
        Ok(SyncResult::Pulled { conflicts }) => {
            app.emit(
                "sync-status-changed",
                SyncStatusPayload {
                    workspace_id,
                    status: "synced".to_string(),
                    message: None,
                    conflicted_files: conflicts,
                },
            )
            .map_err(|e| e.to_string())?;
        }
        Ok(_) => {
            app.emit(
                "sync-status-changed",
                SyncStatusPayload {
                    workspace_id,
                    status: "synced".to_string(),
                    message: None,
                    conflicted_files: vec![],
                },
            )
            .map_err(|e| e.to_string())?;
        }
        Err(e) => {
            let status = if is_network_error(&e) { "offline" } else { "error" };
            app.emit(
                "sync-status-changed",
                SyncStatusPayload {
                    workspace_id: workspace_id.clone(),
                    status: status.to_string(),
                    message: Some(e.clone()),
                    conflicted_files: vec![],
                },
            )
            .map_err(|err| err.to_string())?;
            return Err(format!("Pull after push failed: {e}"));
        }
    }

    Ok(())
}

/// Pull the latest remote changes for a workspace.
///
/// Called automatically on workspace switch (D-12). Does not commit local changes.
/// Emits `sync-status-changed` events.
#[tauri::command]
#[specta::specta]
pub async fn pull_workspace(
    app: tauri::AppHandle,
    workspace_id: String,
) -> Result<(), String> {
    // --- Resolve workspace ---
    let entries = registry::load_registry(&app)?;
    let entry = entries
        .iter()
        .find(|e| e.id == workspace_id)
        .ok_or_else(|| format!("Workspace not found: {workspace_id}"))?
        .clone();

    let clone_url = entry
        .clone_url
        .ok_or_else(|| "Cannot pull a local workspace".to_string())?;
    let local_path = entry.local_path;

    // --- Load token ---
    let token = token::load_token(&app)?.ok_or_else(|| "not_authenticated".to_string())?;

    // --- Emit syncing ---
    app.emit(
        "sync-status-changed",
        SyncStatusPayload {
            workspace_id: workspace_id.clone(),
            status: "syncing".to_string(),
            message: None,
            conflicted_files: vec![],
        },
    )
    .map_err(|e| e.to_string())?;

    let actor = app.state::<ActorHandle>();

    let result = actor
        .pull(workspace_id.clone(), local_path, clone_url, token)
        .await;

    match result {
        Ok(SyncResult::Pulled { conflicts }) => {
            app.emit(
                "sync-status-changed",
                SyncStatusPayload {
                    workspace_id,
                    status: "synced".to_string(),
                    message: None,
                    conflicted_files: conflicts,
                },
            )
            .map_err(|e| e.to_string())?;
        }
        Ok(_) => {
            app.emit(
                "sync-status-changed",
                SyncStatusPayload {
                    workspace_id,
                    status: "synced".to_string(),
                    message: None,
                    conflicted_files: vec![],
                },
            )
            .map_err(|e| e.to_string())?;
        }
        Err(e) => {
            let status = if is_network_error(&e) { "offline" } else { "error" };
            app.emit(
                "sync-status-changed",
                SyncStatusPayload {
                    workspace_id: workspace_id.clone(),
                    status: status.to_string(),
                    message: Some(e.clone()),
                    conflicted_files: vec![],
                },
            )
            .map_err(|err| err.to_string())?;
            return Err(format!("Pull failed: {e}"));
        }
    }

    Ok(())
}

/// Internal best-effort helper called by all mutating save commands.
///
/// Failures are silently ignored — sync failure must never fail a save operation.
pub(crate) async fn notify_change_inner(app: &tauri::AppHandle, workspace_id: String) {
    use tauri::Manager;
    let Ok(entries) = registry::load_registry(app) else {
        return;
    };
    let Some(entry) = entries.iter().find(|e| e.id == workspace_id).cloned() else {
        return;
    };
    if entry.is_local {
        return;
    }
    let Some(clone_url) = entry.clone_url else {
        return;
    };
    let Ok(Some(tok)) = token::load_token(app) else {
        return;
    };
    let actor = app.state::<ActorHandle>();
    let _ = actor
        .notify_change(workspace_id, entry.local_path, clone_url, tok)
        .await;
}

/// Fire-and-forget notification that workspace content has changed.
///
/// Called after any mutating save operation (save_request, create_collection, etc.).
/// The actor debounces these into a single commit+push after 3s of inactivity.
/// Local workspaces and unauthenticated sessions are silently skipped.
#[tauri::command]
#[specta::specta]
pub async fn notify_change(
    app: tauri::AppHandle,
    workspace_id: String,
) -> Result<(), String> {
    use tauri::Manager;
    let entries = registry::load_registry(&app)?;
    let entry = entries
        .iter()
        .find(|e| e.id == workspace_id)
        .ok_or_else(|| "workspace not found".to_string())?
        .clone();

    if entry.is_local {
        return Ok(());
    }

    let clone_url = entry.clone_url.ok_or("no clone url")?;
    let token = token::load_token(&app)?
        .ok_or_else(|| "not_authenticated".to_string())?;

    let actor = app.state::<ActorHandle>();
    actor
        .notify_change(workspace_id, entry.local_path, clone_url, token)
        .await
}

/// Return the current sync status for a workspace.
///
/// Returns "local" for local-only workspaces, "synced" as the initial
/// default for GitHub-backed workspaces (real-time status comes via events).
#[tauri::command]
#[specta::specta]
pub async fn get_sync_status(
    app: tauri::AppHandle,
    workspace_id: String,
) -> Result<String, String> {
    let entries = registry::load_registry(&app)?;
    let entry = entries
        .iter()
        .find(|e| e.id == workspace_id)
        .ok_or_else(|| format!("Workspace not found: {workspace_id}"))?;

    if entry.is_local {
        Ok("local".to_string())
    } else {
        Ok("synced".to_string())
    }
}
