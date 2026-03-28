# Phase 7: Background Sync Loop - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 07-background-sync-loop
**Areas discussed:** Debounce trigger source, Offline detection & queue, Periodic pull behavior, Sync status offline state

---

## Debounce Trigger Source

### Q1: What should trigger the auto-sync debounce?

| Option | Description | Selected |
|--------|-------------|----------|
| Tauri command hooks | Hook into existing save commands. Only in-app edits trigger sync. Simple, no new dependencies. | ✓ |
| Filesystem watcher (notify crate) | Watch workspace directory for any file changes. Catches external edits too. | |
| Both — commands + watcher | Commands for immediate response, watcher as backup for external edits. | |
| You decide | Claude picks the best approach during planning. | |

**User's choice:** Tauri command hooks (Recommended)
**Notes:** No filesystem watcher needed. External edits not in scope.

### Q2: Where should the debounce timer live?

| Option | Description | Selected |
|--------|-------------|----------|
| Rust-side timer | Debounce in git actor or companion Rust task. Frontend just signals 'something changed'. | ✓ |
| Frontend-side timer | Debounce in Zustand store (setTimeout). Frontend decides when to call sync. | |
| You decide | Claude picks based on actor pattern. | |

**User's choice:** Rust-side timer (Recommended)
**Notes:** Keeps sync logic centralized in Rust.

### Q3: What debounce delay before auto-push?

| Option | Description | Selected |
|--------|-------------|----------|
| 3 seconds | Faster feedback for collaborators. Matches lower bound of success criteria. | ✓ |
| 5 seconds | More conservative. Reduces unnecessary pushes during rapid changes. | |
| You decide | Claude picks based on research. | |

**User's choice:** 3 seconds (Recommended)

### Q4: Should the debounce reset on every new change?

| Option | Description | Selected |
|--------|-------------|----------|
| Reset on each change | Timer restarts with every signal. Standard debounce behavior. | ✓ |
| Fire after first 3s, then new window | First push fires 3s after first change, then new window starts. | |
| You decide | Claude picks based on standard patterns. | |

**User's choice:** Reset on each change (Recommended)

---

## Offline Detection & Queue

### Q1: How should offline state be detected?

| Option | Description | Selected |
|--------|-------------|----------|
| Push/pull failure | Detect offline when git operation fails with network error. Simple, no extra infra. | ✓ |
| Proactive connectivity check | Periodic HTTP ping to GitHub API. Detects offline before sync fails. | |
| macOS NWPathMonitor | Apple's Network framework via FFI. OS-level detection. | |
| You decide | Claude picks simplest reliable approach. | |

**User's choice:** Push/pull failure (Recommended)

### Q2: Should the offline queue survive app restart?

| Option | Description | Selected |
|--------|-------------|----------|
| In-memory only | Queue in Rust actor state. Lost on quit. Next launch detects uncommitted changes. | ✓ |
| Persist to disk | Write queue to JSON in app_data_dir. Survives restart. | |
| You decide | Claude picks based on what git state provides naturally. | |

**User's choice:** In-memory only (Recommended)
**Notes:** Resolves the STATE.md blocker about offline queue persistence strategy.

### Q3: How should reconnection work after going offline?

| Option | Description | Selected |
|--------|-------------|----------|
| Retry on next periodic pull | ~30s pull timer keeps running. When pull succeeds, offline clears. | ✓ |
| Exponential backoff retry | Dedicated retry loop with increasing intervals. | |
| You decide | Claude picks approach that reuses existing timers. | |

**User's choice:** Retry on next periodic pull (Recommended)
**Notes:** Elegant reuse — periodic pull timer doubles as reconnection detector.

---

## Periodic Pull Behavior

### Q1: Should the ~30s pull timer run continuously or adapt?

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed 30s interval | Simple tokio::interval. Runs regardless of activity. Consistent. | ✓ |
| Adaptive frequency | Faster when remote changes detected, slower when idle. | |
| Pause during editing | Stop pulling while debounce timer active. | |
| You decide | Claude picks based on simplicity. | |

**User's choice:** Fixed 30s interval (Recommended)

### Q2: How should focus-pull work?

| Option | Description | Selected |
|--------|-------------|----------|
| Tauri window focus event | Frontend listens for focus event, calls pull_workspace. | ✓ |
| Rust-side focus detection | Tauri window event in Rust triggers pull directly. | |
| You decide | Claude picks cleanest integration. | |

**User's choice:** Tauri window focus event (Recommended)

### Q3: Should pull and debounced push coordinate?

| Option | Description | Selected |
|--------|-------------|----------|
| Actor serializes naturally | Both go through mpsc queue, execute in order. No extra logic. | ✓ |
| Push-before-pull priority | Force push first if debounce active before allowing pull. | |
| You decide | Claude picks based on actor pattern. | |

**User's choice:** Actor serializes naturally (Recommended)
**Notes:** The existing actor pattern already handles this perfectly.

---

## Sync Status Offline State

### Q1: How should 'offline' appear in the SyncStatusChip?

| Option | Description | Selected |
|--------|-------------|----------|
| New 'offline' state | 6th state: gray cloud-off icon + "Offline" text. Distinct from error. | ✓ |
| Reuse 'error' state | Show error chip when offline. Simpler but conflates issues. | |
| You decide | Claude picks best UX. | |

**User's choice:** New 'offline' state (Recommended)

### Q2: Should offline/online transitions show toasts?

| Option | Description | Selected |
|--------|-------------|----------|
| Toast on both transitions | "You're offline..." and "Back online - syncing...". | ✓ |
| Toast on reconnect only | Silent offline, toast on reconnect. | |
| No toasts, chip only | Minimal — chip communicates everything. | |
| You decide | Claude picks based on Phase 6 principles. | |

**User's choice:** Toast on both transitions (Recommended)

### Q3: Should clicking sync chip while offline do anything?

| Option | Description | Selected |
|--------|-------------|----------|
| Attempt sync immediately | Try push/pull. If works, great. If fails, stay offline. Manual retry. | ✓ |
| Show tooltip, no action | Display "will sync when reconnected". No network call. | |
| You decide | Claude picks most user-friendly behavior. | |

**User's choice:** Attempt sync immediately (Recommended)

---

## Claude's Discretion

- Notify_change signal implementation (function call, mpsc message, shared atomic flag)
- Tokio timer details (interval vs sleep loop)
- Timer architecture (part of actor vs separate tasks)
- Network error vs auth error distinction logic
- WorkspaceSwitcher dot color for offline state

## Deferred Ideas

None — discussion stayed within phase scope
