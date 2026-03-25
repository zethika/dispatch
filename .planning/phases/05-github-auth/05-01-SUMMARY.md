---
phase: 05-github-auth
plan: 01
subsystem: auth
tags: [github, oauth, device-flow, git2, keychain, secure-storage, workspace]

requires:
  - phase: 04-environments-secrets
    provides: "App patterns: tauri-plugin-store usage, commands delegate pattern, module structure"

provides:
  - "GitHub OAuth device flow: initiate + poll for token (handles all error states)"
  - "Token storage in macOS Keychain via tauri-plugin-secure-storage"
  - "GitHub REST API client: get_user + paginated list_repos"
  - "IPC commands: initiate_login, poll_login, logout, get_auth_state, list_repos"
  - "Workspace registry: WorkspaceEntry persisted via tauri-plugin-store"
  - "git2 clone with OAuth2 token auth in spawn_blocking"
  - "Workspace IPC commands: connect_workspace, disconnect_workspace, list_workspaces"

affects:
  - 05-02 (auth UI — uses all IPC commands from this plan)
  - 06-git-sync (uses workspace module and clone_ops patterns)

tech-stack:
  added:
    - tauri-plugin-secure-storage 1.4.0 (macOS Keychain via keyring-rs)
    - git2 0.20 with vendored-libgit2 feature (no system libgit2 required)
  patterns:
    - "Tokens never cross IPC: stored in Keychain, never returned to frontend"
    - "git2 always in spawn_blocking: clone_repo and remove_clone are sync functions"
    - "Device flow polling: authorization_pending → continue, slow_down → +5s interval, expired/denied → Err"
    - "secure-storage API: get_item/set_item/remove_item take OptionsRequest with prefixed_key"
    - "reqwest responses: use .text() + serde_json::from_str (not .json() — feature not enabled)"
    - "Registry bootstrap: on first access, creates Local entry from existing default workspace"

key-files:
  created:
    - src-tauri/src/auth/mod.rs
    - src-tauri/src/auth/device_flow.rs
    - src-tauri/src/auth/token.rs
    - src-tauri/src/github/mod.rs
    - src-tauri/src/github/api.rs
    - src-tauri/src/commands/auth.rs
    - src-tauri/src/commands/github.rs
    - src-tauri/src/workspace/mod.rs
    - src-tauri/src/workspace/registry.rs
    - src-tauri/src/workspace/clone_ops.rs
    - src-tauri/src/commands/workspace.rs
  modified:
    - src-tauri/Cargo.toml
    - src-tauri/Cargo.lock
    - src-tauri/capabilities/default.json
    - src-tauri/src/lib.rs
    - src-tauri/src/commands/mod.rs

key-decisions:
  - "tauri-plugin-secure-storage API uses get_item/set_item/remove_item with OptionsRequest struct (not .get/.set/.delete) — models module is private, types re-exported from crate root"
  - "reqwest .json() feature not enabled in tauri-plugin-http re-export — use .text() + serde_json::from_str for JSON parsing"
  - "Device flow poll uses spawn_blocking for sleep to avoid pulling tokio directly into async context"
  - "git2 vendored-libgit2 feature enabled — no system libgit2 required on user machines"
  - "WorkspaceEntry.is_local flag protects Local workspace from removal in remove_workspace filter"

patterns-established:
  - "auth module pattern: device_flow.rs handles HTTP flow, token.rs handles Keychain CRUD"
  - "workspace module pattern: registry.rs handles persistence, clone_ops.rs handles git2 ops"
  - "IPC command pattern: thin async fn delegates to sync/async module functions, token never returned"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05]

duration: 35min
completed: 2026-03-25
---

# Phase 05 Plan 01: GitHub Auth Rust Backend Summary

**GitHub OAuth device flow + macOS Keychain token storage + git2 workspace clone via IPC commands, tokens never crossing the IPC bridge**

## Performance

- **Duration:** 35 min
- **Started:** 2026-03-25T13:50:00Z
- **Completed:** 2026-03-25T14:25:00Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments

- GitHub OAuth device flow: initiate + poll with full error state handling (pending/slow_down/expired/denied)
- macOS Keychain token storage via tauri-plugin-secure-storage (tokens never touch the frontend)
- GitHub REST API client with paginated repo listing and GitHub API versioning headers
- Workspace registry bootstrapped from existing local workspace, persisted via tauri-plugin-store
- git2 clone operation with OAuth2 token credentials running in spawn_blocking
- All IPC commands registered and type-exported via specta (cargo check clean)

## Task Commits

Each task was committed atomically:

1. **Task 1: Auth and GitHub API modules with IPC commands** - `4006295` (feat)
2. **Task 2: Workspace module with registry and clone operations** - `3432d3a` (feat)

## Files Created/Modified

