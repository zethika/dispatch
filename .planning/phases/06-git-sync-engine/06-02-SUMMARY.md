---
phase: 06-git-sync-engine
plan: 02
subsystem: frontend-sync-ui
tags: [zustand, tauri-events, react, sync-status, heroui, sonner-toast]
dependency_graph:
  requires:
    - Phase 06 Plan 01 (sync actor, IPC commands, sync-status-changed Tauri events)
    - Phase 05 (workspaceStore, WorkspaceSwitcher, TopBar layout)
  provides:
    - syncStore with per-workspace status map, Tauri event listener, triggerSync/triggerPull
    - SyncStatusChip component (5-state: synced/syncing/conflict/error/local)
    - TopBar with SyncStatusChip integrated on right side
    - WorkspaceSwitcher dots colored by sync status per D-06
    - pull-on-switch for GitHub workspaces per D-12
  affects:
    - src/components/layout/TopBar.tsx (SyncStatusChip + initListener)
    - src/components/layout/WorkspaceSwitcher.tsx (status-colored dots)
    - src/stores/workspaceStore.ts (pull-on-switch in switchWorkspace)
tech_stack:
  added: []
  patterns:
    - Tauri listen() with unlisten cleanup in useEffect (TopBar mount/unmount)
    - Optimistic status update before IPC call, final state from Tauri events
    - Fire-and-forget triggerPull in switchWorkspace (void, not awaited)
    - Inline SVG icons (project convention, no icon packages)
key_files:
  created:
    - src/api/sync.ts
    - src/stores/syncStore.ts
    - src/features/sync/SyncStatusChip.tsx
  modified:
    - src/components/layout/TopBar.tsx
    - src/components/layout/WorkspaceSwitcher.tsx
    - src/stores/workspaceStore.ts
decisions:
  - "SyncStatusChip placed after flex-1 spacer in TopBar: right-aligned between spacer and modals per UI-SPEC position contract"
  - "initListener called in TopBar useEffect (not App): TopBar is always mounted when workspace is active, avoids double-listen"
  - "connect item in WorkspaceSwitcher allItems gets syncStatus: undefined to keep TS array type uniform"
  - "triggerPull is fire-and-forget (void) in switchWorkspace: collection/environment reload proceeds immediately with local state, pull result arrives via Tauri event"
metrics:
  duration_minutes: 8
  completed_date: "2026-03-26"
  tasks_completed: 2
  files_created: 3
  files_modified: 3
---

# Phase 6 Plan 2: Frontend Sync Layer — syncStore, SyncStatusChip, and UI Wiring Summary

**One-liner:** Zustand sync store listening to Tauri events drives a 5-state SyncStatusChip in TopBar and per-workspace status dots in WorkspaceSwitcher, with pull-on-switch for GitHub workspaces.

## What Was Built

### src/api/sync.ts

IPC wrappers following the same pattern as `src/api/workspace.ts`:
- `syncWorkspace(workspaceId)` — wraps `sync_workspace` (commit+push+pull)
- `pullWorkspace(workspaceId)` — wraps `pull_workspace` (pull only, D-12)
- `getSyncStatus(workspaceId)` — wraps `get_sync_status` (initial status query)

### src/stores/syncStore.ts

Zustand store with `useSyncStore` export:
- `syncStatuses: Record<string, SyncStatus>` — per-workspace status map
- `initListener()` — calls `listen<SyncStatusPayload>('sync-status-changed', ...)`, handles conflict toasts (D-09 "updated from remote" language), error toasts with next-step guidance, D-10 active request reload detection
- `triggerSync(workspaceId)` — optimistic `syncing` set, then `syncWorkspace()` IPC call
- `triggerPull(workspaceId)` — same optimistic pattern, then `pullWorkspace()` IPC call
- `getStatus(workspaceId, isLocal)` — returns `'local'` for local-only workspaces, defaults to `'synced'` for unknown remote workspaces

Conflict toast copy: "1 file updated from remote: {path}" or "{N} files updated from remote" — never uses "conflict" or "overwritten" per D-09.

Error toast copy: "Sync failed — sign in to GitHub and try again" (auth errors) or "Sync failed — check your connection and try again" (other errors) — em-dash per UI-SPEC.

### src/features/sync/SyncStatusChip.tsx

5-state chip component:
- `synced`: green check circle (inline SVG, `text-primary`), "Synced" label, clickable
- `syncing`: HeroUI `<Spinner size="sm" />` replaces icon (not icon+spinner together), "Syncing" label, clickable
- `conflict`: amber warning triangle (inline SVG, `text-warning`), "Conflict" label, clickable
- `error`: red X circle (inline SVG, `text-danger`), "Error" label, clickable
- `local`: gray no-sync dash SVG (`text-default-400`), "Local only" label, non-interactive (`isDisabled`)

Reads active workspace from `useWorkspaceStore`, derives `is_local`, calls `getStatus(workspaceId, isLocal)`.

### src/components/layout/TopBar.tsx

Two changes:
1. `useEffect` on mount initializes sync event listener via `useSyncStore.getState().initListener()` and cleans up `unlisten` on unmount
2. `<SyncStatusChip />` rendered after `<div className="flex-1" />` spacer, before the modals

### src/components/layout/WorkspaceSwitcher.tsx

- Reads `syncStatuses` from `useSyncStore`
- Each workspace item gets `syncStatus` field: `'local'` for local workspaces, `syncStatuses[w.id] ?? 'synced'` for GitHub workspaces
- `statusDot(status)` helper: returns `<Spinner size="sm">` for syncing, or colored dot (`bg-primary` / `bg-warning` / `bg-danger` / `bg-default-300`) for other states
- Static `bg-default-300` dot replaced with dynamic `statusDot(item.syncStatus)`

### src/stores/workspaceStore.ts

`switchWorkspace` now triggers D-12 pull-on-switch:
- Finds workspace from state
- If `!workspace.is_local && workspace.clone_url` → calls `void useSyncStore.getState().triggerPull(workspaceId)` (fire-and-forget)
- Collection/environment reloads proceed immediately with current local state
- Pull result arrives asynchronously via `sync-status-changed` event

## Verification

- `npx tsc --noEmit` passes with zero errors
- All 5 chip states render with correct icons, labels, colors per UI-SPEC
- Conflict toast uses "updated from remote" language (never "conflict")
- Error toast includes "try again" next-step guidance
- SyncStatusChip visible in TopBar right side after flex-1 spacer
- WorkspaceSwitcher dots: bg-primary (synced), bg-warning (conflict), bg-danger (error), bg-default-300 (local/default)
- Workspace switch triggers pull for GitHub workspaces
- Local workspaces show "Local only" non-interactive chip and gray dot

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 | 1fe1904 | feat(06-02): create sync API wrappers, syncStore, and SyncStatusChip component |
| Task 2 | 55ab229 | feat(06-02): wire SyncStatusChip into TopBar, update WorkspaceSwitcher dots, add pull-on-switch |

## Self-Check: PASSED
