use crate::collections::types::*;
use crate::http::executor::{self, HttpResponse};

#[tauri::command]
#[specta::specta]
pub async fn send_request(
    method: String,
    url: String,
    headers: Vec<KeyValueEntry>,
    query_params: Vec<KeyValueEntry>,
    body: Option<RequestBody>,
    auth: Option<RequestAuth>,
) -> Result<HttpResponse, String> {
    executor::execute(method, url, headers, query_params, body, auth)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn load_request(
    workspace_id: String,
    collection_slug: String,
    parent_path: Vec<String>,
    slug: String,
    app: tauri::AppHandle,
) -> Result<RequestFile, String> {
    use tauri::Manager;
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let mut dir = app_data
        .join("workspaces")
        .join(&workspace_id)
        .join("collections")
        .join(&collection_slug);
    for p in &parent_path {
        dir = dir.join(p);
    }
    let file_path = dir.join(format!("{}.json", slug));
    let content = std::fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    let request: RequestFile = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(request)
}

#[tauri::command]
#[specta::specta]
pub async fn save_request(
    workspace_id: String,
    collection_slug: String,
    parent_path: Vec<String>,
    slug: String,
    request: RequestFile,
    app: tauri::AppHandle,
) -> Result<(), String> {
    use tauri::Manager;
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let mut dir = app_data
        .join("workspaces")
        .join(&workspace_id)
        .join("collections")
        .join(&collection_slug);
    for p in &parent_path {
        dir = dir.join(p);
    }
    let file_path = dir.join(format!("{}.json", slug));
    let content = serde_json::to_string_pretty(&request).map_err(|e| e.to_string())?;
    std::fs::write(&file_path, content).map_err(|e| e.to_string())?;

    // Fire-and-forget debounced sync notification.
    let app2 = app.clone();
    let wid = workspace_id.clone();
    tauri::async_runtime::spawn(async move {
        crate::commands::sync::notify_change_inner(&app2, wid).await;
    });

    Ok(())
}
