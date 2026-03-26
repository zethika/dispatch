# Phase 6: Git Sync Engine - Research

**Researched:** 2026-03-26
**Domain:** git2 actor pattern, Tauri event emission, Rust async channel design, conflict resolution
**Confidence:** HIGH

## Summary

Phase 6 introduces the git sync infrastructure for Dispatch: a single long-lived Rust actor that serializes all git2 operations, a set of IPC commands the frontend calls to trigger sync, Tauri events emitted back to the frontend for real-time status updates, and a Zustand sync store that drives the TopBar chip and WorkspaceSwitcher dots.

All architectural decisions are locked in CONTEXT.md (D-01 through D-13). The research confirms these decisions are sound and documents exactly how to implement each piece against the actual git2 API (0.20.x), the Tauri v2 `Emitter` trait, and the tokio actor pattern from Alice Ryhl's canonical article. No new crates are required — git2 is already present, and Tauri v2's built-in event system handles backend-to-frontend status pushes.

The most technically involved piece is conflict resolution. git2's merge path requires: fetch remote, analyze, call `repo.merge()`, detect conflicts via `repo.index().has_conflicts()`, resolve by calling `index.add_all` with `use_theirs` checkout semantics, stage, and commit the merge. The correct API sequence is documented in the Code Examples section.

**Primary recommendation:** Implement the actor in `src-tauri/src/sync/actor.rs`, the operations in `sync/ops.rs`, and expose three IPC commands: `sync_workspace` (commit+push+pull), `pull_workspace` (pull only for workspace-switch trigger), and `get_sync_status`. Emit a `sync-status-changed` Tauri event whenever state transitions. The frontend creates a `useSyncStore` Zustand store that listens to this event and drives TopBar and WorkspaceSwitcher rendering.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Single long-lived Rust task with mpsc channel. All git operations sent as messages, executed sequentially. Callers get results via oneshot reply channels.
- **D-02:** Per-app singleton actor — one git actor for the whole app. Operations on different workspaces go through the same queue.
- **D-03:** Actor runs in `spawn_blocking` per operation (git2 is synchronous). The actor loop itself is async.
- **D-04:** Sync status chip in TopBar replaces "Local only" badge. Shows: synced (green check + "Synced"), syncing (spinner + "Syncing"), conflict (amber warning + "Conflict"), error (red x + "Error"). Non-GitHub: "Local only" (gray).
- **D-05:** 4 sync states: synced, syncing, conflict, error. "Local only" for non-GitHub workspaces.
- **D-06:** WorkspaceSwitcher dots mirror TopBar states per workspace: green, spinner, amber, red, gray.
- **D-07:** Clicking the TopBar sync chip triggers manual sync (commit + push local changes, then pull remote changes).
- **D-08:** Remote wins on pull conflict. Local changes for conflicting files are discarded. Resolved files staged and merge committed.
- **D-09:** Conflict notification via sonner toast. Shows file path(s) relative to collection. Non-blocking, ~5s. Example: "1 file updated from remote: users-api/get-user.json".
- **D-10:** After conflict resolution, affected request reloaded in editor if it was the active request. Sync status returns to "Synced".
- **D-11:** Phase 6 is manual trigger only. No auto-sync (Phase 7).
- **D-12:** Pull on workspace switch — switching workspace triggers a pull automatically.
- **D-13:** Commit scope is all workspace changes: `git add -A`, commit with message "Dispatch sync". Users don't see commit messages.

### Claude's Discretion

