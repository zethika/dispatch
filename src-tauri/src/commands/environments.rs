use std::collections::HashMap;

use tauri::Manager;

use crate::environments::{io, types::*};

/// Resolve the workspace directory path from app data dir and workspace ID.
fn workspace_dir(app: &tauri::AppHandle, workspace_id: &str) -> Result<std::path::PathBuf, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(app_data.join("workspaces").join(workspace_id))
}

#[tauri::command]
#[specta::specta]
pub fn list_environments(
    workspace_id: String,
    app: tauri::AppHandle,
) -> Result<Vec<EnvironmentSummary>, String> {
    let ws_dir = workspace_dir(&app, &workspace_id)?;
    io::list_environments(&ws_dir).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn load_environment(
    workspace_id: String,
    env_slug: String,
    app: tauri::AppHandle,
) -> Result<EnvironmentFile, String> {
    let ws_dir = workspace_dir(&app, &workspace_id)?;
    io::load_environment(&ws_dir, &env_slug).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn save_environment(
    workspace_id: String,
    env_slug: String,
    env: EnvironmentFile,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let ws_dir = workspace_dir(&app, &workspace_id)?;
    io::save_environment(&ws_dir, &env_slug, &env).map_err(|e| e.to_string())?;

    let app2 = app.clone();
    let wid = workspace_id.clone();
    tauri::async_runtime::spawn(async move {
        crate::commands::sync::notify_change_inner(&app2, wid).await;
    });

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn create_environment(
    workspace_id: String,
    name: String,
    app: tauri::AppHandle,
) -> Result<EnvironmentSummary, String> {
    let ws_dir = workspace_dir(&app, &workspace_id)?;
    let result = io::create_environment(&ws_dir, &name).map_err(|e| e.to_string())?;

    let app2 = app.clone();
    let wid = workspace_id.clone();
    tauri::async_runtime::spawn(async move {
        crate::commands::sync::notify_change_inner(&app2, wid).await;
    });

    Ok(result)
}

#[tauri::command]
#[specta::specta]
pub async fn delete_environment(
    workspace_id: String,
    env_slug: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let ws_dir = workspace_dir(&app, &workspace_id)?;
    io::delete_environment(&ws_dir, &app_data, &workspace_id, &env_slug)
        .map_err(|e| e.to_string())?;

    let app2 = app.clone();
    let wid = workspace_id.clone();
    tauri::async_runtime::spawn(async move {
        crate::commands::sync::notify_change_inner(&app2, wid).await;
    });

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn rename_environment(
    workspace_id: String,
    old_slug: String,
    new_name: String,
    app: tauri::AppHandle,
) -> Result<EnvironmentSummary, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let ws_dir = workspace_dir(&app, &workspace_id)?;
    let result = io::rename_environment(&ws_dir, &app_data, &workspace_id, &old_slug, &new_name)
        .map_err(|e| e.to_string())?;

    let app2 = app.clone();
    let wid = workspace_id.clone();
    tauri::async_runtime::spawn(async move {
        crate::commands::sync::notify_change_inner(&app2, wid).await;
    });

    Ok(result)
}

#[tauri::command]
#[specta::specta]
pub fn load_secret_values(
    workspace_id: String,
    env_slug: String,
    app: tauri::AppHandle,
) -> Result<HashMap<String, String>, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    io::read_secrets(&app_data, &workspace_id, &env_slug).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn save_secret_values(
    workspace_id: String,
    env_slug: String,
    secrets: HashMap<String, String>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    io::write_secrets(&app_data, &workspace_id, &env_slug, &secrets)
        .map_err(|e| e.to_string())
}
