pub mod auth;
pub mod collections;
pub mod environments;
pub mod github;
pub mod http;
pub mod workspace;

#[tauri::command]
#[specta::specta]
pub fn ping() -> String {
    "pong".to_string()
}
