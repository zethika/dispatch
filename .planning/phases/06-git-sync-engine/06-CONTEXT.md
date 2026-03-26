# Phase 6: Git Sync Engine - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Workspaces sync to GitHub through a thread-safe git actor using an mpsc channel pattern. This phase builds the commit/push/pull infrastructure with manual trigger only (clicking the sync status chip or pulling on workspace switch). Conflict resolution is last-write-wins with remote winning on pull, with toast notification of affected files. A sync status indicator in the TopBar shows synced/syncing/conflict/error states. Auto-sync debounce, periodic pull, focus pull, and offline queue are deferred to Phase 7.

Requirements covered: SYNC-04, SYNC-05

</domain>

<decisions>
## Implementation Decisions

### Git Actor Design
- **D-01:** Single long-lived Rust task with an mpsc channel. All git operations (commit, push, pull, status check) are sent as messages and executed sequentially. Guarantees no concurrent git2 calls. Callers get results via oneshot reply channels.
- **D-02:** Per-app singleton actor — one git actor for the whole app. Operations on different workspaces go through the same queue. Since the user interacts with one workspace at a time, contention is minimal.
- **D-03:** Actor runs in `spawn_blocking` per operation (git2 is synchronous). The actor loop itself is async, receiving messages and dispatching blocking work.

### Sync Status Indicator
- **D-04:** Primary sync status is a chip in the TopBar, replacing the "Local only" badge from Phase 1. Shows icon + text: synced (green check + "Synced"), syncing (spinner + "Syncing"), conflict (amber warning + "Conflict"), error (red x + "Error"). For non-GitHub workspaces, shows "Local only" (gray).
- **D-05:** 4 sync states: synced, syncing, conflict, error. "Local only" for non-GitHub workspaces. Error state catches push failures, auth issues, network problems.
- **D-06:** Workspace switcher dots mirror the TopBar states per workspace: green=synced, spinner=syncing, amber=conflict, red=error, gray=local. Gives at-a-glance status for all workspaces even when not active.
- **D-07:** Clicking the sync status chip in the TopBar triggers a manual sync (commit + push local changes, then pull remote changes).

### Conflict Resolution
- **D-08:** Remote wins on pull. When pull finds a merge conflict, the remote version wins automatically. Local changes for conflicting files are discarded. The resolved files are staged and the merge is committed.
- **D-09:** Conflict notification via sonner toast showing which files had conflicts resolved. Includes file path(s) relative to collection. Non-blocking, disappears after ~5 seconds. Example: "1 file updated from remote: users-api/get-user.json".
- **D-10:** After conflict resolution, the affected request is reloaded in the editor if it was the active request. Sync status returns to "Synced".

### Commit & Push Behavior
- **D-11:** Phase 6 is manual trigger only. User triggers sync by clicking the TopBar sync chip. Auto-sync debounce comes in Phase 7.
- **D-12:** Pull on workspace switch — when the user switches to a different workspace, a pull is triggered automatically to get latest remote changes.
- **D-13:** Commit scope is all workspace changes: `git add -A` within the workspace directory, then commit. Auto-generated commit message: "Dispatch sync". Users don't see or configure commit messages.

### Claude's Discretion
- Git actor message enum design (which operations to support)
- Error recovery strategy for failed pushes (retry once? toast and manual retry?)
- How to detect "no changes to commit" (skip push if nothing changed)
- Sync store design (Zustand store for frontend sync state)
- Whether to emit Tauri events from the actor for real-time status updates
- Pull strategy: fetch+merge vs rebase (both valid for this use case)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specs
- `SPECS.md` — Full v1 specification including sync behavior, conflict resolution, file model
- `.planning/PROJECT.md` — Core value (git-invisible sync), constraints (git2, spawn_blocking)

### Requirements
- `.planning/REQUIREMENTS.md` — SYNC-04 (sync status indicator), SYNC-05 (conflict notification)

### Prior Phase Context
- `.planning/phases/05-github-auth/05-CONTEXT.md` — WorkspaceEntry struct, clone_ops.rs pattern, token access, sync dot placeholder (D-09)
- `.planning/phases/01-foundation/01-CONTEXT.md` — TopBar layout, "Local only" badge (D-10)

### Technology
- `CLAUDE.md` §Technology Stack — git2 crate, spawn_blocking requirement, tauri::async_runtime::spawn exclusively

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src-tauri/src/workspace/clone_ops.rs` — git2 credential callback pattern (`Cred::userpass_plaintext("oauth2", &token)`). Reuse for push/pull authentication.
- `src-tauri/src/auth/token.rs` — Keychain token retrieval. Git actor needs token for authenticated push/pull.
- `src-tauri/src/workspace/registry.rs` — WorkspaceEntry with `local_path` and `clone_url`. Actor uses these to locate repos and construct remotes.
- `src/stores/workspaceStore.ts` — Has workspace list with sync dot rendering. Will need a `syncStatus` field per workspace.
- `src/components/layout/TopBar.tsx` — Currently shows auth status chip area. Sync status chip will be added here.
- `sonner` toast library — Already installed and mounted in App.tsx. Used for conflict notifications.

### Established Patterns
- mpsc not yet used — this phase introduces the pattern
- All git2 ops via `tauri::async_runtime::spawn_blocking` (clone_ops.rs sets precedent)
- Zustand stores for frontend state (authStore, workspaceStore, collectionStore)
- Tauri events not yet used — may introduce for real-time sync status updates from actor to frontend
- IPC commands via tauri-specta typed bridge

### Integration Points
- `TopBar.tsx` — Sync status chip (replaces "Local only" badge for GitHub workspaces)
- `WorkspaceSwitcher.tsx` — Sync dots per workspace mirror TopBar states
- `workspaceStore.ts` — New `syncStatus` per workspace entry
- `collectionStore.ts` — `refreshWorkspace()` called after successful pull to reload changed files
- `environmentStore.ts` — `loadEnvironments()` may need refresh after pull if environment files changed
- `lib.rs` — Actor initialization on app startup, new sync IPC commands
- `Cargo.toml` — No new crates needed (git2 already present)

</code_context>

<specifics>
## Specific Ideas

- The sync chip in the TopBar should feel like a status light — glanceable, not demanding attention unless there's a problem
- Conflict toasts should be specific enough that the user knows which request changed, but not alarming — "updated from remote" not "overwritten" or "conflict"
- Manual sync click should feel instant even if the operation takes a second — show "Syncing" immediately, resolve when done
- Pull on workspace switch means the user always sees the latest state when they switch — no stale data

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-git-sync-engine*
*Context gathered: 2026-03-26*
