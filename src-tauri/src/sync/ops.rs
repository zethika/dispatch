/// Blocking git2 operations for commit, push, and pull with remote-wins conflict resolution.
///
/// IMPORTANT: All functions in this module are synchronous and MUST be called
/// from `tauri::async_runtime::spawn_blocking` — never from an async context directly.

/// Stage all changes and create a "Dispatch sync" commit.
///
/// Returns `Ok(true)` if a commit was created, `Ok(false)` if the working tree
/// was already clean (nothing to commit).
pub fn commit_all(local_path: &str) -> Result<bool, String> {
    let repo = git2::Repository::open(local_path).map_err(|e| e.to_string())?;

    // Check if there are any changes to commit
    let statuses = repo.statuses(None).map_err(|e| e.to_string())?;
    let has_changes = statuses.iter().any(|s| {
        let status = s.status();
        status != git2::Status::CURRENT && !status.contains(git2::Status::IGNORED)
    });

    if !has_changes {
        return Ok(false);
    }

    let mut index = repo.index().map_err(|e| e.to_string())?;
    index
        .add_all(["*"], git2::IndexAddOption::DEFAULT, None)
        .map_err(|e| e.to_string())?;
    index.write().map_err(|e| e.to_string())?;

    let tree_oid = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_oid).map_err(|e| e.to_string())?;
    let sig = git2::Signature::now("Dispatch", "sync@dispatch.app").map_err(|e| e.to_string())?;

    // HEAD commit as parent — handle first-commit case where HEAD doesn't exist
    let parents: Vec<git2::Commit> = match repo.head() {
        Ok(head) => {
            let oid = head.target().ok_or_else(|| "HEAD has no target".to_string())?;
            vec![repo.find_commit(oid).map_err(|e| e.to_string())?]
        }
        Err(_) => vec![],
    };
    let parent_refs: Vec<&git2::Commit> = parents.iter().collect();

    repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        "Dispatch sync",
        &tree,
        &parent_refs,
    )
    .map_err(|e| e.to_string())?;

    Ok(true)
}

/// Push HEAD to the "origin" remote using OAuth token credentials.
///
/// The credential callback uses the same pattern as `clone_ops.rs`.
pub fn push_to_remote(local_path: &str, clone_url: &str, token: &str) -> Result<(), String> {
    let repo = git2::Repository::open(local_path).map_err(|e| e.to_string())?;

    let mut remote = repo
        .find_remote("origin")
        .or_else(|_| repo.remote("origin", clone_url))
        .map_err(|e| e.to_string())?;

    let token_owned = token.to_string();
    let mut callbacks = git2::RemoteCallbacks::new();
    let attempts = std::sync::atomic::AtomicUsize::new(0);
    callbacks.credentials(move |_url, _username, _allowed| {
        if attempts.fetch_add(1, std::sync::atomic::Ordering::SeqCst) > 0 {
            return Err(git2::Error::from_str("authentication failed"));
        }
        git2::Cred::userpass_plaintext("oauth2", &token_owned)
    });

    let mut push_opts = git2::PushOptions::new();
    push_opts.remote_callbacks(callbacks);

    let branch = get_current_branch(&repo)?;
    let refspec = format!("refs/heads/{branch}:refs/heads/{branch}");

    remote
        .push(&[&refspec], Some(&mut push_opts))
        .map_err(|e| e.to_string())
}