- Git actor message enum design (which operations to support)
- Error recovery strategy for failed pushes (retry once? toast and manual retry?)
- How to detect "no changes to commit" (skip push if nothing changed)
- Sync store design (Zustand store for frontend sync state)
- Whether to emit Tauri events from the actor for real-time status updates
- Pull strategy: fetch+merge vs rebase (both valid for this use case)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SYNC-04 | Sync status indicator visible in the UI (synced / syncing / offline / conflict) | Tauri `emit()` from actor drives a Zustand `useSyncStore`; TopBar chip and WorkspaceSwitcher dots read per-workspace status |
| SYNC-05 | File-level last-write-wins conflict resolution with user notification | git2 conflict detection via `index.has_conflicts()`, resolution via `checkout_index` with `use_theirs`, sonner toast with conflicting file names |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| git2 | 0.20.4 (already in Cargo.toml) | Commit, push, fetch, merge, conflict resolution | Already present; vendored libgit2 1.9.0; established credential pattern in clone_ops.rs |
| tokio mpsc + oneshot | (tokio re-exported via tauri) | Actor message passing with reply channels | Canonical Rust async actor pattern; no extra dep |
| tauri Emitter trait | (tauri 2.x) | Emit `sync-status-changed` events to frontend | Built into tauri v2; zero extra deps |
| sonner | (already installed) | Conflict toast notification | Already mounted in App.tsx |
| zustand | 5.x (already installed) | `useSyncStore` — sync status per workspace | Consistent with authStore, workspaceStore pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tauri-specta | 2.x RC (already configured) | Type-safe IPC for sync commands | New sync IPC commands need TS bindings; follow existing pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| fetch+merge pull strategy | rebase | Both valid. fetch+merge is simpler conflict detection with git2's merge_analysis() API; rebase requires more manual ref manipulation. Use fetch+merge. |
| Tauri emit for status updates | Polling via IPC command | emit is push-based, lower latency, no polling overhead. Use emit. |
| Single actor for all workspaces | Per-workspace actor | Single actor simpler to initialize and manage as state on AppHandle; contention is minimal since user interacts with one workspace at a time (D-02). |

**No new crates needed.** All dependencies already present in Cargo.toml.

---

## Architecture Patterns

### Recommended Module Structure
```
src-tauri/src/
├── sync/
│   ├── mod.rs           # pub use; exports GitActor, SyncStatus, SyncMessage
│   ├── actor.rs         # GitActor struct, run loop, ActorHandle
│   ├── ops.rs           # Pure git2 blocking functions (commit_all, push, pull, detect_conflicts)
│   └── types.rs         # SyncStatus enum, SyncMessage enum, SyncResult types
├── commands/
│   └── sync.rs          # IPC command wrappers (sync_workspace, pull_workspace, get_sync_status)
└── lib.rs               # Actor init in setup(), new sync commands registered

src/
├── stores/
│   └── syncStore.ts     # useSyncStore: syncStatus per workspaceId, listener setup
├── features/sync/
│   └── SyncChip.tsx     # TopBar sync status chip component
└── components/layout/
    ├── TopBar.tsx        # Import SyncChip, pass workspaceId
    └── WorkspaceSwitcher.tsx  # Read syncStatus per workspace for dot colors
```

### Pattern 1: Git Actor with mpsc + oneshot (Ryhl pattern)

**What:** A single Tauri-spawned async task owns the git actor. Callers send `SyncMessage` variants containing a `oneshot::Sender<Result<SyncResult, String>>` for reply.

**When to use:** Any time a git operation is needed. All git work flows through this actor — never call git2 directly from IPC commands.

**Key constraint:** Use `tauri::async_runtime::spawn` (not `tokio::spawn`). Use `tauri::async_runtime::spawn_blocking` inside the actor for each git2 call. This is already established in clone_ops.rs and the project decisions.

```rust
// Source: Ryhl actor pattern + project CLAUDE.md spawn constraint
use tauri::async_runtime::{spawn, spawn_blocking};
use tokio::sync::{mpsc, oneshot};

pub enum SyncMessage {
    CommitAndPush {
        workspace_id: String,
        local_path: String,
        clone_url: String,
        token: String,
        reply: oneshot::Sender<Result<SyncResult, String>>,
    },
    Pull {
        workspace_id: String,
        local_path: String,
        clone_url: String,
        token: String,
        reply: oneshot::Sender<Result<SyncResult, String>>,
    },
}

#[derive(Clone)]
pub struct ActorHandle {
    sender: mpsc::Sender<SyncMessage>,
}

impl ActorHandle {
    pub fn new() -> Self {
        let (sender, receiver) = mpsc::channel(32);
        spawn(run_actor(receiver));
        Self { sender }
    }

    pub async fn commit_and_push(
        &self,
        workspace_id: String,
        local_path: String,
        clone_url: String,
        token: String,
    ) -> Result<SyncResult, String> {
        let (reply_tx, reply_rx) = oneshot::channel();
        self.sender
            .send(SyncMessage::CommitAndPush {
                workspace_id,
                local_path,
                clone_url,
                token,
                reply: reply_tx,
            })
            .await
            .map_err(|_| "actor dropped".to_string())?;
        reply_rx.await.map_err(|_| "actor reply dropped".to_string())?
    }
}

async fn run_actor(mut receiver: mpsc::Receiver<SyncMessage>) {
    while let Some(msg) = receiver.recv().await {
        match msg {
            SyncMessage::CommitAndPush { local_path, clone_url, token, reply, .. } => {
                let result = spawn_blocking(move || {
                    ops::commit_all(&local_path, &clone_url, &token)
                })
                .await
                .map_err(|e| e.to_string())
                .and_then(|r| r);
                let _ = reply.send(result);
            }
            SyncMessage::Pull { local_path, clone_url, token, reply, .. } => {
                let result = spawn_blocking(move || {
                    ops::pull(&local_path, &clone_url, &token)
                })
                .await
                .map_err(|e| e.to_string())
                .and_then(|r| r);
                let _ = reply.send(result);
            }
        }
    }
}
```

