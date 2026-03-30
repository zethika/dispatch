---
phase: 08-polish-power-features
plan: "04"
subsystem: keyboard-shortcuts
tags: [keyboard-shortcuts, cheatsheet, flash-feedback, uiStore, global-listener]
dependency_graph:
  requires:
    - src/stores/uiStore.ts (searchOpen/cheatsheetOpen — added as part of this plan)
    - src/stores/requestStore.ts (sendRequest, activeRequestMeta)
    - src/stores/collectionStore.ts (createRequest, createCollection, setActiveRequest)
    - src/stores/environmentStore.ts (environments, activeEnvSlug, setActiveEnvironment)
    - src/stores/syncStore.ts (triggerSync)
    - src/utils/curl.ts (buildCurlString — created as deviation, Plan 02 not merged)
  provides:
    - Global keydown listener in App.tsx for all 9 shortcuts
    - ShortcutCheatsheet modal (Cmd+/)
    - flashElement utility for D-12 ring feedback
    - data-shortcut-id attributes on target elements
  affects:
    - src/App.tsx
    - src/App.test.tsx
    - src/stores/uiStore.ts
    - src/features/http/UrlBar.tsx
    - src/components/layout/TopBar.tsx
    - src/components/layout/Sidebar.tsx
tech_stack:
  added: []
  patterns:
    - Store .getState() access in useEffect to avoid stale closure (empty [] dep array)
    - flashElement utility: querySelector by data-shortcut-id, 300ms ring-primary ring
    - D-10: No tagName/nodeName check — shortcuts fire from text inputs
key_files:
  created:
    - src/features/shortcuts/ShortcutCheatsheet.tsx
    - src/utils/curl.ts (deviation — Plan 02 not merged)
  modified:
    - src/App.tsx
    - src/App.test.tsx
    - src/stores/uiStore.ts
    - src/features/http/UrlBar.tsx
    - src/components/layout/TopBar.tsx
    - src/components/layout/Sidebar.tsx
decisions:
  - syncStore has triggerSync(workspaceId) not triggerPush() — Cmd+S uses triggerSync with current workspaceId
  - environmentStore.setActiveEnvironment takes (workspaceId, slug) — Cmd+E reads workspaceId from collectionStore
  - buildCurlString created inline (Plan 02 not yet merged in this parallel worktree)
  - uiStore extended with searchOpen/cheatsheetOpen since Plan 03 not merged in this worktree
metrics:
  duration_minutes: 3
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_created: 2
  files_modified: 6
---

# Phase 8 Plan 4: Global Keyboard Shortcuts and Cheatsheet Summary

**One-liner:** Nine global keyboard shortcuts (Cmd+Enter through Cmd+/) wired to store actions in App.tsx with 300ms flash feedback and a HeroUI cheatsheet modal accessible via Cmd+/.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | ShortcutCheatsheet modal | 84d2dfc | src/features/shortcuts/ShortcutCheatsheet.tsx, src/stores/uiStore.ts |
| 2 | Global keyboard shortcut listener in App.tsx with flash feedback | 547976a | src/App.tsx, src/App.test.tsx, src/utils/curl.ts, src/features/http/UrlBar.tsx, src/components/layout/TopBar.tsx, src/components/layout/Sidebar.tsx |

## What Was Built

### Task 1: ShortcutCheatsheet modal

- Extended `uiStore.ts` with `searchOpen`/`setSearchOpen` and `cheatsheetOpen`/`setCheatsheetOpen` (Plan 03 not merged in this worktree)
- Created `src/features/shortcuts/ShortcutCheatsheet.tsx` — HeroUI Modal, size "md"
- Title: "Keyboard Shortcuts" in ModalHeader
- Two-column layout (label left, kbd badge right) for all 9 shortcuts
- Key badge styling: `bg-primary/10 text-primary px-2 py-0.5 rounded font-mono text-xs`
- Reads `cheatsheetOpen`/`setCheatsheetOpen` from `useUiStore`

### Task 2: Global keyboard shortcut listener

