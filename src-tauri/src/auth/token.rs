use tauri_plugin_secure_storage::{OptionsRequest, SecureStorageExt};

const TOKEN_KEY: &str = "github_token";

fn options(key: &str, data: Option<String>) -> OptionsRequest {
    OptionsRequest {
        prefixed_key: Some(key.to_string()),
        data,
        sync: None,
        keychain_access: None,
    }
}

/// Store the GitHub OAuth token in macOS Keychain.
pub fn store_token(app: &tauri::AppHandle, token: &str) -> Result<(), String> {
    app.secure_storage()
        .set_item(app.clone(), options(TOKEN_KEY, Some(token.to_string())))
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// Load the GitHub OAuth token from macOS Keychain.
/// Returns Ok(None) if no token is stored (not an error).
pub fn load_token(app: &tauri::AppHandle) -> Result<Option<String>, String> {
    let resp = app
        .secure_storage()
        .get_item(app.clone(), options(TOKEN_KEY, None))
        .map_err(|e| e.to_string())?;
    Ok(resp.data)
}

/// Remove the GitHub OAuth token from macOS Keychain.
/// Ignores "not found" errors.
pub fn clear_token(app: &tauri::AppHandle) -> Result<(), String> {
    match app
        .secure_storage()
        .remove_item(app.clone(), options(TOKEN_KEY, None))
    {
        Ok(_) => Ok(()),
        Err(e) => {
            let msg = e.to_string();
            // "not found" is acceptable — token simply wasn't stored
            if msg.contains("not found") || msg.contains("No such") {
                Ok(())
            } else {
                Err(msg)
            }
        }
    }
}