### Pattern 2: Actor Stored on AppHandle via manage()

**What:** The ActorHandle is stored in Tauri's managed state so IPC commands can retrieve it.

**When to use:** Actor initialization in `setup()`, retrieval in every sync command.

```rust
// Source: Tauri v2 state management pattern
// In lib.rs setup():
let actor = ActorHandle::new();
app.manage(actor);

// In IPC command:
#[tauri::command]
#[specta::specta]
pub async fn sync_workspace(
    app: tauri::AppHandle,
    workspace_id: String,
) -> Result<(), String> {
    let actor = app.state::<ActorHandle>();
    // ... get local_path, clone_url, token from registry + token store
    let result = actor.commit_and_push(workspace_id.clone(), local_path, clone_url, token).await;
    // emit status event regardless of result
    app.emit("sync-status-changed", SyncStatusPayload { workspace_id, status: ... }).unwrap();
    result.map(|_| ())
}
```

### Pattern 3: git2 commit_all Operation

**What:** Stage all changes and create a commit. Skip if working tree is clean.

**When to use:** In `ops::commit_all()` before push.

```rust
// Source: git2 docs.rs Index::add_all, Repository::statuses
pub fn commit_all(local_path: &str, clone_url: &str, token: &str) -> Result<SyncResult, String> {
    let repo = git2::Repository::open(local_path).map_err(|e| e.to_string())?;

    // Check if there's anything to commit
    let statuses = repo.statuses(None).map_err(|e| e.to_string())?;
    let has_changes = statuses.iter().any(|s| {
        s.status() != git2::Status::CURRENT && s.status() != git2::Status::IGNORED
    });

    if has_changes {
        let mut index = repo.index().map_err(|e| e.to_string())?;
        index.add_all(["*"], git2::IndexAddOption::DEFAULT, None)
            .map_err(|e| e.to_string())?;
        index.write().map_err(|e| e.to_string())?;

        let tree_oid = index.write_tree().map_err(|e| e.to_string())?;
        let tree = repo.find_tree(tree_oid).map_err(|e| e.to_string())?;
        let sig = git2::Signature::now("Dispatch", "sync@dispatch.app")
            .map_err(|e| e.to_string())?;

        // HEAD commit as parent (may not exist on first commit)
        let parents: Vec<git2::Commit> = match repo.head() {
            Ok(head) => {
                let oid = head.target().ok_or("HEAD has no target")?;
                vec![repo.find_commit(oid).map_err(|e| e.to_string())?]
            }
            Err(_) => vec![],
        };
        let parent_refs: Vec<&git2::Commit> = parents.iter().collect();

        repo.commit(Some("HEAD"), &sig, &sig, "Dispatch sync", &tree, &parent_refs)
            .map_err(|e| e.to_string())?;
    }

    // Now push
    push_to_remote(&repo, clone_url, token)?;
    Ok(SyncResult::Pushed { had_changes: has_changes })
}
```

### Pattern 4: git2 Push Operation

**What:** Push HEAD to origin's default branch using the OAuth token credential callback. Same credential pattern as clone_ops.rs.

```rust
// Source: clone_ops.rs credential pattern + git2 Remote::push docs
fn push_to_remote(repo: &git2::Repository, clone_url: &str, token: &str) -> Result<(), String> {
    let mut remote = repo
        .find_remote("origin")
        .or_else(|_| repo.remote("origin", clone_url))
        .map_err(|e| e.to_string())?;

    let token_owned = token.to_string();
    let mut callbacks = git2::RemoteCallbacks::new();
    callbacks.credentials(move |_url, _username, _allowed| {
        git2::Cred::userpass_plaintext("oauth2", &token_owned)
    });

    let mut push_opts = git2::PushOptions::new();
    push_opts.remote_callbacks(callbacks);

    // Determine current branch ref
    let head = repo.head().map_err(|e| e.to_string())?;
    let branch_name = head.shorthand().unwrap_or("main");
    let refspec = format!("refs/heads/{branch_name}:refs/heads/{branch_name}");

    remote
        .push(&[&refspec], Some(&mut push_opts))
        .map_err(|e| e.to_string())
}
```

