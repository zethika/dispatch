use crate::auth::{device_flow, token};
use crate::github::api::{get_user, GitHubUser};
use crate::auth::device_flow::DeviceCodeResponse;

/// Initiate the GitHub device authorization flow.
///
/// Returns device and user codes to display to the user.
#[tauri::command]
#[specta::specta]
pub async fn initiate_login(
    _app: tauri::AppHandle,
) -> Result<DeviceCodeResponse, String> {
    device_flow::initiate_device_flow(device_flow::get_client_id()).await
}

/// Poll GitHub until the user approves the login.
///
/// Stores the resulting token in Keychain and returns the user's GitHub profile.
#[tauri::command]
#[specta::specta]
pub async fn poll_login(
    app: tauri::AppHandle,
    device_code: String,
    interval: u64,
) -> Result<GitHubUser, String> {
    let access_token =
        device_flow::poll_for_token(device_flow::get_client_id(), &device_code, interval).await?;
    token::store_token(&app, &access_token)?;
    get_user(&access_token).await
}

/// Remove the stored GitHub OAuth token (log out).
#[tauri::command]
#[specta::specta]
pub async fn logout(app: tauri::AppHandle) -> Result<(), String> {
    token::clear_token(&app)
}

/// Get the current authentication state.
///
/// Returns `Some(GitHubUser)` if authenticated, `None` if not.
/// Clears a stored token that is no longer valid (401 from GitHub).
#[tauri::command]
#[specta::specta]
pub async fn get_auth_state(app: tauri::AppHandle) -> Result<Option<GitHubUser>, String> {
    match token::load_token(&app)? {
        None => Ok(None),
        Some(t) => match get_user(&t).await {
            Ok(user) => Ok(Some(user)),
            Err(e) if e == "unauthorized" => {
                token::clear_token(&app)?;
                Ok(None)
            }
            Err(e) => Err(e),
        },
    }
}
