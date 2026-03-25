use crate::auth::token;
use crate::github::api::{list_repos as api_list_repos, RepoInfo};

/// List all GitHub repositories accessible to the authenticated user.
///
/// Returns `Err("not_authenticated")` if no token is stored.
#[tauri::command]
#[specta::specta]
pub async fn list_repos(app: tauri::AppHandle) -> Result<Vec<RepoInfo>, String> {
    let token = token::load_token(&app)?
        .ok_or_else(|| "not_authenticated".to_string())?;
    api_list_repos(&token).await
}