### Pattern 5: git2 Pull with Conflict Resolution (remote wins)

**What:** Fetch, analyze, and merge. On conflict: checkout remote version for all conflicted files, stage, commit. Return list of conflicted file paths for toast notification.

```rust
// Source: git2-rs examples/pull.rs + CheckoutBuilder docs (use_theirs)
pub fn pull(local_path: &str, clone_url: &str, token: &str) -> Result<SyncResult, String> {
    let repo = git2::Repository::open(local_path).map_err(|e| e.to_string())?;

    // 1. Fetch
    let token_owned = token.to_string();
    let mut callbacks = git2::RemoteCallbacks::new();
    callbacks.credentials(move |_url, _username, _allowed| {
        git2::Cred::userpass_plaintext("oauth2", &token_owned)
    });
    let mut fetch_opts = git2::FetchOptions::new();
    fetch_opts.remote_callbacks(callbacks);

    let mut remote = repo.find_remote("origin").map_err(|e| e.to_string())?;
    remote.fetch(&["refs/heads/*:refs/remotes/origin/*"], Some(&mut fetch_opts), None)
        .map_err(|e| e.to_string())?;

    // 2. Find FETCH_HEAD
    let fetch_head = repo.find_reference("FETCH_HEAD").map_err(|e| e.to_string())?;
    let fetch_commit = repo
        .reference_to_annotated_commit(&fetch_head)
        .map_err(|e| e.to_string())?;

    // 3. Analyze merge
    let (analysis, _) = repo.merge_analysis(&[&fetch_commit]).map_err(|e| e.to_string())?;

    if analysis.is_up_to_date() {
        return Ok(SyncResult::UpToDate);
    }

    if analysis.is_fast_forward() {
        // Fast-forward: just update the ref and checkout
        let refname = format!("refs/heads/{}", get_current_branch(&repo)?);
        let mut reference = repo.find_reference(&refname).map_err(|e| e.to_string())?;
        reference.set_target(fetch_commit.id(), "fast-forward")
            .map_err(|e| e.to_string())?;
        repo.set_head(&refname).map_err(|e| e.to_string())?;
        repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))
            .map_err(|e| e.to_string())?;
        return Ok(SyncResult::Pulled { conflicts: vec![] });
    }

    // Normal merge — may have conflicts
    let mut checkout_opts = git2::build::CheckoutBuilder::new();
    checkout_opts.force();
    repo.merge(&[&fetch_commit], None, Some(&mut checkout_opts))
        .map_err(|e| e.to_string())?;

    // 4. Check for conflicts and collect conflicted paths
    let mut index = repo.index().map_err(|e| e.to_string())?;
    let mut conflicted_paths: Vec<String> = vec![];

    if index.has_conflicts() {
        // Collect conflict info before resolving
        {
            let conflicts = index.conflicts().map_err(|e| e.to_string())?;
            for conflict in conflicts.flatten() {
                if let Some(their) = conflict.their {
                    if let Some(path) = std::str::from_utf8(&their.path).ok() {
                        conflicted_paths.push(path.to_string());
                    }
                }
            }
        }

        // Resolve: remote (theirs) wins — use checkout with use_theirs
        let mut resolve_opts = git2::build::CheckoutBuilder::new();
        resolve_opts.use_theirs(true).force().allow_conflicts(true);
        repo.checkout_index(Some(&mut index), Some(&mut resolve_opts))
            .map_err(|e| e.to_string())?;

        // Re-add all to mark conflicts resolved in index
        index.add_all(["*"], git2::IndexAddOption::DEFAULT, None)
            .map_err(|e| e.to_string())?;
        index.write().map_err(|e| e.to_string())?;
        // Clear the MERGE_HEAD conflict state
        repo.cleanup_state().map_err(|e| e.to_string())?;
    }

    // 5. Commit the merge
    let tree_oid = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_oid).map_err(|e| e.to_string())?;
    let sig = git2::Signature::now("Dispatch", "sync@dispatch.app")
        .map_err(|e| e.to_string())?;

    let head_commit = repo.head()
        .and_then(|h| h.peel_to_commit())
        .map_err(|e| e.to_string())?;
    let fetch_commit_obj = repo.find_commit(fetch_commit.id()).map_err(|e| e.to_string())?;

    repo.commit(
        Some("HEAD"),
        &sig, &sig,
        "Dispatch sync (merge)",
        &tree,
        &[&head_commit, &fetch_commit_obj],
    ).map_err(|e| e.to_string())?;

    Ok(SyncResult::Pulled { conflicts: conflicted_paths })
}

fn get_current_branch(repo: &git2::Repository) -> Result<String, String> {
    let head = repo.head().map_err(|e| e.to_string())?;
    head.shorthand()
        .map(|s| s.to_string())
        .ok_or_else(|| "detached HEAD".to_string())
}
```

