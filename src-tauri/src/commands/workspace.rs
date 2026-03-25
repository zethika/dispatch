use tauri::Manager;
use uuid::Uuid;

use crate::auth::token;
use crate::workspace::{clone_ops, registry};
use crate::workspace::registry::WorkspaceEntry;

/// Connect a GitHub repository as a workspace by cloning it locally.
///
/// Requires an authenticated session (stored token). Clones via git2 in a
/// blocking thread. Persists the new entry in the workspace registry.
#[tauri::command]
#[specta::specta]
pub async fn connect_workspace(
    app: tauri::AppHandle,
    repo_full_name: String,
    repo_name: String,
    clone_url: String,
) -> Result<WorkspaceEntry, String> {
    let id = Uuid::new_v4().to_string();

    let local_path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("workspaces")
        .join(&id);

    let access_token = token::load_token(&app)?
        .ok_or_else(|| "not_authenticated".to_string())?;

    // Clone runs synchronously in git2 — must use spawn_blocking
    let clone_url_clone = clone_url.clone();
    let local_path_clone = local_path.clone();
    tauri::async_runtime::spawn_blocking(move || {
        clone_ops::clone_repo(&clone_url_clone, &local_path_clone, &access_token)
    })
    .await
    .map_err(|e| e.to_string())??;

    let entry = WorkspaceEntry {
        id,
        display_name: repo_name,
        github_repo_full_name: Some(repo_full_name),
        clone_url: Some(clone_url),
        local_path: local_path.to_string_lossy().to_string(),
        is_local: false,
    };

    registry::add_workspace(&app, entry.clone())?;

    Ok(entry)
}

/// Disconnect a GitHub-backed workspace: delete its local clone and remove it
/// from the registry.
///
/// The permanent "Local" workspace cannot be disconnected.
#[tauri::command]
#[specta::specta]
pub async fn disconnect_workspace(
    app: tauri::AppHandle,
    workspace_id: String,
) -> Result<(), String> {
    let entries = registry::load_registry(&app)?;

    let entry = entries
        .iter()
        .find(|e| e.id == workspace_id)
        .ok_or_else(|| format!("Workspace not found: {workspace_id}"))?;

    if entry.is_local {
        return Err("Cannot disconnect the local workspace".to_string());
    }

    let local_path = std::path::PathBuf::from(&entry.local_path);

    tauri::async_runtime::spawn_blocking(move || clone_ops::remove_clone(&local_path))
        .await
        .map_err(|e| e.to_string())??;

    registry::remove_workspace(&app, &workspace_id)
}

/// List all connected workspaces.
#[tauri::command]
#[specta::specta]
pub async fn list_workspaces(app: tauri::AppHandle) -> Result<Vec<WorkspaceEntry>, String> {
    registry::load_registry(&app)
}
