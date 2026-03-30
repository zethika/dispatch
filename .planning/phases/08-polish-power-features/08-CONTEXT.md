# Phase 8: Polish & Power Features - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers fast navigation and power-user workflows: drag-and-drop reordering in the sidebar, cURL import/export, fuzzy Cmd+K search, and global keyboard shortcuts. These are the final features before v1.0.

</domain>

<decisions>
## Implementation Decisions

### Drag-and-Drop
- **D-01:** Full cross-collection drag-and-drop — users can reorder within collections AND move items between collections
- **D-02:** Drop line indicator — thin blue line between items showing where the drop will land (Finder/VS Code pattern). No ghost preview.
- **D-03:** Drop on folder = nest inside — dropping directly on a folder moves the item into that folder. Dropping between items reorders at that position.

### cURL Import/Export
- **D-04:** Import via auto-detect on paste + explicit menu — auto-detect when text starting with `curl ` is pasted in the URL bar, plus "Import cURL" in the collection context menu
- **D-05:** Export resolves variables — Cmd+Shift+C copies cURL with all {{variables}} resolved from the active environment. Ready to paste into terminal.
- **D-06:** Import lands in current request — paste-to-import overwrites the active request's fields (URL, method, headers, body) with parsed cURL values. Context menu import also targets the current request.

### Cmd+K Search
- **D-07:** Search scope is requests + collections — search across request names, URLs, and collection names. No body/header content search.
- **D-08:** Results grouped by collection — results organized under collection headers showing context of where each request lives
- **D-09:** Each result shows name + full breadcrumb — e.g. "Get Users — My API > Users > List" showing collection/folder path

### Keyboard Shortcuts
- **D-10:** All shortcuts always active — shortcuts fire regardless of focus, including inside text fields. No suppression in inputs.
- **D-11:** Cmd+/ opens shortcut cheatsheet modal — standard pattern (Slack, GitHub). Shows all 8+ shortcuts in a modal overlay.
- **D-12:** Subtle flash feedback on target — brief highlight on the affected element when a shortcut fires (e.g., flash the send button on Cmd+Enter)

### Claude's Discretion
- DnD library choice (dnd-kit, @hello-pangea/dnd, or HTML5 drag API)
- cURL parser implementation (regex vs proper shell argument parser)
- Cmd+K modal styling and animation
- Flash animation timing and easing
- Shortcut registration architecture (global listener vs per-component)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Sidebar.tsx` — existing collection/folder/request tree, target for DnD integration
- `RequestEditor.tsx` — target surface for cURL paste detection
- `fuse.js` — already a project dependency (CLAUDE.md stack), use for Cmd+K fuzzy search
- `environmentStore.ts` — has variable resolution logic needed for cURL export
- `collectionStore.ts` — has collection/folder/request data model for search indexing

### Established Patterns
- HeroUI v2 Modal for Cmd+K search overlay and shortcut cheatsheet
- Zustand stores for global state (search results, active shortcuts)
- Tauri event system for cross-component communication
- Inline SVG icons (project convention — no icon packages)

### Integration Points
- `Sidebar.tsx` — DnD wraps existing tree items
- `RequestEditor.tsx` — cURL paste listener on URL input
- `TopBar.tsx` — Cmd+K trigger button
- `App.tsx` — global keyboard shortcut listener (focus-pull listener pattern already exists)
- `collectionStore.ts` — reorder/move operations need new Rust commands

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-polish-power-features*
*Context gathered: 2026-03-30*
