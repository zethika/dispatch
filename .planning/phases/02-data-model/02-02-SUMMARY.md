---
phase: 02-data-model
plan: 02
subsystem: ui
tags: [react, typescript, heroui, zustand, collection-tree, context-menu, tailwind]

requires:
  - 02-data-model/02-01 (Zustand store, TypeScript types, API wrappers)
  - 01-foundation/01-01 (Tauri scaffold, HeroUI, three-panel layout)
provides:
  - CollectionTree root component rendering workspace > collections > folders > requests
  - MethodBadge colored HTTP method labels
  - TreeContextMenu right-click context menu with CRUD actions
  - RenameInput inline editable input with keyboard handling
  - DeleteModal confirmation modal with child count
  - Sidebar wired to CollectionTree (replaces placeholder)
affects:
  - future-phases (collection tree is the primary navigation surface)

tech-stack:
  added: []
  patterns:
    - "Node ID convention: collectionSlug/parentPath.join('/')/slug (unique per tree node)"
    - "countChildren() recursive utility in FolderNode and CollectionNode"
    - "RootContextMenu: custom fixed-position div for empty sidebar right-click (not HeroUI Dropdown)"
    - "TreeContextMenu renders null when neither isOpen nor showDeleteModal — avoids unmounted modal"
    - "useRef + useEffect for RenameInput focus/select — not relying on autoFocus alone (per Pitfall 3)"
    - "window blur listener in TreeContextMenu closes menu when window loses focus (per Pitfall 4)"

key-files:
  created:
    - src/features/collections/MethodBadge.tsx
    - src/features/collections/RenameInput.tsx
    - src/features/collections/DeleteModal.tsx
    - src/features/collections/TreeContextMenu.tsx
    - src/features/collections/RequestNode.tsx
    - src/features/collections/FolderNode.tsx
    - src/features/collections/CollectionNode.tsx
    - src/features/collections/CollectionTree.tsx
  modified:
    - src/components/layout/Sidebar.tsx (replaced placeholder with CollectionTree)

key-decisions:
  - "Node ID built as collectionSlug/parentPath.join('/')/slug — matches store contextMenuNodeId convention"
  - "RootContextMenu uses custom fixed div instead of HeroUI Dropdown — avoids trigger element positioning complexity for empty-area right-click"
  - "POST uses text-blue-500 not text-primary — primary is remapped to green (#17c964) in Phase 1 theme"
  - "CollectionNode rename calls renameNode(slug, [], slug, newName, true) — collection rename parentPath is empty, slug is the collection slug"

duration: ~5min
completed: 2026-03-24
---

# Phase 2 Plan 2: Collection Tree UI Components Summary

**Partial completion (Task 1 of 2) — awaiting human visual verification checkpoint**

**Complete collection tree UI: 8 new components (MethodBadge, RenameInput, DeleteModal, TreeContextMenu, RequestNode, FolderNode, CollectionNode, CollectionTree) wired into Sidebar, TypeScript clean**

## Performance

- **Duration:** ~5 min
- **Completed:** 2026-03-24 (Task 1 only — checkpoint at Task 2)
- **Tasks:** 1/2
- **Files created:** 8
- **Files modified:** 1

## Accomplishments

### Task 1: Collection tree components with method badges and context menu

- `MethodBadge.tsx` — colored HTTP method spans: GET=`text-success`, POST=`text-blue-500`, PUT=`text-warning`, DELETE=`text-danger`, PATCH=`text-secondary`. Uses `w-10 shrink-0 font-mono font-bold text-[10px]`.
- `RenameInput.tsx` — HeroUI Input (size="sm") with `useRef<HTMLInputElement>` + `useEffect` for explicit `focus()`/`select()`. Handles Enter (confirm if non-empty), Escape (cancel), and blur (confirm or cancel).
- `DeleteModal.tsx` — HeroUI Modal with header "Delete {nodeName}?", body shows child count if > 0, footer has Cancel (variant="light") and Delete (color="danger") buttons. Imports and calls `useDisclosure`.
- `TreeContextMenu.tsx` — HeroUI Dropdown with fixed-position zero-size trigger span at `contextMenuPosition`. Two DropdownSections with `showDivider`: Section 1 (New Request, New Folder for non-requests), Section 2 (Rename, Duplicate for requests, Delete). Window blur listener closes menu. Manages local `showDeleteModal` state to open DeleteModal.
- `RequestNode.tsx` — flex row with `paddingLeft: depth * 16 + 8px`, `MethodBadge`, name span (or `RenameInput` when renaming), active highlight (`bg-default-200`), right-click triggers `setContextMenu`. Renders `TreeContextMenu`.
- `FolderNode.tsx` — chevron SVG rotates 90deg on expand (CSS transition), folder icon SVG, recursive child rendering when expanded. `countChildren()` utility for delete modal. `onContextMenu` → `TreeContextMenu`.
- `CollectionNode.tsx` — same chevron/icon pattern as FolderNode but for top-level collections. `collectionSlug` is `collection.slug`, `parentPath=[]` for direct children.
- `CollectionTree.tsx` — workspace name header, empty state ("No collections yet / Right-click to create a collection"), maps collections to `CollectionNode`. `RootContextMenu` sub-component (custom fixed div) handles right-click on empty sidebar area → New Collection.
- `Sidebar.tsx` — replaced placeholder div content with `<CollectionTree />`.

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | cc4cc09 | feat(02-02): collection tree components with method badges, context menu, inline rename, delete modal |

## Verification Results

1. `npx tsc --noEmit` — exits 0, no TypeScript errors
2. All 9 acceptance criteria file patterns verified present
3. Task 2 (visual verification) — PENDING human checkpoint

## Deviations from Plan

None — plan executed exactly as written for Task 1.

## Self-Check: PASSED

- `src/features/collections/CollectionTree.tsx` — exists, contains `export function CollectionTree` and `useCollectionStore`
- `src/features/collections/MethodBadge.tsx` — exists, contains `METHOD_COLORS`, `text-success`, `text-blue-500`, `text-warning`, `text-danger`
- `src/components/layout/Sidebar.tsx` — exists, contains `CollectionTree`
- Commit cc4cc09 — verified in git log

## Known Stubs

None — all tree components are wired to real store actions (`createRequest`, `createFolder`, `renameNode`, `deleteNode`, `duplicateRequest`) which delegate to Tauri IPC commands backed by real file I/O from Plan 01.