/// Fetch from origin and merge into the current branch.
///
/// Conflict resolution strategy: remote-wins (D-08).
/// Conflicted files are checked out from the remote version (`use_theirs`),
/// staged, and the merge is committed.
///
/// Returns the list of conflicted file paths (relative to repo root).
/// An empty vec means a clean merge or fast-forward.
pub fn pull(local_path: &str, clone_url: &str, token: &str) -> Result<Vec<String>, String> {
    let repo = git2::Repository::open(local_path).map_err(|e| e.to_string())?;

    // 1. Fetch
    let token_owned = token.to_string();
    let mut callbacks = git2::RemoteCallbacks::new();
    let attempts = std::sync::atomic::AtomicUsize::new(0);
    callbacks.credentials(move |_url, _username, _allowed| {
        // Guard against infinite retry loop if credentials are rejected
        if attempts.fetch_add(1, std::sync::atomic::Ordering::SeqCst) > 0 {
            return Err(git2::Error::from_str("authentication failed"));
        }
        git2::Cred::userpass_plaintext("oauth2", &token_owned)
    });

    let mut fetch_opts = git2::FetchOptions::new();
    fetch_opts.remote_callbacks(callbacks);

    let mut remote = repo
        .find_remote("origin")
        .or_else(|_| repo.remote("origin", clone_url))
        .map_err(|e| e.to_string())?;

    remote
        .fetch(
            &["refs/heads/*:refs/remotes/origin/*"],
            Some(&mut fetch_opts),
            None,
        )
        .map_err(|e| e.to_string())?;

    // 2. Find FETCH_HEAD — may not exist if remote is empty or freshly cloned
    let fetch_head = match repo.find_reference("FETCH_HEAD") {
        Ok(r) => r,
        Err(_) => return Ok(vec![]), // Nothing to merge — already up to date
    };
    let fetch_commit = match repo.reference_to_annotated_commit(&fetch_head) {
        Ok(c) => c,
        Err(_) => return Ok(vec![]), // FETCH_HEAD exists but is invalid — treat as up to date
    };

    // 3. Merge analysis
    let (analysis, _) = repo
        .merge_analysis(&[&fetch_commit])
        .map_err(|e| e.to_string())?;

    if analysis.is_up_to_date() {
        return Ok(vec![]);
    }

    if analysis.is_fast_forward() {
        let branch = get_current_branch(&repo)?;
        let refname = format!("refs/heads/{branch}");
        let mut reference = repo
            .find_reference(&refname)
            .map_err(|e| e.to_string())?;
        reference
            .set_target(fetch_commit.id(), "fast-forward")
            .map_err(|e| e.to_string())?;
        repo.set_head(&refname).map_err(|e| e.to_string())?;
        repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))
            .map_err(|e| e.to_string())?;
        return Ok(vec![]);
    }

    // Normal merge — may have conflicts
    let mut checkout_opts = git2::build::CheckoutBuilder::new();
    checkout_opts.force();
    repo.merge(&[&fetch_commit], None, Some(&mut checkout_opts))
        .map_err(|e| e.to_string())?;

    // 4. Detect and collect conflicted paths
    let mut index = repo.index().map_err(|e| e.to_string())?;
    let mut conflicted_paths: Vec<String> = vec![];

    if index.has_conflicts() {
        // Collect conflict info in a scoped block so the borrow on `index` is released
        {
            let conflicts = index.conflicts().map_err(|e| e.to_string())?;
            for conflict in conflicts.flatten() {
                if let Some(their) = conflict.their {
                    if let Ok(path) = std::str::from_utf8(&their.path) {
                        conflicted_paths.push(path.to_string());
                    }
                }
            }
        }

        // Resolve: remote (theirs) wins
        let mut resolve_opts = git2::build::CheckoutBuilder::new();
        resolve_opts.use_theirs(true).force().allow_conflicts(true);
        repo.checkout_index(Some(&mut index), Some(&mut resolve_opts))
            .map_err(|e| e.to_string())?;

        // Stage all (marks conflicts resolved in index)
        index
            .add_all(["*"], git2::IndexAddOption::DEFAULT, None)
            .map_err(|e| e.to_string())?;
        index.write().map_err(|e| e.to_string())?;

        // CRITICAL: clear MERGE_HEAD state so git considers the repo clean
        repo.cleanup_state().map_err(|e| e.to_string())?;
    }

    // 5. Commit the merge (two parents: HEAD + fetch_commit)
    let tree_oid = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_oid).map_err(|e| e.to_string())?;
    let sig = git2::Signature::now("Dispatch", "sync@dispatch.app").map_err(|e| e.to_string())?;

    let head_commit = repo
        .head()
        .and_then(|h| h.peel_to_commit())
        .map_err(|e| e.to_string())?;
    let fetch_commit_obj = repo
        .find_commit(fetch_commit.id())
        .map_err(|e| e.to_string())?;

    repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        "Dispatch sync (merge)",
        &tree,
        &[&head_commit, &fetch_commit_obj],
    )
    .map_err(|e| e.to_string())?;

    Ok(conflicted_paths)
}

/// Get the current branch name, defaulting to "main" if HEAD is detached.
fn get_current_branch(repo: &git2::Repository) -> Result<String, String> {
    let head = repo.head().map_err(|e| e.to_string())?;
    Ok(head
        .shorthand()
        .unwrap_or("main")
        .to_string())
}
