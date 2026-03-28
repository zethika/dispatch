use serde::{Deserialize, Serialize};
use specta::Type;

/// Placeholder development client ID — user must register a GitHub OAuth App
/// and set GITHUB_CLIENT_ID at build time.
const DEV_CLIENT_ID: &str = "Ov23liF1NFaPrHwqNO6e";

/// Returns the GitHub OAuth App client ID.
/// Reads from the GITHUB_CLIENT_ID environment variable at compile time,
/// falling back to the development placeholder.
pub fn get_client_id() -> &'static str {
    option_env!("GITHUB_CLIENT_ID").unwrap_or(DEV_CLIENT_ID)
}

/// Response from GitHub's device code endpoint.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct DeviceCodeResponse {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u32,
    pub interval: u32,
}

/// Initiate the GitHub device authorization flow.
///
/// Returns a `DeviceCodeResponse` containing the `user_code` to display to the
/// user and the `device_code` to poll with.
pub async fn initiate_device_flow(client_id: &str) -> Result<DeviceCodeResponse, String> {
    let client = tauri_plugin_http::reqwest::Client::new();
    let response = client
        .post("https://github.com/login/device/code")
        .header("Accept", "application/json")
        .form(&[
            ("client_id", client_id),
            ("scope", "repo"),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let body = response.text().await.map_err(|e| e.to_string())?;
    serde_json::from_str::<DeviceCodeResponse>(&body)
        .map_err(|e| format!("Failed to parse device code response: {e}\nBody: {body}"))
}

/// Internal enum for deserializing GitHub's poll response.
#[derive(Debug, Deserialize)]
#[serde(untagged)]
enum PollResponse {
    Success {
        access_token: String,
        #[allow(dead_code)]
        token_type: Option<String>,
        #[allow(dead_code)]
        scope: Option<String>,
    },
    Error {
        error: String,
    },
}

/// Poll GitHub until the user authorizes the device or an error occurs.
///
/// Returns `Ok(access_token)` on success.
/// Returns `Err("expired")` if the device code expired.
/// Returns `Err("denied")` if the user denied access.
pub async fn poll_for_token(
    client_id: &str,
    device_code: &str,
    initial_interval: u32,
) -> Result<String, String> {
    let client = tauri_plugin_http::reqwest::Client::new();
    let mut interval = initial_interval;

    loop {
        // Use std::thread::sleep via spawn_blocking to avoid pulling tokio directly.
        // In practice, poll_for_token is called from an async context via tauri::async_runtime.
        let sleep_secs = interval;
        tauri::async_runtime::spawn_blocking(move || {
            std::thread::sleep(std::time::Duration::from_secs(sleep_secs.into()));
        })
        .await
        .map_err(|e| e.to_string())?;

        let response = client
            .post("https://github.com/login/oauth/access_token")
            .header("Accept", "application/json")
            .form(&[
                ("client_id", client_id),
                ("device_code", device_code),
                ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
            ])
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let body = response.text().await.map_err(|e| e.to_string())?;
        let parsed: PollResponse = serde_json::from_str(&body)
            .map_err(|e| format!("Failed to parse poll response: {e}\nBody: {body}"))?;

        match parsed {
            PollResponse::Success { access_token, .. } => {
                return Ok(access_token);
            }
            PollResponse::Error { error } => match error.as_str() {
                "authorization_pending" => {
                    // User hasn't approved yet — keep polling
                    continue;
                }
                "slow_down" => {
                    // Server requests slower polling — add 5 seconds permanently
                    interval += 5;
                    continue;
                }
                "expired_token" => {
                    return Err("expired".to_string());
                }
                "access_denied" => {
                    return Err("denied".to_string());
                }
                other => {
                    return Err(format!("Unexpected error from GitHub: {other}"));
                }
            },
        }
    }
}
