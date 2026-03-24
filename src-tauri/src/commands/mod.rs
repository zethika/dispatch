pub mod collections;

#[tauri::command]
#[specta::specta]
pub fn ping() -> String {
    "pong".to_string()
}
