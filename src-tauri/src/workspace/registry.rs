use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::Manager;
use tauri_plugin_store::StoreExt;

use crate::collections::io as collections_io;

const STORE_FILE: &str = "dispatch-prefs.json";
const REGISTRY_KEY: &str = "connected_workspaces";

/// A connected workspace entry in the registry.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct WorkspaceEntry {
    /// UUID string
    pub id: String,
    /// Human-readable name (e.g., "repo-name" or "Local")
    pub display_name: String,
    /// "owner/repo" for GitHub-backed workspaces; None for local
    pub github_repo_full_name: Option<String>,
    /// HTTPS clone URL; None for local
    pub clone_url: Option<String>,
    /// Absolute path to the local workspace directory
    pub local_path: String,
    /// true only for the permanent "Local" workspace
    pub is_local: bool,
}

/// Load all workspace entries from the persistent store.
///
/// If no registry key exists (first launch), bootstraps the "Local" workspace
/// from the existing default workspace directory and persists it.
pub fn load_registry(app: &tauri::AppHandle) -> Result<Vec<WorkspaceEntry>, String> {
    let store = app
        .store(STORE_FILE)
        .map_err(|e| e.to_string())?;

    if let Some(val) = store.get(REGISTRY_KEY) {
        let entries: Vec<WorkspaceEntry> = serde_json::from_value(val.clone())
            .map_err(|e| format!("Failed to parse workspace registry: {e}"))?;
        if !entries.is_empty() {
            return Ok(entries);
        }
    }

    // No registry yet — bootstrap from existing workspace on disk
    bootstrap_local_workspace(app)
}

/// Persist the workspace registry to the store.
pub fn save_registry(app: &tauri::AppHandle, entries: &[WorkspaceEntry]) -> Result<(), String> {
    let store = app
        .store(STORE_FILE)
        .map_err(|e| e.to_string())?;

    let val = serde_json::to_value(entries).map_err(|e| e.to_string())?;
    store.set(REGISTRY_KEY, val);
    store.save().map_err(|e| e.to_string())
}

/// Create a "Local" WorkspaceEntry from the first workspace found on disk,
/// save it to the registry, and return it.
fn bootstrap_local_workspace(app: &tauri::AppHandle) -> Result<Vec<WorkspaceEntry>, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;

    let ids = collections_io::get_workspace_ids(&app_data).map_err(|e| e.to_string())?;

    let first_id = ids
        .into_iter()
        .next()
        .ok_or_else(|| "No workspace found on disk to bootstrap registry".to_string())?;

    let local_path = app_data
        .join("workspaces")
        .join(&first_id)
        .to_string_lossy()
        .to_string();

    let entry = WorkspaceEntry {
        id: first_id,
        display_name: "Local".to_string(),
        github_repo_full_name: None,
        clone_url: None,
        local_path,
        is_local: true,
    };

    let entries = vec![entry];
    save_registry(app, &entries)?;
    Ok(entries)
}

/// Append a new workspace entry to the registry.
pub fn add_workspace(app: &tauri::AppHandle, entry: WorkspaceEntry) -> Result<(), String> {
    let mut entries = load_registry(app)?;
    entries.push(entry);
    save_registry(app, &entries)
}

/// Remove a workspace entry by ID.
///
/// The local (permanent) workspace cannot be removed.
pub fn remove_workspace(app: &tauri::AppHandle, workspace_id: &str) -> Result<(), String> {
    let entries = load_registry(app)?;
    let filtered: Vec<WorkspaceEntry> = entries
        .into_iter()
        .filter(|e| e.id != workspace_id || e.is_local)
        .collect();
    save_registry(app, &filtered)
}
