---
phase: 08-polish-power-features
plan: "01"
subsystem: collections-dnd
tags: [dnd-kit, drag-drop, collections, rust, tauri-ipc]
dependency_graph:
  requires: []
  provides: [COLL-05, COLL-06, drag-drop-sidebar]
  affects: [CollectionTree, CollectionNode, FolderNode, RequestNode, collectionStore, io.rs]
tech_stack:
  added: ["@dnd-kit/core@6.3.1", "@dnd-kit/sortable@10.0.0", "@dnd-kit/modifiers@9.0.0"]
  patterns: [useSortable-hook, DndContext-wrapper, SortableContext-children, DropIndicator-line, DragOverlay-ghost]
key_files:
  created:
    - src/features/collections/DropIndicator.tsx
    - src/features/collections/DragOverlayItem.tsx
  modified:
    - src-tauri/src/collections/io.rs
    - src-tauri/src/commands/collections.rs
    - src-tauri/src/lib.rs
    - src/api/collections.ts
    - src/stores/collectionStore.ts
    - src/features/collections/CollectionTree.tsx
    - src/features/collections/CollectionNode.tsx
    - src/features/collections/FolderNode.tsx
    - src/features/collections/RequestNode.tsx
decisions:
  - "reorder_node and move_node commands are async (matching existing command pattern) though io.rs functions are sync — sync dispatches notify_change after operation"
  - "u32 for index IPC params (not usize) — specta does not support usize across IPC bridge; cast to usize inside function body"
  - "decodeNodeId in CollectionTree splits on slash: first segment collectionSlug, last is slug, middle segments parentPath"
  - "SortableContext placed on CollectionNode children level (not globally) — each collection gets its own sortable context for isolated reordering"
  - "DropIndicator shown above items via fragment pattern (before the sortable div) using isOver && !isDragging condition"
  - "Collection header drop detection via overId === collection.slug comparison in CollectionNode, passed down from DndContext as prop"
metrics:
  duration_minutes: 6
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_changed: 11
---

# Phase 08 Plan 01: Drag-and-Drop Reordering and Cross-Collection Moves Summary

Drag-and-drop reordering and cross-collection moves for sidebar items using dnd-kit, with Rust persistence via two new Tauri commands (`reorder_node` and `move_node`) backed by filesystem manifest updates.

## What Was Built

**Rust layer:** Two new public functions in `collections/io.rs`:
- `reorder_node(parent_dir, slug, new_index)` — moves a slug to a new position in the same parent's order array
- `move_node(src_parent_dir, dst_parent_dir, workspace_dir, slug, is_dir, dst_index)` — renames the file/dir to move it between parents and updates both manifests atomically

Two new Tauri commands in `commands/collections.rs` wrapping the above, registered in `lib.rs`. Both fire `notify_change` after operation for background sync.

**TypeScript layer:** `reorderNode` and `moveNode` API wrappers in `api/collections.ts`, plus matching store actions in `collectionStore.ts` that call the API then refresh the workspace tree.

**UI layer:**
- `DropIndicator.tsx`: thin `bg-primary` horizontal line rendered above items when `isOver && !isDragging`
- `DragOverlayItem.tsx`: floating ghost with method badge + name, shown in `DragOverlay` during active drag
- `CollectionTree.tsx`: wraps the tree in `DndContext` with `PointerSensor` (8px activation threshold), `restrictToVerticalAxis` modifier, and handlers that dispatch `reorderNode` or `moveNode` based on whether active and over items share the same parent
- `CollectionNode.tsx`: wraps children in `SortableContext` with `verticalListSortingStrategy`; receives `overId` prop for collection-header drop highlight
- `FolderNode.tsx` and `RequestNode.tsx`: each use `useSortable` hook, apply drag transform/opacity, and render `DropIndicator` above when `isOver && !isDragging`; FolderNode additionally shows `border-primary` ring on hover-over

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `u32` for index params in Tauri commands | specta/IPC bridge does not support `usize`; cast to `usize` inside Rust function |
| Async commands for reorder/move | Matches existing command pattern; allows `notify_change` fire-and-forget after sync |
| SortableContext per collection | Keeps each collection's drag context isolated; prevents cross-collection collision detection issues |
| decodeNodeId slug-path convention | nodeId format `collectionSlug/[parentPath]/slug` is already established in store contextMenuNodeId convention |
| Collection header drop via prop | Passing `overId` from DndContext down to CollectionNode avoids lifting drag state into individual nodes |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Duplicate style prop on RequestNode root div**
- **Found during:** Task 2 implementation
- **Issue:** The root div had `style` passed twice — once in the `{...attributes}` spread block and once explicit — causing a TypeScript duplicate prop error
- **Fix:** Merged paddingLeft into the single style object before the attributes spread
- **Files modified:** src/features/collections/RequestNode.tsx
- **Commit:** da854d7

None of the above — plan executed as written with one inline self-correction during implementation.

## Known Stubs

None. The DnD implementation is fully wired: drag triggers store actions that call Rust IPC which persists to filesystem, followed by workspace refresh to reflect updated order.

## Self-Check: PASSED

- DropIndicator.tsx: FOUND
- DragOverlayItem.tsx: FOUND
- commit 0596bdf (Task 1): FOUND
- commit da854d7 (Task 2): FOUND
- cargo check: PASSED
- npx tsc --noEmit: PASSED (exit 0)
- npm run test: 63/63 passing, 4 pre-existing errors unrelated to this plan
