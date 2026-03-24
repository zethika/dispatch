---
phase: 01-foundation
plan: 02
subsystem: ui
tags: [react, heroui, tailwindcss, zustand, vitest, typescript, layout, tdd]

requires:
  - phase: 01-01
    provides: HeroUI v2.7.11 + Tailwind v3 configured with green primary color, Vitest test framework, Tauri IPC

provides:
  - Three-panel app shell: TopBar (48px) + Sidebar (260px fixed) + RightPanel (flex-1)
  - TopBar with Connect GitHub button, No Environment dropdown, Local only chip
  - Sidebar with empty state ("No collections yet") hint
  - RightPanel with RequestEditor + ResponseViewer and resizable drag handle
  - RequestEditor placeholder with GET method dropdown and URL input (autoFocus)
  - ResponseViewer empty state placeholder
  - Zustand uiStore with splitRatio (0.2–0.8 clamped) for drag handle state
  - 9 passing vitest tests covering layout, TopBar controls, and RequestEditor

affects: [all-subsequent-phases, 02-collections, 03-request-engine, 04-environments]

tech-stack:
  added: []
  patterns:
    - "Layout: three-panel using flex-col + flex-row, each panel overflow-hidden"
    - "Sidebar: w-[260px] min-w-[260px] prevents flex shrinking (use both)"
    - "Drag handle: CSS grid gridTemplateRows with splitRatio%, 4px handle, 1fr; mousemove on document not element"
    - "Zustand store: src/stores/uiStore.ts pattern for UI state"
    - "data-tauri-drag-region: on topbar root for macOS window dragging"

key-files:
  created:
    - src/components/layout/TopBar.tsx
    - src/components/layout/TopBar.test.tsx
    - src/components/layout/Sidebar.tsx
    - src/components/layout/RightPanel.tsx
    - src/components/layout/RequestEditor.tsx
    - src/components/layout/RequestEditor.test.tsx
    - src/components/layout/ResponseViewer.tsx
    - src/stores/uiStore.ts
  modified:
    - src/App.tsx
    - src/App.test.tsx

key-decisions:
  - "data-tauri-drag-region on TopBar root enables macOS window dragging without separate drag area"
  - "CSS grid (not flexbox) for RightPanel split: gridTemplateRows allows percentage top panel and 1fr bottom without complex flex math"
  - "splitRatio clamped to 0.2–0.8 in store, not in component — single source of truth"

patterns-established:
  - "Layout components: always use data-testid on root element, always export default"
  - "Zustand stores: src/stores/*.ts, export named hook (useXxxStore)"
  - "TDD in this project: test files created RED first, components written GREEN"

requirements-completed: [APP-01, APP-02, APP-03]

duration: 3min
completed: 2026-03-24
---

# Phase 1 Plan 2: Three-Panel App Shell Layout Summary

**Three-panel Tauri app shell with HeroUI TopBar (Connect GitHub / No Environment / Local only), 260px Sidebar (empty state), and resizable RightPanel (GET request editor + response viewer) — 9 tests passing**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-24T07:35:04Z
- **Completed:** 2026-03-24T07:37:30Z
- **Tasks:** 2 of 2 (Task 2 visual verification approved by user)
- **Files modified:** 10 (8 created, 2 modified)

## Accomplishments

- Complete three-panel layout shell composing TopBar + Sidebar + RightPanel via App.tsx
- TopBar with all three placeholder controls: Connect GitHub (D-08), No Environment (D-09), Local only chip (D-10)
- Sidebar fixed at 260px (D-01) with empty state hint "No collections yet" (D-05)
- RightPanel with resizable drag handle using CSS grid and Zustand splitRatio — green hover (D-07, D-03)
- RequestEditor with GET method dropdown (D-04) and autoFocus URL input
- Zustand uiStore with clamped splitRatio (0.2–0.8)
- 9 vitest tests covering all layout panels, TopBar controls, and RequestEditor (TDD)

## Task Commits

1. **Task 1: Build three-panel layout with TopBar, Sidebar, RightPanel** - `a1fab77` (feat)
2. **Task 2: Visual verification of app shell** - APPROVED (checkpoint:human-verify — user confirmed layout, dark/light mode, green brand color, IPC ping, HMR)

**Plan metadata:** (docs commit hash — see below)

## Files Created/Modified

- `src/App.tsx` - Updated to compose TopBar + Sidebar + RightPanel three-panel layout
- `src/App.test.tsx` - Updated tests for three-panel layout (topbar, sidebar, request-editor, response-viewer data-testids)
- `src/components/layout/TopBar.tsx` - TopBar with Connect GitHub button, No Environment dropdown, Local only chip, data-tauri-drag-region
- `src/components/layout/TopBar.test.tsx` - Tests for D-08, D-09, D-10 controls
- `src/components/layout/Sidebar.tsx` - 260px fixed sidebar with empty state hint
- `src/components/layout/RightPanel.tsx` - CSS grid split with resizable drag handle and green hover (D-07)
- `src/components/layout/RequestEditor.tsx` - GET method dropdown + URL input with autoFocus
- `src/components/layout/RequestEditor.test.tsx` - Tests for GET method and URL placeholder
- `src/components/layout/ResponseViewer.tsx` - Empty state "Response will appear here"
- `src/stores/uiStore.ts` - Zustand store with splitRatio (clamped 0.2–0.8)

## Decisions Made

- **CSS grid for RightPanel split**: Used `gridTemplateRows: \`${splitRatio * 100}% 4px 1fr\`` — cleaner than flexbox for a fixed-height drag handle with percentage-based top panel
- **Drag listeners on document, not element**: mousemove and mouseup attached to `document` on mousedown so drag works even when cursor moves outside the handle
- **splitRatio clamped in store**: Clamping to 0.2–0.8 lives in `setSplitRatio`, not in the RightPanel component — store is the single source of truth

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Known Stubs

The following are intentional placeholders for Phase 1 (layout shell only):

- `src/components/layout/RequestEditor.tsx` — GET method dropdown and URL input are UI-only, no HTTP send functionality (wired in Phase 3)
- `src/components/layout/ResponseViewer.tsx` — Shows static "Response will appear here" text (wired in Phase 3 when HTTP engine lands)
- `src/components/layout/Sidebar.tsx` — Shows static "No collections yet" (wired in Phase 2 when collections data model lands)
- `src/components/layout/TopBar.tsx` — Connect GitHub and No Environment are UI placeholders (wired in Phase 4/5)

These stubs are intentional and documented. They do NOT prevent the plan's goal (visual app shell) from being achieved.

## Next Phase Readiness

- Three-panel shell complete — Phase 2+ can add collections tree to Sidebar and extend RequestEditor
- HeroUI layout patterns established (TopBar, Sidebar, split panel) — copy pattern for new panels
- Zustand uiStore established at `src/stores/uiStore.ts` — add more UI state here as needed
- All 9 tests passing — test infrastructure fully operational for TDD in subsequent plans

---
*Phase: 01-foundation*
*Completed: 2026-03-24*
