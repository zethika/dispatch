use serde::{Deserialize, Serialize};
use specta::Type;

/// Authenticated GitHub user information.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct GitHubUser {
    pub login: String,
    pub avatar_url: String,
    pub name: Option<String>,
    pub id: u64,
}

/// Owner information embedded in a repo.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct RepoOwner {
    pub login: String,
}

/// GitHub repository information.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct RepoInfo {
    pub id: u64,
    pub name: String,
    pub full_name: String,
    pub clone_url: String,
    pub private: bool,
    pub owner: RepoOwner,
}

fn github_client() -> tauri_plugin_http::reqwest::Client {
    tauri_plugin_http::reqwest::Client::new()
}

fn auth_headers(token: &str) -> tauri_plugin_http::reqwest::header::HeaderMap {
    use tauri_plugin_http::reqwest::header::{
        HeaderMap, HeaderValue, ACCEPT, AUTHORIZATION, USER_AGENT,
    };

    let mut headers = HeaderMap::new();
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Bearer {}", token)).expect("valid header value"),
    );
    headers.insert(
        ACCEPT,
        HeaderValue::from_static("application/vnd.github+json"),
    );
    headers.insert(
        USER_AGENT,
        HeaderValue::from_static("Dispatch/0.1"),
    );
    headers.insert(
        "X-GitHub-Api-Version",
        HeaderValue::from_static("2022-11-28"),
    );
    headers
}

/// Fetch the authenticated user's profile from GitHub.
///
/// Returns `Err("unauthorized")` on 401.
pub async fn get_user(token: &str) -> Result<GitHubUser, String> {
    let client = github_client();
    let response = client
        .get("https://api.github.com/user")
        .headers(auth_headers(token))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status() == 401 {
        return Err("unauthorized".to_string());
    }

    if !response.status().is_success() {
        return Err(format!("GitHub API error: {}", response.status()));
    }

    let body = response.text().await.map_err(|e| e.to_string())?;
    let user: GitHubUser = serde_json::from_str(&body)
        .map_err(|e| format!("Failed to parse user response: {e}"))?;
    Ok(user)
}

/// List all repositories accessible to the authenticated user.
///
/// Paginates through all pages (100 per page) and returns a combined list
/// sorted by owner login then repo name.
pub async fn list_repos(token: &str) -> Result<Vec<RepoInfo>, String> {
    let client = github_client();
    let mut all_repos: Vec<RepoInfo> = Vec::new();
    let mut page = 1u32;

    loop {
        let url = format!(
            "https://api.github.com/user/repos?per_page=100&page={}&affiliation=owner,collaborator,organization_member",
            page
        );

        let response = client
            .get(&url)
            .headers(auth_headers(token))
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if response.status() == 401 {
            return Err("unauthorized".to_string());
        }

        if !response.status().is_success() {
            return Err(format!("GitHub API error: {}", response.status()));
        }

        let body = response.text().await.map_err(|e| e.to_string())?;
        let repos: Vec<RepoInfo> = serde_json::from_str(&body)
            .map_err(|e| format!("Failed to parse repos response: {e}"))?;
        if repos.is_empty() {
            break;
        }
        all_repos.extend(repos);
        page += 1;
    }

    all_repos.sort_by(|a, b| {
        a.owner
            .login
            .cmp(&b.owner.login)
            .then_with(|| a.name.cmp(&b.name))
    });

    Ok(all_repos)
}
