use tauri::Manager;

use crate::collections::{io, types::*};

/// Resolve the workspace directory path from app data dir and workspace ID.
fn workspace_dir(
    app: &tauri::AppHandle,
    workspace_id: &str,
) -> Result<std::path::PathBuf, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(app_data.join("workspaces").join(workspace_id))
}

/// Resolve the parent directory for collection/folder/request operations.
/// `parent_path` is a list of folder slugs from collection root to the parent.
fn resolve_parent_dir(
    app: &tauri::AppHandle,
    workspace_id: &str,
    collection_slug: &str,
    parent_path: &[String],
) -> Result<std::path::PathBuf, String> {
    let ws_dir = workspace_dir(app, workspace_id)?;
    let mut dir = ws_dir.join("collections").join(collection_slug);
    for slug in parent_path {
        dir = dir.join(slug);
    }
    Ok(dir)
}

#[tauri::command]
#[specta::specta]
pub fn ensure_default_workspace(app: tauri::AppHandle) -> Result<String, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    io::ensure_default_workspace(&app_data).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn get_workspace_ids(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    io::get_workspace_ids(&app_data).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn load_workspace(workspace_id: String, app: tauri::AppHandle) -> Result<WorkspaceTree, String> {
    let ws_dir = workspace_dir(&app, &workspace_id)?;
    io::read_workspace(&ws_dir).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn create_collection(
    workspace_id: String,
    name: String,
    app: tauri::AppHandle,
) -> Result<CollectionItem, String> {
    let ws_dir = workspace_dir(&app, &workspace_id)?;
    io::create_collection(&ws_dir, &name).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn create_folder(
    workspace_id: String,
    collection_slug: String,
    parent_path: Vec<String>,
    name: String,
    app: tauri::AppHandle,
) -> Result<FolderItem, String> {
    let parent_dir = resolve_parent_dir(&app, &workspace_id, &collection_slug, &parent_path)?;
    io::create_folder(&parent_dir, &name).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn create_request(
    workspace_id: String,
    collection_slug: String,
    parent_path: Vec<String>,
    name: String,
    app: tauri::AppHandle,
) -> Result<RequestItem, String> {
    let parent_dir = resolve_parent_dir(&app, &workspace_id, &collection_slug, &parent_path)?;
    io::create_request(&parent_dir, &name).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn rename_node(
    workspace_id: String,
    collection_slug: String,
    parent_path: Vec<String>,
    old_slug: String,
    new_name: String,
    is_dir: bool,
    app: tauri::AppHandle,
) -> Result<String, String> {
    let parent_dir = resolve_parent_dir(&app, &workspace_id, &collection_slug, &parent_path)?;
    io::rename_node(&parent_dir, &old_slug, &new_name, is_dir).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn delete_node(
    workspace_id: String,
    collection_slug: String,
    parent_path: Vec<String>,
    slug: String,
    is_dir: bool,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let parent_dir = resolve_parent_dir(&app, &workspace_id, &collection_slug, &parent_path)?;
    io::delete_node(&parent_dir, &slug, is_dir).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn duplicate_request(
    workspace_id: String,
    collection_slug: String,
    parent_path: Vec<String>,
    slug: String,
    app: tauri::AppHandle,
) -> Result<RequestItem, String> {
    let parent_dir = resolve_parent_dir(&app, &workspace_id, &collection_slug, &parent_path)?;
    io::duplicate_request(&parent_dir, &slug).map_err(|e| e.to_string())
}
