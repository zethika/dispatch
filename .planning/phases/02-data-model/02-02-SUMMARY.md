---
phase: 02-data-model
plan: 02
subsystem: ui
tags: [react, heroui, zustand, tailwind, context-menu, tree-view]

requires:
  - phase: 02-data-model/01
    provides: "Rust CRUD commands, TypeScript types, collectionStore, API wrappers"
  - phase: 01-foundation/01-01
    provides: "Tauri scaffold, HeroUI, three-panel layout"
provides:
  - "Interactive collection tree sidebar with recursive rendering"
  - "Right-click context menus for collections, folders, and requests"
  - "Inline rename with Enter/Escape handling"
  - "Delete confirmation modal with child count"
  - "HTTP method badges (GET=green, POST=blue, PUT=orange, DELETE=red)"
affects: [request-editor, environment-variables, git-sync]

tech-stack:
  added: []
  patterns:
    - "Plain positioned div for context menus (HeroUI Dropdown unreliable with programmatic triggers)"
    - "expandedNodes slug rewriting on rename to preserve tree state"
    - "Dedicated collection-level Rust commands (delete_collection, rename_collection) separate from node-level CRUD"

key-files:
  created:
    - src/features/collections/CollectionTree.tsx
    - src/features/collections/CollectionNode.tsx
    - src/features/collections/FolderNode.tsx
    - src/features/collections/RequestNode.tsx
    - src/features/collections/MethodBadge.tsx
    - src/features/collections/TreeContextMenu.tsx
    - src/features/collections/RenameInput.tsx
    - src/features/collections/DeleteModal.tsx
  modified:
    - src/components/layout/Sidebar.tsx
    - src-tauri/src/commands/collections.rs
    - src-tauri/src/lib.rs
    - src/api/collections.ts
    - src/stores/collectionStore.ts

key-decisions:
  - "Replaced HeroUI Dropdown with plain positioned div for context menus — HeroUI Dropdown with zero-size triggers does not render in WebKit"
  - "Added dedicated delete_collection and rename_collection Rust commands — generic delete_node/rename_node resolve parent_dir inside the collection, not at collections/ level"
  - "expandedNodes rewriting on rename — swaps old slug prefix for new slug in all child nodeIds to preserve tree open state"
  - "POST uses text-blue-500 not text-primary — primary is remapped to green in Phase 1 theme"

patterns-established:
  - "Context menu pattern: onContextMenu sets store state, plain fixed-position div renders at cursor, click/blur listeners dismiss"
  - "Node ID convention: collections use slug directly, children use collectionSlug/parentPath/slug"

requirements-completed: [COLL-01, COLL-02, COLL-03, COLL-04]

duration: 45min
completed: 2026-03-24
---

# Plan 02-02: Collection Tree UI Summary

**Interactive sidebar tree with context menus, inline rename, delete modals, and HTTP method badges — all 13 visual verification items passed**

## Performance

- **Duration:** ~45 min (including checkpoint fixes)
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files created:** 8
- **Files modified:** 5

## Accomplishments
- Full collection tree in sidebar: workspace > collections > folders > requests hierarchy (COLL-01)
- Right-click context menus for all node types with create/rename/delete/duplicate actions (COLL-02, COLL-03, COLL-04)
- Colored HTTP method badges: GET=green, POST=blue, PUT=orange, DELETE=red (D-01)
- Inline rename with Enter to confirm, Escape to cancel, auto-focus and select (D-05)
- Delete confirmation modal with recursive child count (D-06)
- All 13 visual verification items approved by user in running Tauri app

## Task Commits

1. **Task 1: Collection tree components** - `cc4cc09` (feat)
2. **Task 2: Visual verification + fixes** - `f4bbc8e` (fix — context menu, collection CRUD, rename state)

**Plan metadata:** `94f3bf7` (docs: complete plan)

## Files Created/Modified
- `src/features/collections/CollectionTree.tsx` - Root tree with workspace header, empty state, root context menu
- `src/features/collections/CollectionNode.tsx` - Top-level collection with expand/collapse
- `src/features/collections/FolderNode.tsx` - Recursive folder with chevron animation
- `src/features/collections/RequestNode.tsx` - Request row with method badge and active highlight
- `src/features/collections/MethodBadge.tsx` - Colored HTTP method label
- `src/features/collections/TreeContextMenu.tsx` - Right-click menu with CRUD actions
- `src/features/collections/RenameInput.tsx` - Inline editable input with keyboard handling
- `src/features/collections/DeleteModal.tsx` - HeroUI Modal with child count warning
- `src/components/layout/Sidebar.tsx` - Replaced placeholder with CollectionTree
- `src-tauri/src/commands/collections.rs` - Added delete_collection and rename_collection commands
- `src/stores/collectionStore.ts` - Added collection-level actions and expandedNodes slug rewriting

## Decisions Made
- HeroUI Dropdown with zero-size programmatic triggers does not render in WebKit — replaced with plain positioned divs
- Collection-level rename/delete needs dedicated Rust commands (parent_dir is `collections/`, not `collections/{slug}/`)
- expandedNodes must rewrite all child slug prefixes when a parent is renamed
- POST uses text-blue-500 instead of text-primary (primary remapped to green in theme)

## Deviations from Plan

### Auto-fixed Issues

**1. Native context menu not suppressed**
- **Found during:** Task 2 (visual verification)
- **Issue:** `e.target === e.currentTarget` guard prevented `e.preventDefault()` on child elements
- **Fix:** Removed guard; child nodes already call `e.stopPropagation()`
- **Files modified:** CollectionTree.tsx
- **Committed in:** f4bbc8e

**2. HeroUI Dropdown context menu not rendering**
- **Found during:** Task 2 (visual verification)
- **Issue:** Zero-size invisible trigger does not work with HeroUI Dropdown in WebKit
- **Fix:** Replaced with plain positioned div + button pattern
- **Files modified:** TreeContextMenu.tsx
- **Committed in:** f4bbc8e

**3. Collection delete/rename failing silently**
- **Found during:** Task 2 (visual verification)
- **Issue:** nodeId mismatch + delete_node/rename_node resolve wrong parent_dir for collections
- **Fix:** Fixed nodeId computation; added dedicated delete_collection and rename_collection Rust commands
- **Files modified:** TreeContextMenu.tsx, commands/collections.rs, lib.rs, api/collections.ts, collectionStore.ts
- **Committed in:** f4bbc8e

**4. Context menu clicks collapsing tree**
- **Found during:** Task 2 (visual verification)
- **Issue:** Click events on menu buttons bubbled to row's toggleExpanded handler
- **Fix:** Added `e.stopPropagation()` on context menu container
- **Files modified:** TreeContextMenu.tsx
- **Committed in:** f4bbc8e

**5. Rename collapses tree state**
- **Found during:** Task 2 (visual verification)
- **Issue:** Slug change after rename invalidated expandedNodes entries
- **Fix:** Rewrite all expandedNodes entries with old slug prefix to use new slug
- **Files modified:** collectionStore.ts
- **Committed in:** f4bbc8e

---

**Total deviations:** 5 auto-fixed (all discovered during visual verification checkpoint)
**Impact on plan:** All fixes necessary for correct behavior. No scope creep.

## Issues Encountered
None beyond the deviations above — all discovered and resolved during the human verification checkpoint.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Collection tree fully interactive and persisting to disk
- Ready for request editor phase (selecting a request in tree → loading it in editor panel)
- Git sync phase can now operate on the file-based collection structure

---
*Phase: 02-data-model*
*Completed: 2026-03-24*