### Pattern 6: Tauri Event Emission for Sync Status

**What:** After any status change (syncing started, syncing done, conflict, error), the IPC command emits a Tauri event. The frontend listens in useSyncStore and updates state.

```rust
// Source: Tauri v2 docs https://v2.tauri.app/develop/calling-frontend/
use tauri::Emitter;
use serde::{Serialize, Clone};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatusPayload {
    pub workspace_id: String,
    pub status: String, // "synced" | "syncing" | "conflict" | "error" | "local"
    pub message: Option<String>,
    pub conflicted_files: Vec<String>,
}

// In IPC command:
app.emit("sync-status-changed", SyncStatusPayload {
    workspace_id: workspace_id.clone(),
    status: "syncing".to_string(),
    message: None,
    conflicted_files: vec![],
}).unwrap();
```

```typescript
// Source: Tauri v2 docs + existing authStore event pattern
// In useSyncStore.ts
import { listen } from '@tauri-apps/api/event';

type SyncStatusPayload = {
  workspaceId: string;
  status: 'synced' | 'syncing' | 'conflict' | 'error' | 'local';
  message: string | null;
  conflictedFiles: string[];
};

// Store shape:
interface SyncState {
  syncStatuses: Record<string, SyncStatusPayload['status']>;
  conflictedFiles: Record<string, string[]>; // workspaceId -> paths
  initListener: () => Promise<() => void>;
  triggerSync: (workspaceId: string) => Promise<void>;
  triggerPull: (workspaceId: string) => Promise<void>;
  setSyncing: (workspaceId: string) => void;
}
```

### Pattern 7: SyncResult Enum for IPC Return Types

```rust
// Allows caller and actor to communicate what happened
#[derive(Clone, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum SyncResult {
    Pushed { had_changes: bool },
    UpToDate,
    Pulled { conflicts: Vec<String> },
}
```

### Anti-Patterns to Avoid

- **Calling git2 directly in an IPC command:** git2 is synchronous and will block the async runtime. All git2 calls must go through `spawn_blocking` inside the actor. The connect_workspace command already demonstrates this correctly.
- **Using `tokio::spawn` instead of `tauri::async_runtime::spawn`:** Tauri v2 uses its own async runtime. `tokio::spawn` panics because the tokio runtime context is not available. Established in project decisions.
- **Cloning ActorHandle without Clone derive:** The handle needs to be clonable so Tauri's managed state can hand it out to multiple IPC command invocations. Derive Clone.
- **Merging without checking merge_analysis first:** Calling `repo.merge()` when the result is already up-to-date errors. Always check `analysis.is_up_to_date()` before merging.
- **Forgetting `repo.cleanup_state()` after conflict resolution:** Leaves the repo in MERGE state, which causes subsequent operations to fail.
- **Using `index.conflicts()` after `checkout_index` with `use_theirs`:** The iterator borrows the index; collect paths into a Vec first, then resolve.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Async actor serialization | Custom Mutex<git2::Repository> | mpsc + oneshot actor pattern | Mutex doesn't help with blocking; actor guarantees sequential access without async mutex deadlock risk |
| Credential injection | Re-inventing credential callbacks | Same `Cred::userpass_plaintext("oauth2", &token)` pattern from clone_ops.rs | Already battle-tested in the codebase for clone |
| Pull sequence | Custom fetch+ref-update logic | git2-rs pull.rs example adapted to project pattern | The MergeAnalysis API handles fast-forward vs normal merge detection |
| Conflict file enumeration | String-parsing git output | `index.conflicts()` iterator with `ConflictEntry.their.path` field | Typed API; no shell subprocess |
| Backend-to-frontend push | Polling IPC endpoint for status | Tauri `app.emit("sync-status-changed", ...)` | Push-based; zero polling overhead; already used for session expiry toast pattern |
| Toast notification | Custom toast system | `sonner` (already installed, mounted in App.tsx) | Already used for session expiry in TopBar |

