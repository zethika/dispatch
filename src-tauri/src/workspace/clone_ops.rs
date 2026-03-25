use std::path::Path;

/// Clone a GitHub repository to `local_path` using HTTPS with OAuth2 token auth.
///
/// This is a **synchronous** function — it MUST be called from
/// `tauri::async_runtime::spawn_blocking`.
pub fn clone_repo(clone_url: &str, local_path: &Path, token: &str) -> Result<(), String> {
    let mut callbacks = git2::RemoteCallbacks::new();

    let token_owned = token.to_string();
    callbacks.credentials(move |_url, _username, _allowed| {
        git2::Cred::userpass_plaintext("oauth2", &token_owned)
    });

    let mut fetch_opts = git2::FetchOptions::new();
    fetch_opts.remote_callbacks(callbacks);

    let mut builder = git2::build::RepoBuilder::new();
    builder.fetch_options(fetch_opts);

    builder
        .clone(clone_url, local_path)
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// Remove a local repository clone by deleting its directory.
///
/// No-op if the path does not exist.
/// This is a **synchronous** function — it MUST be called from
/// `tauri::async_runtime::spawn_blocking`.
pub fn remove_clone(local_path: &Path) -> Result<(), String> {
    if !local_path.exists() {
        return Ok(());
    }
    std::fs::remove_dir_all(local_path).map_err(|e| e.to_string())
}
