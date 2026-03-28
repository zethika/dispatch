# Phase 7: Background Sync Loop - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Sync becomes invisible and automatic. Changes push to GitHub after 3 seconds of inactivity (debounced). Workspaces pull from remote every ~30 seconds and immediately on app focus. Changes made while offline queue in memory and push when connectivity returns. The sync status indicator adds an "offline" state to the existing chip.

Requirements covered: SYNC-01, SYNC-02, SYNC-03, SYNC-06

</domain>

<decisions>
## Implementation Decisions

### Debounce Trigger & Timer
- **D-01:** Trigger source is Tauri command hooks — hook into existing save commands (save_request, save_environment, etc.). No filesystem watcher (notify crate). Only in-app edits trigger sync; external edits are not detected.
- **D-02:** Debounce timer lives in Rust (git actor or companion task). Frontend signals "something changed", backend handles all timing logic. Keeps sync logic centralized in Rust.
- **D-03:** 3-second debounce delay. Standard reset-on-change behavior — timer restarts with every new "notify_change" signal. Push only fires after 3 seconds of true inactivity.

### Offline Detection & Queue
- **D-04:** Offline detection via push/pull failure. When a git operation fails with a network error, the workspace transitions to "offline" state. No proactive connectivity checks or OS-level network monitoring.
- **D-05:** In-memory offline queue only. Queue lives in Rust actor state. Lost on app quit. On next launch, the app detects uncommitted changes via git status and syncs normally. No disk persistence for the queue.
- **D-06:** Reconnection piggybacks on the periodic pull timer. The ~30s pull timer keeps running while offline. When a pull succeeds, offline state clears and any queued push fires. No dedicated retry loop or exponential backoff.

### Periodic Pull
- **D-07:** Fixed 30-second pull interval using tokio timer. Runs continuously regardless of user activity. No adaptive frequency. If nothing changed remotely, pull is a cheap no-op (fetch finds no new commits).
- **D-08:** Focus-pull via Tauri window focus event on the frontend. Frontend listens for focus event and calls pull_workspace. Fires once per focus transition, not on every click.
- **D-09:** No special coordination between push and pull. Both go through the mpsc actor queue and execute in order. The actor's sequential processing naturally prevents concurrent git ops. No priority logic needed.

### Sync Status Offline State
- **D-10:** New "offline" state added to SyncStatusChip (6th state). Gray cloud-off icon + "Offline" text. Distinct from "error" (red, implies something broke). Offline is an expected transient state, not a failure.
- **D-11:** Toast notifications on both offline and online transitions. Going offline: "You're offline - changes will sync when reconnected". Reconnecting: "Back online - syncing...". Follows the "reassure, don't alarm" principle from Phase 6.
- **D-12:** Clicking the sync chip while offline attempts an immediate sync. If connectivity returned, the sync succeeds and offline state clears. If still offline, stays in offline state. Gives user a manual retry option.

### Claude's Discretion
- How to implement the "notify_change" signal from Tauri commands to the debounce timer (function call, mpsc message, shared atomic flag)
- Tokio timer implementation details (tokio::time::interval vs sleep loop)
- Whether the debounce timer and periodic pull timer are part of the actor or separate tasks
- How to distinguish network errors from auth errors or other git failures
- WorkspaceSwitcher dot color for offline state (likely gray, matching the chip)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Sync Infrastructure (Phase 6 — foundation for this phase)
- `.planning/phases/06-git-sync-engine/06-CONTEXT.md` — Git actor design (D-01 to D-03), sync status states (D-04 to D-07), conflict resolution (D-08 to D-10), commit behavior (D-11 to D-13)
- `src-tauri/src/sync/actor.rs` — Existing mpsc actor loop, ActorHandle, message types
- `src-tauri/src/sync/ops.rs` — Blocking git2 operations (commit_all, push_to_remote, pull_from_remote)
- `src-tauri/src/sync/types.rs` — SyncResult, SyncStatusPayload, message enums
- `src-tauri/src/commands/sync.rs` — sync_workspace, pull_workspace, get_sync_status commands

### Frontend Sync Layer
- `src/stores/syncStore.ts` — Zustand sync store, per-workspace status tracking, event listener
- `src/features/sync/SyncStatusChip.tsx` — 5-state chip component (adding offline as 6th)
- `src/api/sync.ts` — Frontend API wrappers for sync commands

### Workspace Management
- `src-tauri/src/workspace/registry.rs` — WorkspaceEntry struct, local_path, clone_url
- `src/stores/workspaceStore.ts` — Workspace switching, pull-on-switch (D-12 from Phase 6)

### Project Specs
- `.planning/PROJECT.md` — Core value (git-invisible sync), constraints
- `.planning/REQUIREMENTS.md` — SYNC-01 (debounced push), SYNC-02 (periodic pull), SYNC-03 (focus pull), SYNC-06 (offline queue)
- `CLAUDE.md` — Technology stack, spawn_blocking requirement, tauri::async_runtime::spawn exclusively

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `sync/actor.rs` — ActorHandle with mpsc channel (capacity 32). Extend with new message types for debounce notifications and timer management.
- `sync/ops.rs` — commit_all, push_to_remote, pull_from_remote already work. Phase 7 orchestrates when these are called, not what they do.
- `syncStore.ts` — Per-workspace status tracking with Tauri event listener. Add "offline" to SyncStatus type.
- `SyncStatusChip.tsx` — 5-state rendering. Add 6th "offline" state with gray cloud-off icon.
- `sonner` toast library — Already mounted, used for conflict toasts in Phase 6. Reuse for offline/online transition toasts.

### Established Patterns
- mpsc actor pattern for serialized git operations (Phase 6)
- Tauri events (`sync-status-changed`) for real-time backend-to-frontend status updates
- Zustand stores with `getState()` for non-hook access patterns
- `tauri::async_runtime::spawn` for background tasks (never tokio::spawn)
- `spawn_blocking` for all git2 calls

### Integration Points
- Save commands (`save_request`, `save_environment`, etc.) need to emit a "notify_change" signal to the debounce timer
- Actor loop needs extension for debounce timer management and periodic pull scheduling
- `SyncStatusChip.tsx` needs offline state rendering and click-while-offline behavior
- `syncStore.ts` needs offline status handling and transition toasts
- `lib.rs` — Timer initialization alongside existing actor startup
- Tauri window focus event listener (frontend) for focus-pull trigger

</code_context>

<specifics>
## Specific Ideas

- Sync should be completely invisible when working — user never thinks about it. The 3-second debounce means changes appear on teammates' machines within seconds of saving.
- Offline should feel safe, not broken. "Your work is saved locally, it'll sync when you're back" is the mental model.
- The periodic pull timer running during offline serves double duty: it's the reconnection detector. No need for a separate mechanism.
- Manual sync click while offline is a "let me check" gesture — user suspects they're back online and wants to confirm.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-background-sync-loop*
*Context gathered: 2026-03-28*