**Key insight:** The git2 conflict resolution API is more involved than the libgit2 C docs suggest — you must explicitly call `checkout_index` with `use_theirs`, then `add_all` to clear the conflict markers, then `cleanup_state()` before the merge commit. Omitting any step leaves the repo in a broken state.

---

## Common Pitfalls

### Pitfall 1: Calling git2 from an async IPC command without spawn_blocking

**What goes wrong:** The async Tauri runtime thread blocks, freezing all IPC command handling while git operations run.
**Why it happens:** git2 (libgit2) has no async API — all operations are synchronous. Tauri IPC commands are async functions running on the Tauri/tokio runtime.
**How to avoid:** Every git2 call in the actor must be wrapped in `tauri::async_runtime::spawn_blocking`. The actor loop is async (receives messages), but each message dispatch calls `spawn_blocking`.
**Warning signs:** UI freezes during push/pull; other IPC commands become unresponsive.

### Pitfall 2: Leaving repo in MERGE state after conflict resolution

**What goes wrong:** Subsequent operations (next pull, commit) fail with "repository has unfinished merge" error.
**Why it happens:** `repo.merge()` writes MERGE_HEAD to `.git/`. It stays until `repo.cleanup_state()` is called.
**How to avoid:** Always call `repo.cleanup_state()` after resolving conflicts AND before the merge commit. Not after — the commit itself only removes MERGE_MSG, not MERGE_HEAD in all git2 versions.
**Warning signs:** Second sync after a conflict fails with a cryptic error about merge state.

### Pitfall 3: Borrowing index.conflicts() then writing to index

**What goes wrong:** Compile error — `conflicts()` borrows `&mut index` and the borrow extends through the iterator loop, preventing subsequent calls to `index.add_all()`.
**Why it happens:** Rust borrow checker; the conflicts iterator holds a mutable reference to the index.
**How to avoid:** Collect all conflicted paths into a `Vec<String>` before the `}` that drops the conflicts borrow. Then call `add_all` with the index free.
**Warning signs:** Rust compile error about cannot borrow `index` as mutable more than once.

### Pitfall 4: Emitting sync-status-changed before returning from IPC command causes race condition

**What goes wrong:** Frontend updates status to "synced" before the IPC promise resolves, then a second update triggers an unnecessary store churn.
**Why it happens:** The event listener and the IPC await resolve in non-deterministic order.
**How to avoid:** Emit "syncing" at the start of the IPC command (before blocking work), emit "synced"/"conflict"/"error" at the end. The frontend's useSyncStore ignores the IPC return value and relies solely on events for state.
**Warning signs:** Sync chip flickers between states.

### Pitfall 5: Actor not initialized before first IPC command

**What goes wrong:** `app.state::<ActorHandle>()` panics because manage() was not called before the first IPC command arrives.
**Why it happens:** Tauri `setup()` hook runs before the webview, but if the actor is created lazily (e.g., on first command), a race is possible.
**How to avoid:** Create and manage the actor in the `setup()` closure in lib.rs, before `Ok(())` returns. Match the existing pattern for plugin initialization.
**Warning signs:** Panic on first sync command with "state not managed for field".

### Pitfall 6: Push fails with "non-fast-forward" after a pull conflict

**What goes wrong:** After resolving a conflict (remote wins), the local history diverges from remote and push is rejected.
**Why it happens:** Conflict resolution creates a merge commit that isn't on the remote yet, but remote may have advanced further.
**How to avoid:** The sync sequence for D-07 (manual sync) is: commit local → push → pull. If push fails with "non-fast-forward", pull first (to incorporate remote changes), then push again. Retry push once after pulling.
**Warning signs:** `push()` returns error containing "non-fast-forward" or "rejected".

### Pitfall 7: WorkspaceSwitcher pull triggered on every render

**What goes wrong:** `switchWorkspace` in workspaceStore calls `pull_workspace` IPC, which may trigger on component re-render if called inside a useEffect without proper deps.
**Why it happens:** D-12 says "pull on workspace switch" but the effect must fire only on actual switch, not on re-render with same workspaceId.
**How to avoid:** Only trigger pull when workspaceId changes and the workspace has a clone_url (not local). Protect with `if (prev !== next)` check inside the store action.
**Warning signs:** Network requests seen in DevTools every re-render.

---

## Code Examples

