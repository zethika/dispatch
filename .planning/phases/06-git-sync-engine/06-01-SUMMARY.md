---
phase: 06-git-sync-engine
plan: 01
subsystem: rust-backend
tags: [git2, actor-pattern, mpsc, sync, conflict-resolution, tauri-events, ipc]
dependency_graph:
  requires:
    - Phase 05 (workspace registry, clone_ops credential pattern, auth token)
  provides:
    - git sync actor with mpsc channel serializing all git2 operations
    - commit_all, push_to_remote, pull ops with remote-wins conflict resolution
    - sync_workspace, pull_workspace, get_sync_status IPC commands
    - sync-status-changed Tauri events for real-time frontend status updates
  affects:
    - src-tauri/src/lib.rs (actor init in setup)
    - src-tauri/src/commands/mod.rs (new sync module)
    - Cargo.toml (added tokio with sync feature)
tech_stack:
  added:
    - tokio = { version = "1", features = ["sync"] } — mpsc + oneshot channels for actor pattern
  patterns:
    - Ryhl actor pattern: single mpsc channel, oneshot reply channels per operation
    - spawn_blocking per git2 call inside async run_actor loop
    - tauri::Emitter for push-based frontend status updates
key_files:
  created:
    - src-tauri/src/sync/types.rs
    - src-tauri/src/sync/actor.rs
    - src-tauri/src/sync/ops.rs
    - src-tauri/src/sync/mod.rs
    - src-tauri/src/commands/sync.rs
  modified:
    - src-tauri/src/commands/mod.rs
    - src-tauri/src/lib.rs
    - src-tauri/Cargo.toml
decisions:
  - "tokio sync feature added explicitly: tauri async_runtime does not re-export tokio::sync types (mpsc/oneshot) at the crate level"
  - "commit_all returns bool (had_changes), push_to_remote is separate: actor combines them sequentially, skipping push if nothing to commit"
  - "workspace_id in SyncMessage variants included for future per-workspace actor routing without API change"
metrics:
  duration_minutes: 4
  completed_date: "2026-03-26"
  tasks_completed: 2
  files_created: 5
  files_modified: 3
---

# Phase 6 Plan 1: Git Sync Engine — Rust Actor and IPC Commands Summary

**One-liner:** mpsc-based git actor serializing all git2 commit+push+pull ops, with remote-wins conflict resolution and Tauri event emission, exposed via three IPC commands.

## What Was Built

### sync module (`src-tauri/src/sync/`)

**types.rs** — Protocol types:
- `SyncStatus` enum: `Synced | Syncing | Conflict | Error | Local` (specta-typed for frontend)
- `SyncMessage` enum: `CommitAndPush | Pull` with oneshot reply senders
- `SyncResult` enum: `Pushed { had_changes } | UpToDate | Pulled { conflicts }`
- `SyncStatusPayload` struct for Tauri event emission (`workspace_id`, `status`, `message`, `conflicted_files`)

**actor.rs** — Singleton git actor:
- `ActorHandle { sender: mpsc::Sender<SyncMessage> }` with `Clone`
- `ActorHandle::new()` creates mpsc channel(32), spawns `run_actor` via `tauri::async_runtime::spawn`
- `commit_and_push` and `pull` methods send messages and await oneshot replies
- `run_actor` loop calls `tauri::async_runtime::spawn_blocking` per operation (never blocks async runtime)

**ops.rs** — Blocking git2 operations:
- `commit_all(local_path)` → stages all with `index.add_all(["*"])`, creates "Dispatch sync" commit, handles first-commit (no HEAD) case
- `push_to_remote(local_path, clone_url, token)` → `Cred::userpass_plaintext("oauth2", token)` credential pattern matching clone_ops.rs
- `pull(local_path, clone_url, token)` → fetch + merge_analysis + fast-forward or normal merge; on conflict: collects conflicted paths, resolves with `use_theirs(true)`, stages, calls `cleanup_state()`, commits merge with two parents

### commands/sync.rs — IPC commands

- `sync_workspace` — commit+push+pull with non-fast-forward retry (pull then retry push)
- `pull_workspace` — pull-only for workspace-switch trigger (D-12)
- `get_sync_status` — returns "local" or "synced" as initial status (real-time updates via events)

All three commands: resolve workspace from registry, load token from Keychain, emit `sync-status-changed` events at every status transition (syncing/synced/error/conflict).

### lib.rs changes

- `mod sync;` added to module declarations
- `app.manage(sync::ActorHandle::new())` in `setup()` before `ensure_default_workspace`
- Three sync commands registered in `collect_commands![]`

## Verification

- `cargo check` passes with zero errors (4 dead-code warnings expected — types used by frontend via specta, workspace_id in message variants unused by actor itself)
- All acceptance criteria from plan met

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] tokio not in Cargo.toml**
- **Found during:** Task 1 cargo check
- **Issue:** `use tokio::sync::{mpsc, oneshot}` — tokio was not a direct dependency; tauri async_runtime does not re-export `tokio::sync` types
- **Fix:** Added `tokio = { version = "1", features = ["sync"] }` via `cargo add tokio --features sync`
- **Files modified:** `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`
- **Commit:** ebb503d

**2. [Rule 1 - Bug] Missing `use tauri::Manager` in commands/sync.rs**
- **Found during:** Task 2 cargo check
- **Issue:** `app.state::<ActorHandle>()` requires `Manager` trait in scope; error E0599
- **Fix:** Added `use tauri::{Emitter, Manager};` to imports
- **Files modified:** `src-tauri/src/commands/sync.rs`
- **Commit:** d279170

**3. [Rule 1 - Bug] Type inference failure on `e.clone()` in error branch**
- **Found during:** Task 2 cargo check (E0282)
- **Issue:** Compiler couldn't infer type for `message: Some(e.clone())` when `e` was `&String` in `if let Err(ref e)` branch
- **Fix:** Made the error binding explicit: `let err_msg: String = push_err.clone()`
- **Files modified:** `src-tauri/src/commands/sync.rs`
- **Commit:** d279170

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 | ebb503d | feat(06-01): create sync module — types, actor, and git2 operations |
| Task 2 | d279170 | feat(06-01): wire IPC commands, actor init, and command registration |

## Self-Check: PASSED

Files created:
- src-tauri/src/sync/types.rs — FOUND
- src-tauri/src/sync/actor.rs — FOUND
- src-tauri/src/sync/ops.rs — FOUND
- src-tauri/src/sync/mod.rs — FOUND
- src-tauri/src/commands/sync.rs — FOUND

Commits verified:
- ebb503d — FOUND
- d279170 — FOUND
