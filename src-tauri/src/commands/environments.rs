use std::collections::HashMap;

use tauri::Manager;

use crate::environments::{io, types::*};

#[tauri::command]
#[specta::specta]
pub fn list_environments(
    workspace_id: String,
    app: tauri::AppHandle,
) -> Result<Vec<EnvironmentSummary>, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    io::list_environments(&app_data, &workspace_id).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn load_environment(
    workspace_id: String,
    env_slug: String,
    app: tauri::AppHandle,
) -> Result<EnvironmentFile, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    io::load_environment(&app_data, &workspace_id, &env_slug).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn save_environment(
    workspace_id: String,
    env_slug: String,
    env: EnvironmentFile,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    io::save_environment(&app_data, &workspace_id, &env_slug, &env).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn create_environment(
    workspace_id: String,
    name: String,
    app: tauri::AppHandle,
) -> Result<EnvironmentSummary, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    io::create_environment(&app_data, &workspace_id, &name).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn delete_environment(
    workspace_id: String,
    env_slug: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    io::delete_environment(&app_data, &workspace_id, &env_slug)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn rename_environment(
    workspace_id: String,
    old_slug: String,
    new_name: String,
    app: tauri::AppHandle,
) -> Result<EnvironmentSummary, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    io::rename_environment(&app_data, &workspace_id, &old_slug, &new_name)
        .map_err(|e| e.to_string())
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