- `src-tauri/Cargo.toml` - Added tauri-plugin-secure-storage 1 and git2 0.20 (vendored)
- `src-tauri/capabilities/default.json` - Added secure-storage:default permission
- `src-tauri/src/auth/device_flow.rs` - Device flow HTTP requests, polling with all error states
- `src-tauri/src/auth/token.rs` - Keychain CRUD via SecureStorageExt (get/set/remove_item)
- `src-tauri/src/github/api.rs` - get_user + paginated list_repos, GitHub API headers
- `src-tauri/src/commands/auth.rs` - initiate_login, poll_login, logout, get_auth_state
- `src-tauri/src/commands/github.rs` - list_repos (delegates to github::api)
- `src-tauri/src/workspace/registry.rs` - WorkspaceEntry + registry load/save/add/remove
- `src-tauri/src/workspace/clone_ops.rs` - clone_repo (OAuth2 credentials) + remove_clone
- `src-tauri/src/commands/workspace.rs` - connect_workspace, disconnect_workspace, list_workspaces
- `src-tauri/src/lib.rs` - Added 3 new mods, secure-storage plugin, 8 new commands

## Decisions Made

- **secure-storage API**: The `models` module is private; `OptionsRequest` is re-exported from the crate root as `tauri_plugin_secure_storage::OptionsRequest`. Methods are `get_item`/`set_item`/`remove_item` taking `(AppHandle, OptionsRequest)`.
- **reqwest `.json()` feature**: Not enabled in the tauri-plugin-http re-export. All JSON responses parsed via `.text()` + `serde_json::from_str`.
- **spawn_blocking for poll sleep**: `tokio::time::sleep` requires tokio to be a direct dep. Used `tauri::async_runtime::spawn_blocking` + `std::thread::sleep` instead.
- **git2 vendored**: Added `vendored-libgit2` feature to avoid requiring system libgit2 on user machines.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed reqwest .json() method not available**
- **Found during:** Task 1 (GitHub API module)
- **Issue:** Plan specified `.json().await` but this feature is not enabled in tauri-plugin-http's reqwest re-export
- **Fix:** Replaced with `.text().await` + `serde_json::from_str` for all GitHub API responses
- **Files modified:** src-tauri/src/github/api.rs, src-tauri/src/auth/device_flow.rs
- **Verification:** cargo check passes
- **Committed in:** 4006295 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed tokio::time::sleep not resolvable in async context**
- **Found during:** Task 1 (device_flow.rs poll_for_token)
- **Issue:** tokio is not a direct dependency; `tokio::time::sleep` fails to resolve
- **Fix:** Used `tauri::async_runtime::spawn_blocking` with `std::thread::sleep`
- **Files modified:** src-tauri/src/auth/device_flow.rs
- **Verification:** cargo check passes
- **Committed in:** 4006295 (Task 1 commit)

**3. [Rule 1 - Bug] Fixed secure-storage API — wrong method names and import path**
- **Found during:** Task 1 (auth/token.rs)
- **Issue:** Plan said `.set(key, val)/.get(key)/.delete(key)` but actual API is `set_item/get_item/remove_item` with `OptionsRequest`. Also `models` module is private.
- **Fix:** Use `tauri_plugin_secure_storage::OptionsRequest` (crate root) and correct method signatures
- **Files modified:** src-tauri/src/auth/token.rs
- **Verification:** cargo check passes
- **Committed in:** 4006295 (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 - Bug: API surface mismatch between plan spec and actual crate)
**Impact on plan:** All auto-fixes needed for compilation correctness. No scope creep. Plan spec was based on ideal API but actual crate differs slightly.

## Issues Encountered

- tauri-plugin-secure-storage v1.4.0 has a different API than the plan assumed. The `desktop.rs` impl uses `get_item(AppHandle, OptionsRequest)` pattern rather than simple `get(key)`. Resolved by reading the crate source directly.

## Known Stubs

- `DEV_CLIENT_ID = "Ov23liXXXXXXXXXXXXXX"` in `device_flow.rs` — placeholder OAuth App client ID. User must register a GitHub OAuth App and set `GITHUB_CLIENT_ID` environment variable at build time before auth will work end-to-end.

## User Setup Required

**GitHub OAuth App configuration required before auth works end-to-end:**
1. Register a GitHub OAuth App at https://github.com/settings/developers
2. Set `Authorization callback URL` to `http://localhost` (device flow doesn't use callbacks)
3. Note the Client ID
4. Set `GITHUB_CLIENT_ID=<your-client-id>` in the build environment (or `.cargo/config.toml`)

## Next Phase Readiness

- All IPC commands ready for the auth UI (plan 05-02)
- Type bindings will be auto-exported to `src/bindings.ts` on `tauri dev`
- `WorkspaceEntry`, `DeviceCodeResponse`, `GitHubUser`, `RepoInfo` types all exported via specta
- The `get_client_id()` placeholder must be replaced with a real GitHub OAuth App client ID before end-to-end testing

---
*Phase: 05-github-auth*
*Completed: 2026-03-25*