### "No changes" detection before commit
```rust
// Source: git2 Repository::statuses docs
let statuses = repo.statuses(None).map_err(|e| e.to_string())?;
let has_changes = statuses.iter().any(|s| {
    let st = s.status();
    st.intersects(
        git2::Status::INDEX_NEW
            | git2::Status::INDEX_MODIFIED
            | git2::Status::INDEX_DELETED
            | git2::Status::WT_NEW
            | git2::Status::WT_MODIFIED
            | git2::Status::WT_DELETED,
    )
});
if !has_changes {
    return Ok(SyncResult::UpToDate);
}
```

### Emitting sync status from IPC command
```rust
// Source: https://v2.tauri.app/develop/calling-frontend/
use tauri::Emitter;

app.emit("sync-status-changed", &SyncStatusPayload {
    workspace_id: workspace_id.clone(),
    status: "synced".to_string(),
    message: None,
    conflicted_files: vec![],
}).map_err(|e| e.to_string())?;
```

### useSyncStore listener setup (TypeScript)
```typescript
// Source: Tauri v2 event API + existing authStore pattern
import { listen } from '@tauri-apps/api/event';

initListener: async () => {
  const unlisten = await listen<SyncStatusPayload>('sync-status-changed', (event) => {
    const { workspaceId, status, conflictedFiles } = event.payload;
    useSyncStore.setState((s) => ({
      syncStatuses: { ...s.syncStatuses, [workspaceId]: status },
      conflictedFiles: { ...s.conflictedFiles, [workspaceId]: conflictedFiles },
    }));
    // Conflict toast (D-09)
    if (status === 'conflict' && conflictedFiles.length > 0) {
      const count = conflictedFiles.length;
      const label = count === 1
        ? `1 file updated from remote: ${conflictedFiles[0]}`
        : `${count} files updated from remote`;
      toast(label);
    }
  });
  return unlisten;
},
```

### TopBar SyncChip rendering logic
```typescript
// Source: CONTEXT.md D-04, D-05
const STATUS_CONFIG = {
  synced:   { icon: '✓', label: 'Synced',   color: 'success' },
  syncing:  { icon: null, label: 'Syncing',  color: 'default', spinner: true },
  conflict: { icon: '⚠', label: 'Conflict', color: 'warning' },
  error:    { icon: '✕', label: 'Error',    color: 'danger' },
  local:    { icon: null, label: 'Local only', color: 'default' },
} as const;
```

### WorkspaceSwitcher dot color mapping
```typescript
// Source: CONTEXT.md D-06
const DOT_COLOR: Record<SyncStatus, string> = {
  synced:   'bg-success',
  syncing:  'bg-default-300',   // replaced with spinner in practice
  conflict: 'bg-warning',
  error:    'bg-danger',
  local:    'bg-default-300',
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tauri v1 `emit_all()` | Tauri v2 `app.emit()` (global) or `emit_to()` (targeted) | Tauri v2.0 | `emit_all` is removed; use `Emitter` trait's `emit()` which broadcasts globally |
| Tauri v1 `#[tauri::command]` without capabilities | Tauri v2 permission model with capabilities JSON | Tauri v2.0 | All IPC commands need entries in `capabilities/` — follow existing pattern |
| Direct tokio spawn | `tauri::async_runtime::spawn` | Tauri v2.0 | tokio::spawn panics outside tokio context; tauri wraps its own runtime |

**Deprecated/outdated:**
- `emit_all()`: Removed in Tauri v2. Use `app.emit()` from the `tauri::Emitter` trait.
- `Stronghold plugin`: Being deprecated in Tauri v3. Not relevant here — already using secure-storage.

---

## Open Questions

1. **Push "non-fast-forward" retry strategy**
   - What we know: D-07 says manual sync = commit+push+pull. If push is rejected (remote advanced while we were committing), we need to pull first.
   - What's unclear: How many retries? Show error after how many failures?
   - Recommendation: Retry push once after a pull. If still rejected, set status to "error" with toast "Sync conflict — try again". This matches the spirit of D-08 (remote wins) without an infinite loop.

2. **Actor AppHandle access for token retrieval**
   - What we know: IPC commands have `app: tauri::AppHandle`. Actor receives messages with pre-resolved `token: String`.
   - What's unclear: Should the actor resolve the token itself (needs AppHandle access) or should commands pass the token with each message?
   - Recommendation: Commands resolve the token before sending to actor. The token is available via `token::load_token(&app)` in the command handler. This keeps the actor pure — it operates on data, not app state. Simpler to test.

