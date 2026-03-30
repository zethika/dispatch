use std::path::Path;

/// Ensure the repo config overrides any global `url.<ssh>.insteadOf` rules
/// that would rewrite HTTPS URLs to SSH. Dispatch always authenticates via
/// HTTPS + OAuth token — SSH rewrites break the credentials callback.
fn force_https_remote(repo: &git2::Repository, clone_url: &str) -> Result<(), String> {
    let mut config = repo.config().map_err(|e| e.to_string())?;
    config
        .set_str(
            &format!("url.{clone_url}.insteadOf", clone_url = clone_url),
            clone_url,
        )
        .map_err(|e| e.to_string())
}

/// Clone a GitHub repository to `local_path` using HTTPS with OAuth2 token auth.
///
/// This is a **synchronous** function — it MUST be called from
/// `tauri::async_runtime::spawn_blocking`.
pub fn clone_repo(clone_url: &str, local_path: &Path, token: &str) -> Result<(), String> {
    let token_owned = token.to_string();
    let attempts = std::sync::atomic::AtomicUsize::new(0);

    let mut callbacks = git2::RemoteCallbacks::new();
    callbacks.credentials(move |_url, _username, _allowed| {
        if attempts.fetch_add(1, std::sync::atomic::Ordering::SeqCst) > 0 {
            return Err(git2::Error::from_str("authentication failed"));
        }
        git2::Cred::userpass_plaintext("oauth2", &token_owned)
    });

    let mut fetch_opts = git2::FetchOptions::new();
    fetch_opts.remote_callbacks(callbacks);

    // Init repo first so we can set config before the fetch
    let repo = git2::Repository::init(local_path).map_err(|e| e.to_string())?;
    force_https_remote(&repo, clone_url)?;

    // Fetch
    let mut remote = repo.remote("origin", clone_url).map_err(|e| e.to_string())?;
    remote
        .fetch(
            &["refs/heads/*:refs/remotes/origin/*"],
            Some(&mut fetch_opts),
            None,
        )
        .map_err(|e| {
            // Clean up the partially-initialized repo on fetch failure
            let _ = std::fs::remove_dir_all(local_path);
            e.to_string()
        })?;

    // Determine default branch
    let default_branch = remote
        .default_branch()
        .ok()
        .and_then(|b| b.as_str().map(String::from))
        .unwrap_or_else(|| "refs/heads/main".to_string());
    let branch_name = default_branch
        .strip_prefix("refs/heads/")
        .unwrap_or("main");

    // Create local branch tracking remote
    let remote_ref = format!("refs/remotes/origin/{branch_name}");
    let oid = repo
        .refname_to_id(&remote_ref)
        .map_err(|e| format!("could not find remote branch {branch_name}: {e}"))?;
    let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
    repo.branch(branch_name, &commit, false)
        .map_err(|e| e.to_string())?;

    // Checkout
    let refname = format!("refs/heads/{branch_name}");
    repo.set_head(&refname).map_err(|e| e.to_string())?;
    repo.checkout_head(Some(git2::build::CheckoutBuilder::new().force()))
        .map_err(|e| e.to_string())?;

    // Set upstream tracking
    let mut branch = repo
        .find_branch(branch_name, git2::BranchType::Local)
        .map_err(|e| e.to_string())?;
    branch
        .set_upstream(Some(&format!("origin/{branch_name}")))
        .map_err(|e| e.to_string())?;

    Ok(())
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
