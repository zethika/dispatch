---
phase: 07-background-sync-loop
plan: 02
subsystem: sync
tags: [react, typescript, zustand, tauri, offline, focus-pull, toast, vitest]

dependency_graph:
  requires:
    - phase: 07-01
      provides: debounced-auto-push, periodic-pull-timer, offline-detection, notify-change-ipc
  provides:
    - offline-status-chip-rendering
    - offline-transition-toasts
    - focus-pull-on-window-focus
    - sync-status-6-states
  affects: [sync/actor, frontend/sync-ui, App.tsx, WorkspaceSwitcher]

tech-stack:
  added: []
  patterns:
    - "previousStatuses map for transition detection in Zustand listener (detect offline->online)"
    - "getState() non-hook pattern in Tauri event callbacks and focus listener"
    - "onFocusChanged with .then() pattern — useEffect can't be async, onFocusChanged returns Promise<UnlistenFn>"
    - "Mock @tauri-apps/api/window in vitest: vi.mock() with onFocusChanged returning vi.fn().mockResolvedValue(() => {})"

key-files:
  created:
    - src/features/sync/SyncStatusChip.test.tsx
    - src/stores/syncStore.test.ts
  modified:
    - src/stores/syncStore.ts
    - src/features/sync/SyncStatusChip.tsx
    - src/components/layout/WorkspaceSwitcher.tsx
    - src/App.tsx
    - src/App.test.tsx

key-decisions:
  - "onFocusChanged uses .then() not async/await in useEffect — consistent with initListener pattern in TopBar"
  - "Wave 0 stubs replaced with logic-level assertions — no React render mocking needed for label/icon mapping tests"
  - "App.test.tsx extended with window and syncStore mocks to support App.tsx new imports"

requirements-completed: [SYNC-03, SYNC-06]

duration: 5min
completed: "2026-03-29"
---

# Phase 7 Plan 2: Background Sync Loop — Offline State & Focus-Pull Summary

**Offline chip (CloudOffIcon + 'Offline' label), neutral transition toasts, focus-pull via onFocusChanged, and WorkspaceSwitcher gray dot — completing the 6-state frontend sync experience.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-29T17:14:30Z
- **Completed:** 2026-03-29T17:19:10Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint reached)
- **Files modified:** 7

## Accomplishments

- Extended `SyncStatus` type with `'offline'` — chip now renders 6 states (local, syncing, synced, conflict, error, offline)
- `CloudOffIcon` inline SVG added; `syncStore` fires neutral `toast()` on offline/online transitions (D-11)
- Network error detection in `triggerSync`/`triggerPull` catch blocks sets `'offline'` instead of `'error'`
- `previousStatuses` map tracks prior state for transition detection inside the `listen` callback
- `App.tsx` focus-pull listener using `getCurrentWindow().onFocusChanged()` — Tauri window-level, not DOM focus (SYNC-03)
- `WorkspaceSwitcher` statusDot gains `offline: 'bg-default-400'` (darker gray than local's `bg-default-300`)
- All 53 frontend tests pass; `App.test.tsx` updated with mocks for `@tauri-apps/api/window` and `useSyncStore`

## Task Commits

Each task was committed atomically:

1. **Task 0: Wave 0 test stubs** - `dd67daa` (test)
2. **Task 1: Offline state in syncStore, SyncStatusChip, WorkspaceSwitcher** - `7fc5ce1` (feat)
3. **Task 2: Focus-pull listener in App.tsx** - `077a891` (feat)

Task 3 (human-verify checkpoint) — awaiting human verification of full sync loop behavior.

## Files Created/Modified

- `src/stores/syncStore.ts` — `'offline'` in SyncStatus type, `previousStatuses` tracking, transition toasts, network error detection in both catch blocks
- `src/features/sync/SyncStatusChip.tsx` — `CloudOffIcon` component, `'offline'` branch in icon/label selection
- `src/components/layout/WorkspaceSwitcher.tsx` — `offline: 'bg-default-400'` added to statusDot colorMap
- `src/App.tsx` — `getCurrentWindow` import, `useSyncStore` import, focus-pull useEffect
- `src/App.test.tsx` — Added mocks for `@tauri-apps/api/window` and `useSyncStore` (with `getState` including `initListener`)
- `src/stores/syncStore.test.ts` — Wave 0 stubs replaced with real type and network-error-detection assertions
- `src/features/sync/SyncStatusChip.test.tsx` — Wave 0 stubs replaced with label/icon mapping assertions

## Decisions Made

- `onFocusChanged` uses `.then()` to capture `unlisten` fn — useEffect callbacks cannot be async, matches the `initListener` pattern already used in TopBar
- Wave 0 test stubs replaced with logic-level unit tests (no React render tree needed for label/icon mapping logic)
- `App.test.tsx` required 3 new mocks: `@tauri-apps/api/window` (for getCurrentWindow), `useSyncStore` (for focus listener), and extended `workspaceStore.getState` to include `workspaces`/`activeWorkspaceId`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] App.test.tsx broke when App.tsx imported getCurrentWindow**
- **Found during:** Task 2 (focus-pull listener in App.tsx)
- **Issue:** `getCurrentWindow()` throws `Cannot read properties of undefined (reading 'metadata')` in vitest — Tauri runtime not present
- **Fix:** Added `vi.mock('@tauri-apps/api/window', ...)` and `vi.mock('./stores/syncStore', ...)` to App.test.tsx; extended workspaceStore mock's `getState` with `workspaces: []` and `activeWorkspaceId: null`
- **Files modified:** src/App.test.tsx
- **Verification:** All 4 App Shell Layout tests pass; 53/53 frontend tests green
- **Committed in:** 077a891 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug: test mock gap caused by new import)
**Impact on plan:** Necessary correctness fix — tests must pass in vitest environment. No scope creep.

## Issues Encountered

The `useSyncStore.getState().initListener` mock was initially missing from the `getState` shape in App.test.tsx (only `triggerPull` was mocked). TopBar mounts in the render tree and calls `initListener()` — required adding it to the mock. Fixed in same commit.

## Known Stubs

None — all sync behaviors wired to real implementation.

## Next Phase Readiness

- All frontend sync state UI is complete: 6-state chip, transition toasts, focus-pull, WorkspaceSwitcher offline dot
- Pending: human verification of full sync loop (Task 3 checkpoint)
- After verification: Phase 7 completes, requirements SYNC-01/02/03/06 validated

## Self-Check: PASSED