3. **Initial sync status on app startup**
   - What we know: workspaceStore loads workspaces on startup. Each GitHub workspace starts in an unknown sync state.
   - What's unclear: Should we display "Synced" by default (assume clean) or leave indeterminate?
   - Recommendation: Default to "synced" for GitHub workspaces on load. The first manual sync or workspace-switch pull will correct it if stale.

---

## Environment Availability

Step 2.6: SKIPPED — This phase adds new Rust modules and TypeScript stores/components using already-present dependencies (git2, tauri, zustand, sonner). No new external tools, services, or runtimes are required.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | vite.config.ts (vitest inline config) |
| Quick run command | `npm run test -- --reporter=verbose` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SYNC-04 | SyncChip renders correct label/color for each of 5 states | unit | `npm run test -- --reporter=verbose src/features/sync/SyncChip.test.tsx` | ❌ Wave 0 |
| SYNC-04 | useSyncStore updates syncStatuses when sync-status-changed event received | unit | `npm run test -- --reporter=verbose src/stores/syncStore.test.ts` | ❌ Wave 0 |
| SYNC-04 | WorkspaceSwitcher dot shows correct color class per sync state | unit | `npm run test -- --reporter=verbose src/components/layout/WorkspaceSwitcher.test.tsx` | ❌ Wave 0 |
| SYNC-05 | Pull with conflicts returns conflicted file paths | manual-only | N/A — requires real git repo with conflicts | — |
| SYNC-05 | Conflict toast fires with correct file name string | unit (mock store) | `npm run test -- --reporter=verbose src/features/sync/SyncChip.test.tsx` | ❌ Wave 0 |

**Manual-only justification for SYNC-05 pull conflict test:** Requires two local git2 repos (remote + local) with diverged histories. This is an integration test that needs the full git2/filesystem stack. Covered in manual verification checklist in VERIFICATION.md instead.

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/features/sync/SyncChip.test.tsx` — covers SYNC-04 chip rendering
- [ ] `src/stores/syncStore.test.ts` — covers SYNC-04 event listener, state update
- [ ] `src/components/layout/WorkspaceSwitcher.test.tsx` — covers SYNC-04 dot colors

*(Existing test infrastructure: Vitest + @testing-library/react already configured. No framework install needed.)*

---

## Sources

### Primary (HIGH confidence)
- `src-tauri/Cargo.toml` — git2 0.20.4 with vendored-libgit2 confirmed present; no new crates needed
- `src-tauri/src/workspace/clone_ops.rs` — Credential callback pattern `Cred::userpass_plaintext("oauth2", &token)` confirmed working
- `src-tauri/src/lib.rs` — App setup pattern; manage() placement confirmed
- https://v2.tauri.app/develop/calling-frontend/ — Tauri v2 `Emitter` trait, `app.emit()` API confirmed
- https://docs.rs/git2/latest/git2/build/struct.CheckoutBuilder.html — `use_theirs(bool)` method confirmed
- https://docs.rs/git2/latest/git2/struct.Index.html — `add_all`, `has_conflicts`, `write_tree` confirmed

### Secondary (MEDIUM confidence)
- https://ryhl.io/blog/actors-with-tokio/ — Alice Ryhl actor pattern; canonical Rust async actor reference; aligns with tokio docs
- https://github.com/rust-lang/git2-rs/blob/master/examples/pull.rs — Official pull example; fetch+merge_analysis+fast_forward+normal_merge structure confirmed
- https://tokio.rs/tokio/tutorial/channels — mpsc + oneshot channel usage confirmed

### Tertiary (LOW confidence)
- `cleanup_state()` behavior after conflict resolution: extrapolated from libgit2 docs and git2 Repository docs. Verified method exists; exact interaction with merge commit not tested against live repo.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already present in Cargo.toml and package.json
- Architecture (actor pattern): HIGH — directly matches Alice Ryhl's canonical pattern; aligns with existing spawn_blocking precedent in project
- git2 API for commit/push/pull: HIGH — verified against docs.rs; credential pattern proven in clone_ops.rs
- Conflict resolution sequence: MEDIUM — API calls verified individually; exact interaction of cleanup_state + index write + merge commit should be validated in a test repo during implementation
- Tauri event emission: HIGH — verified against official v2 docs
- Frontend Zustand pattern: HIGH — matches existing authStore/workspaceStore pattern in codebase

**Research date:** 2026-03-26
**Valid until:** 2026-06-26 (stable libraries, 90-day window)
