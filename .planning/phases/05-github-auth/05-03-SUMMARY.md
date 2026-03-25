---
phase: 05-github-auth
plan: 03
subsystem: auth-ui
tags: [workspace-switcher, auth-state, topbar, session-expiry, zustand, heroui, disconnect-modal]

requires:
  - phase: 05-github-auth
    plan: 01
    provides: "Rust backend: workspace IPC commands, auth IPC commands"
  - phase: 05-github-auth
    plan: 02
    provides: "Frontend auth: authStore, API wrappers, LoginModal, RepoBrowserModal"

provides:
  - "WorkspaceSwitcher: sidebar dropdown showing all workspaces with Connect repo action"
  - "DisconnectConfirmModal: confirmation dialog for workspace disconnect"
  - "Updated workspaceStore: activeWorkspaceId, switchWorkspace, disconnectWorkspace"
  - "Updated TopBar: auth state swap (loading/logged-out/logged-in), avatar dropdown, session expiry toast"
  - "clearActiveRequest in requestStore: resets draft state on workspace switch"
  - "Sidebar integration: WorkspaceSwitcher + RepoBrowserModal hoisted into Sidebar"

affects:
  - 06-git-sync (uses workspaceStore.activeWorkspaceId for sync operations)

tech-stack:
  added: []
  patterns:
    - "loginModalOpen in authStore (not local state): enables D-11 session expiry toast to open login modal from anywhere"
    - "WorkspaceSwitcher uses HeroUI Dropdown with items prop (HeroUI v2 dynamic lists pattern)"
    - "switchWorkspace coordinates three store reloads: loadWorkspace + loadEnvironments + clearActiveRequest"
    - "sessionExpiredPending useEffect pattern: one-shot toast trigger cleared immediately after firing"

key-files:
  created:
    - src/components/layout/WorkspaceSwitcher.tsx
    - src/features/auth/DisconnectConfirmModal.tsx
  modified:
    - src/stores/workspaceStore.ts
    - src/stores/requestStore.ts
    - src/components/layout/TopBar.tsx
    - src/components/layout/Sidebar.tsx
    - src/App.tsx

key-decisions:
  - "WorkspaceEntry imported from api/workspace.ts not bindings.ts — bindings.ts is gitignored (auto-generated), api/workspace.ts is the stable source of truth for frontend types"
  - "workspaceStore.loadWorkspaces adds Array.isArray guard — prevents test env failures when invoke mock returns non-array"
  - "DisconnectConfirmModal calls workspaceStore.disconnectWorkspace directly (not via props) — modal has direct store dependency, avoids threading state through parent"

requirements-completed: [AUTH-04, AUTH-05]

duration: 7min
completed: 2026-03-25
---

# Phase 05 Plan 03: Frontend Workspace Management Summary

**WorkspaceSwitcher sidebar dropdown, TopBar auth state swap with avatar and session expiry toast, DisconnectConfirmModal, and workspace switch wiring across all stores**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-25T13:59:56Z
- **Completed:** 2026-03-25T14:07:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- WorkspaceSwitcher dropdown in sidebar header shows all connected workspaces with sync dots, "Connect repo..." action (only when logged in), and active workspace selection
- DisconnectConfirmModal confirms before removing a workspace — shows loading state during disconnect operation
- workspaceStore updated with `activeWorkspaceId`, `switchWorkspace` (coordinates loadWorkspace + loadEnvironments + clearActiveRequest), and `disconnectWorkspace` (falls back to Local workspace on disconnect)
- requestStore gets `clearActiveRequest` action — resets all draft state on workspace switch
- TopBar replaced static Connect GitHub button with three-state auth rendering: loading spinner, avatar dropdown (logged in), button (logged out)
- Avatar dropdown shows @username (readonly) and Sign out with danger styling
- LoginModal now controlled by authStore.loginModalOpen (not local TopBar state) — enables D-11 session expiry toast action to open it from outside TopBar
- Session expiry toast fires via `sessionExpiredPending` useEffect with clickable "Sign in" action (D-11)
- Sidebar updated with WorkspaceSwitcher + RepoBrowserModal, loads workspaces on mount
- App.tsx calls workspaceStore.loadWorkspaces after ensureDefaultWorkspace

## Task Commits

Each task was committed atomically:

1. **Task 1: WorkspaceStore, WorkspaceSwitcher, and DisconnectConfirmModal** - `10c1d14` (feat)
2. **Task 2: TopBar auth state swap and session expiry toast** - `e82f69e` (feat)

## Files Created/Modified

- `src/components/layout/WorkspaceSwitcher.tsx` - Sidebar workspace dropdown with Dropdown+DropdownMenu, Connect repo action, chevron icon
- `src/features/auth/DisconnectConfirmModal.tsx` - Confirmation dialog with Keep Workspace / Disconnect buttons, loading state
- `src/stores/workspaceStore.ts` - Added activeWorkspaceId, switchWorkspace, disconnectWorkspace; Array.isArray guard in loadWorkspaces
- `src/stores/requestStore.ts` - Added clearActiveRequest action (resets to default state)
- `src/components/layout/TopBar.tsx` - Auth state swap, Avatar dropdown, session expiry toast, LoginModal from authStore
- `src/components/layout/Sidebar.tsx` - WorkspaceSwitcher + RepoBrowserModal integration, loadWorkspaces on mount
- `src/App.tsx` - workspaceStore.loadWorkspaces called after workspace init

## Decisions Made

- **WorkspaceEntry import source**: bindings.ts is gitignored (auto-generated at build time). Using `WorkspaceEntry` from `api/workspace.ts` which is the stable hand-maintained type. Structurally identical to what specta would generate.
- **loginModalOpen in authStore**: Login modal visibility lives in authStore so the D-11 session expiry toast action (`onClick: () => openLoginModal()`) can open it from outside the TopBar component tree without prop drilling or event bus.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed workspaceStore.loadWorkspaces crashing in test environment**
- **Found during:** Task 1 (after running npm test)
- **Issue:** Tauri invoke mock returns `'pong'` for all calls. `workspaces.find` fails when response is not an array
- **Fix:** Added `Array.isArray(workspaces)` guard and try/catch in loadWorkspaces
- **Files modified:** src/stores/workspaceStore.ts
- **Verification:** npm test passes (47 tests green)
- **Committed in:** 10c1d14 (Task 1 commit)

**2. [Rule 1 - Deviation] WorkspaceEntry imported from api/workspace not bindings**
- **Found during:** Task 1 (linter auto-corrected import)
- **Issue:** Plan spec says to import from `../bindings` but bindings.ts is gitignored (auto-generated). Plan 02 already established the pattern of declaring types in api/ modules
- **Fix:** Import from `'../api/workspace'` which exports the same type structure
- **Files modified:** src/stores/workspaceStore.ts
- **Verification:** tsc --noEmit exits 0
- **Committed in:** 10c1d14 (Task 1 commit)

## Known Stubs

None — all components render real data from stores. WorkspaceSwitcher shows real workspace list from workspaceStore. TopBar renders real user.login and user.avatar_url from authStore. DisconnectConfirmModal calls real disconnectWorkspace API.

## Self-Check: PASSED

- FOUND: src/components/layout/WorkspaceSwitcher.tsx
- FOUND: src/features/auth/DisconnectConfirmModal.tsx
- FOUND: .planning/phases/05-github-auth/05-03-SUMMARY.md
- FOUND: commit 10c1d14 (Task 1)
- FOUND: commit e82f69e (Task 2)