- Added `flashElement(shortcutId)` utility function at top of App.tsx — queries `[data-shortcut-id]`, adds ring classes, removes after 300ms (D-12)
- Added global `keydown` useEffect in App.tsx with empty `[]` dep array; uses `.getState()` to read stores (no stale closure)
- D-10 compliant: no `tagName`/`nodeName` check — all shortcuts fire regardless of focused element
- Nine shortcuts implemented:
  - `Cmd+Enter` → `sendRequest()` → flash `send-button`
  - `Cmd+N` → `createRequest(collSlug, [], 'New Request')` → flash `new-request`
  - `Cmd+Shift+N` → `createCollection('New Collection')` → flash `sidebar-area`
  - `Cmd+K` → `setSearchOpen(true)` → flash `search-icon`
  - `Cmd+E` → cycle `setActiveEnvironment(wsId, nextSlug)` with toast → flash `env-selector`
  - `Cmd+Shift+C` → `buildCurlString(...)` → `navigator.clipboard.writeText` with toast → flash `url-bar`
  - `Cmd+W` → `setActiveRequest(null)` → flash `active-tab`
  - `Cmd+S` → `triggerSync(workspaceId)` → flash `sync-chip`
  - `Cmd+/` → `setCheatsheetOpen(true)`
- `ShortcutCheatsheet` rendered in App.tsx JSX after `<Toaster>`
- Added `data-shortcut-id` attributes: `send-button` on UrlBar Send button, `url-bar` on UrlBar container, `env-selector` on TopBar env dropdown trigger, `sync-chip` on TopBar SyncStatusChip wrapper, `sidebar-area` on Sidebar root
- Created `src/utils/curl.ts` with `buildCurlString` (deviation — Plan 02 not merged in this worktree)
- Extended `App.test.tsx` with 3 keyboard shortcut tests (Cmd+Enter, Cmd+K, Cmd+S) using mocked stores

## Success Criteria Met

- KEY-01: Cmd+Enter sends request
- KEY-02: Cmd+N creates request in active collection
- KEY-03: Cmd+Shift+N creates collection
- KEY-04: Cmd+K opens search modal
- KEY-05: Cmd+E cycles to next environment
- KEY-06: Cmd+Shift+C copies as cURL
- KEY-07: Cmd+W closes/deselects request
- KEY-08: Cmd+S triggers sync push
- D-10: Shortcuts fire from text fields (no tagName check)
- D-11: Cmd+/ opens cheatsheet modal
- D-12: 300ms flash ring on target element

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added searchOpen/cheatsheetOpen to uiStore.ts**
- **Found during:** Task 1
- **Issue:** Plan 03 (which adds these fields) not merged into this parallel worktree
- **Fix:** Extended uiStore.ts with searchOpen/setSearchOpen and cheatsheetOpen/setCheatsheetOpen
- **Files modified:** src/stores/uiStore.ts
- **Commit:** 84d2dfc

**2. [Rule 3 - Blocking] Created src/utils/curl.ts with buildCurlString**
- **Found during:** Task 2
- **Issue:** Plan 02 not merged into this parallel worktree; curl.ts does not exist
- **Fix:** Created minimal buildCurlString implementation matching the interface spec
- **Files modified:** src/utils/curl.ts
- **Commit:** 547976a

**3. [Rule 1 - Bug] Adapted syncStore call from triggerPush to triggerSync**
- **Found during:** Task 2
- **Issue:** Plan spec references `triggerPush()` but syncStore only has `triggerSync(workspaceId)` and `triggerPull(workspaceId)`
- **Fix:** Cmd+S uses `triggerSync(workspaceId)` from collectionStore current workspaceId
- **Files modified:** src/App.tsx
- **Commit:** 547976a

**4. [Rule 1 - Bug] Adapted environmentStore field names**
- **Found during:** Task 2
- **Issue:** Plan spec references `activeEnvironmentSlug` but store uses `activeEnvSlug`; `setActiveEnvironment` requires (workspaceId, slug) not just (slug)
- **Fix:** Used correct field name `activeEnvSlug` and read `workspaceId` from collectionStore
- **Files modified:** src/App.tsx
- **Commit:** 547976a

## Self-Check: PASSED

- `src/features/shortcuts/ShortcutCheatsheet.tsx` — FOUND
- `src/stores/uiStore.ts` (searchOpen/cheatsheetOpen) — FOUND
- `src/App.tsx` (metaKey handlers, flashElement, ShortcutCheatsheet) — FOUND
- `src/utils/curl.ts` — FOUND
- Commit `84d2dfc` — FOUND
- Commit `547976a` — FOUND
- `npx tsc --noEmit` — PASS
- `npm run test` — 50/50 PASS (pre-existing 4 unhandled rejections in EnvironmentModal.test.tsx unrelated to this plan)

## Known Stubs

None.
