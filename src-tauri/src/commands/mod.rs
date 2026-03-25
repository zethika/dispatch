pub mod collections;
pub mod environments;
pub mod http;

#[tauri::command]
#[specta::specta]
pub fn ping() -> String {
    "pong".to_string()
}
