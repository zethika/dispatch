# Phase 2: Data Model - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

File-per-request JSON schema, Rust read/write commands, and collection tree UI. This phase delivers the data layer (JSON files on disk) and the sidebar tree that renders and manipulates collections, folders, and requests. No HTTP execution, no environments, no git sync.

Requirements covered: COLL-01, COLL-02, COLL-03, COLL-04

</domain>

<decisions>
## Implementation Decisions

### Collection Tree Display
- **D-01:** Each request in the sidebar tree shows a colored HTTP method badge (GET=green, POST=blue, PUT=orange, DELETE=red) to the left of the request name
- **D-02:** Folders/collections use expand/collapse chevrons with standard tree indentation

### Tree Actions
- **D-03:** Create/rename/delete/duplicate actions via right-click context menu (no hover icon buttons)
- **D-04:** Context menu items: New Request, New Folder, separator, Rename, Duplicate, Delete
- **D-05:** Inline text edit for rename — clicking Rename turns the name into an editable input. Enter to confirm, Escape to cancel.
- **D-06:** Delete shows a confirmation modal. For collections/folders with children, the modal states how many items will be deleted.

### Workspace Storage
- **D-07:** Local workspaces stored in ~/Library/Application Support/dev.dispatch.app/workspaces/<id>/
- **D-08:** App auto-creates a "My Workspace" scratch workspace on first launch — user can immediately create collections and requests, supporting the 60-second goal
- **D-09:** When a user connects a GitHub repo, the scratch workspace is kept as-is. The repo becomes a second workspace. User switches between them via the workspace switcher.

### Slug Generation & Naming
- **D-10:** File/folder slugs derived from display names via slugify (lowercase, hyphens, strip special chars)
- **D-11:** Renaming a request or collection renames the file/folder on disk (git tracks renames natively)
- **D-12:** Slug collisions handled by appending numeric suffix: get-users.json, get-users-2.json, get-users-3.json

### Request Defaults
- **D-13:** New request defaults: name "New Request", method GET, empty URL (focused), no headers/params/body/auth
- **D-14:** If "New Request" already exists in the collection, name becomes "New Request (2)", "New Request (3)", etc.
- **D-15:** New collection defaults: name "New Collection", empty (no requests inside), created on disk immediately

### Duplicate Behavior
- **D-16:** Duplicated request named "Original Name (copy)", placed after the original in collection order
- **D-17:** Duplicate slug derived from the copy name (e.g., get-users-copy.json)

### Claude's Discretion
- Slug max length and character handling details
- Exact slugify implementation (library choice or hand-rolled)
- Tree expand/collapse animation timing
- Collection tree scroll behavior within the fixed-width sidebar

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Model Schema
- `SPECS.md` §Data Model — Complete JSON schema for request files, `_collection.json`, `dispatch.json`, environment files, and local secrets store. This is the authoritative schema definition.

### Project Context
- `.planning/PROJECT.md` — Core value, constraints, key decisions
- `.planning/REQUIREMENTS.md` — COLL-01 through COLL-04 requirement details

### Prior Phase
- `.planning/phases/01-foundation/01-CONTEXT.md` — Phase 1 decisions (sidebar layout, first-launch state, theme)

### Research (from Phase 1)
- `.planning/research/ARCHITECTURE.md` — Tauri IPC patterns, project structure recommendations
- `.planning/research/PITFALLS.md` — Known Tauri pitfalls

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/layout/Sidebar.tsx` — Existing sidebar shell, currently placeholder. Will host the collection tree.
- `src/components/layout/RequestEditor.tsx` — Existing request editor shell, will receive data from selected request.
- `src/stores/uiStore.ts` — Zustand store pattern established (splitRatio). New stores for collections/workspace state should follow same pattern.
- `src-tauri/src/commands/mod.rs` — Single `ping()` command. New Rust commands for CRUD operations follow this pattern with tauri-specta.

### Established Patterns
- Zustand for global UI state (create store, export hook)
- tauri-specta for typed IPC (Rust commands auto-generate TypeScript bindings)
- HeroUI v2 components with Tailwind v3 styling
- CSS grid for panel layout (gridTemplateRows in RightPanel)

### Integration Points
- Sidebar component: tree rendering goes here
- RequestEditor component: selected request data populates the editor
- TopBar: workspace switcher already has placeholder ("Connect GitHub" button)
- Rust command layer: new CRUD commands registered alongside ping()

</code_context>

<specifics>
## Specific Ideas

- Method badges should feel like Postman/Insomnia — compact, color-coded, instantly scannable
- The first-launch experience should feel like opening a fresh browser tab — "My Workspace" is there, ready to go
- Context menus should be native-feeling on macOS — standard right-click behavior
- Inline rename should match Finder/VS Code UX expectations

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-data-model*
*Context gathered: 2026-03-24*
