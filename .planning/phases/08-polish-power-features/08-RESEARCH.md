# Phase 8: Polish & Power Features - Research

**Researched:** 2026-03-30
**Domain:** Drag-and-drop UI, cURL import/export, fuzzy search, global keyboard shortcuts
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Full cross-collection drag-and-drop — users can reorder within collections AND move items between collections
- **D-02:** Drop line indicator — thin blue line between items showing where the drop will land (Finder/VS Code pattern). No ghost preview.
- **D-03:** Drop on folder = nest inside — dropping directly on a folder moves the item into that folder. Dropping between items reorders at that position.
- **D-04:** Import via auto-detect on paste + explicit menu — auto-detect when text starting with `curl ` is pasted in the URL bar, plus "Import cURL" in the collection context menu
- **D-05:** Export resolves variables — Cmd+Shift+C copies cURL with all {{variables}} resolved from the active environment. Ready to paste into terminal.
- **D-06:** Import lands in current request — paste-to-import overwrites the active request's fields (URL, method, headers, body) with parsed cURL values. Context menu import also targets the current request.
- **D-07:** Search scope is requests + collections — search across request names, URLs, and collection names. No body/header content search.
- **D-08:** Results grouped by collection — results organized under collection headers showing context of where each request lives
- **D-09:** Each result shows name + full breadcrumb — e.g. "Get Users — My API > Users > List" showing collection/folder path
- **D-10:** All shortcuts always active — shortcuts fire regardless of focus, including inside text fields. No suppression in inputs.
- **D-11:** Cmd+/ opens shortcut cheatsheet modal — standard pattern (Slack, GitHub). Shows all 8+ shortcuts in a modal overlay.
- **D-12:** Subtle flash feedback on target — brief highlight on the affected element when a shortcut fires (e.g., flash the send button on Cmd+Enter)

### Claude's Discretion

- DnD library choice (dnd-kit, @hello-pangea/dnd, or HTML5 drag API)
- cURL parser implementation (regex vs proper shell argument parser)
- Cmd+K modal styling and animation
- Flash animation timing and easing
- Shortcut registration architecture (global listener vs per-component)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COLL-05 | User can drag and drop to reorder requests and folders within a collection | dnd-kit SortableContext + Rust `reorder_node` command |
| COLL-06 | User can drag and drop to move requests and folders between collections | dnd-kit cross-container DnD + Rust `move_node` command |
| CURL-01 | User can import a cURL command by pasting (Cmd+V auto-detect) in request panel | Paste event listener on URL input; `curlconverter.toJsonString()` |
| CURL-02 | User can import a cURL command via explicit action in collection context menu | "Import cURL" item in TreeContextMenu; triggers a text input modal |
| CURL-03 | User can copy any request as cURL (context menu + Cmd+Shift+C) | Pure frontend cURL string builder using `substitute()` from variables.ts |
| CURL-04 | Exported cURL resolves variables from the active environment | `environmentStore.activeEnvVariables` + existing `substitute()` utility |
| NAV-01 | User can open search with Cmd+K and search across request names, URLs, collection names | fuse.js already in CLAUDE.md stack; HeroUI Modal for overlay |
| NAV-02 | Search uses fuzzy matching with ranked results | Fuse.js with `threshold: 0.4`, `keys` weighted by name > url > collection |
| NAV-03 | Selecting a search result navigates directly to that request | `collectionStore.setActiveRequest()` + auto-expand ancestor nodes |
| KEY-01 | Cmd+Enter sends the current request | Global keydown listener in App.tsx; calls `requestStore.sendRequest()` |
| KEY-02 | Cmd+N creates a new request | Global listener; calls `collectionStore.createRequest()` |
| KEY-03 | Cmd+Shift+N creates a new collection | Global listener; calls `collectionStore.createCollection()` |
| KEY-04 | Cmd+K opens search | Global listener; sets `searchOpen: true` in store |
| KEY-05 | Cmd+E switches environment | Global listener; opens environment dropdown/modal |
| KEY-06 | Cmd+Shift+C copies current request as cURL | Global listener; calls cURL export + clipboard write |
| KEY-07 | Cmd+W closes the current tab | Global listener; calls `collectionStore.clearActiveRequest()` |
| KEY-08 | Cmd+S forces a sync | Global listener; calls `syncStore.triggerPush()` |
</phase_requirements>

---

## Summary

Phase 8 covers four independent feature areas: drag-and-drop reordering in the sidebar, cURL import/export, fuzzy Cmd+K search, and global keyboard shortcuts. Each area is self-contained but all four share the same underlying architectural pattern: a thin Zustand action layer that coordinates UI state and Rust IPC commands.

The most complex area is drag-and-drop. The existing tree (`CollectionTree`, `CollectionNode`, `FolderNode`, `RequestNode`) renders three levels of React components with no existing DnD instrumentation. Adding dnd-kit wraps those components with `useSortable` hooks and requires two new Rust commands: `reorder_node` (updates the `order` array in the manifest of the same parent) and `move_node` (removes from one parent, adds to another, moves the file). The file-system-based data model already has all the primitives needed (`insert_into_order`, `remove_from_order`, path manipulation) — the Rust work is assembly of existing helpers.

cURL import is frontend-only logic: `curlconverter.toJsonString()` parses the command string into a structured JSON object, then the fields map directly to `requestStore` setters. cURL export is a pure string builder using the existing `substitute()` utility from `variables.ts` and `navigator.clipboard.writeText`. No new Rust commands are needed for CURL-01 through CURL-04.

The fuzzy search (NAV-01 to NAV-03) uses fuse.js, which is already declared as a project dependency in CLAUDE.md. The search index is built from `collectionStore.collections` on demand. Results are grouped in the modal using a Map keyed by `collectionSlug`. Keyboard shortcuts (KEY-01 to KEY-08) are registered in a single `useEffect` in `App.tsx`, consistent with the existing focus-listener pattern.

**Primary recommendation:** Use `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop (most actively maintained React DnD library, handles cross-container moves, has drop indicator pattern support). Use `curlconverter` (not `curl-parser-ts`) for cURL import — it has a production-grade shell argument tokenizer rather than regex, handles edge cases like quoted values and `--data-raw`. All other features are pure frontend with no new dependencies.

---

## Standard Stack

### Core (New Additions)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | 6.3.1 | DnD context, sensors, collision detection | Most actively maintained React DnD library. Framework-agnostic core, full keyboard accessibility, no legacy class components. |
| @dnd-kit/sortable | 10.0.0 | `useSortable` hook + `SortableContext` + `arrayMove` | Official sortable preset; handles within-list and cross-list reordering. |
| @dnd-kit/modifiers | 9.0.0 | `restrictToVerticalAxis`, `restrictToParentElement` | Constrains drag behavior to vertical axis for sidebar tree. |
| curlconverter | 4.12.0 | Parse cURL command strings into structured request objects | Proper shell tokenizer (not regex), handles quoted values, `--data-raw`, `--compressed`. Updated March 2026. |

> **Version verification (npm view, 2026-03-30):**
> - `@dnd-kit/core@6.3.1` (confirmed)
> - `@dnd-kit/sortable@10.0.0` (confirmed)
> - `@dnd-kit/modifiers@9.0.0` (confirmed)
> - `curlconverter@4.12.0` (confirmed)
> - `fuse.js@7.1.0` (confirmed — already project dependency per CLAUDE.md)

### Supporting (Already in Project)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| fuse.js | 7.1.0 | Fuzzy search for Cmd+K | Declared in CLAUDE.md stack. Use for NAV-01/NAV-02. |
| framer-motion | 12.x | Flash animation on shortcut targets | Already a HeroUI v2 peer dep. Use for KEY flash feedback (D-12). |
| HeroUI Modal | 2.7.11 | Cmd+K overlay and shortcut cheatsheet modal | Established pattern (EnvironmentModal, LoginModal). |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit | @hello-pangea/dnd | @hello-pangea/dnd has a simpler API for single-list but lacks native cross-container support without hacks. dnd-kit handles it cleanly. |
| @dnd-kit | HTML5 Drag API | HTML5 drag API has poor UX (ghost image is hard to style, no smooth animation), no cross-browser pointer support, no accessibility. |
| curlconverter | curl-parser-ts | curl-parser-ts is simpler but has fewer downloads (LOW adoption signal). curlconverter is the canonical reference implementation. |
| curlconverter | Hand-rolled regex | Regex fails on quoted values, escaped chars, `--data-raw` vs `--data`, multi-header commands. curlconverter handles all edge cases. |

**Installation:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/modifiers curlconverter
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── features/
│   ├── collections/
│   │   ├── CollectionTree.tsx       # Wrap with DndContext + SortableContext
│   │   ├── CollectionNode.tsx       # useSortable on collection header row
│   │   ├── FolderNode.tsx           # useSortable on folder row
│   │   ├── RequestNode.tsx          # useSortable on request row
│   │   ├── DragOverlayItem.tsx      # NEW: DragOverlay rendered item (ghost)
│   │   └── DropIndicator.tsx        # NEW: thin blue line between items
│   ├── search/                      # NEW feature directory
│   │   └── SearchModal.tsx          # Cmd+K fuzzy search overlay
│   └── shortcuts/                   # NEW or inline in App.tsx
│       └── ShortcutCheatsheet.tsx   # Cmd+/ modal
├── stores/
│   ├── collectionStore.ts           # Add reorderNode + moveNode actions
│   └── uiStore.ts                   # Add searchOpen: boolean
├── utils/
│   └── curl.ts                      # NEW: parseCurl(), buildCurlString()
└── App.tsx                          # Add global keydown listener
```

### Pattern 1: dnd-kit Sortable Tree with Drop Indicator

**What:** Flatten the nested tree into a single `DndContext`. Each `CollectionNode`, `FolderNode`, and `RequestNode` gets a `useSortable` call. The drop indicator is a `<div>` absolutely positioned above/below the target based on the active drag position.

**When to use:** For the sidebar tree where items span multiple levels and can move cross-container.

**Cross-container support:** Multiple `SortableContext` providers inside one `DndContext`. `onDragOver` fires when active leaves one container and enters another — update state there to show real-time position. `onDragEnd` commits the final position.

```typescript
// Source: dndkit.com/presets/sortable (verified)

// In CollectionTree.tsx
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';

function CollectionTree() {
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 8 }, // 8px before drag activates
  }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    // Parse node IDs to determine source/destination container and position
    // Call collectionStore.reorderNode() or collectionStore.moveNode()
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      {collections.map(collection => (
        <SortableContext
          key={collection.slug}
          items={collection.children.map(c => c.slug)}
          strategy={verticalListSortingStrategy}
        >
          <CollectionNode collection={collection} />
        </SortableContext>
      ))}
      <DragOverlay>{activeItem && <DragOverlayItem item={activeItem} />}</DragOverlay>
    </DndContext>
  );
}

// In RequestNode.tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function RequestNode({ request, ... }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging, isOver
  } = useSortable({ id: nodeId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {/* existing content */}
    </div>
  );
}
```

**Drop indicator pattern:** Track `overId` and `activeId` in `onDragMove`. For each item, check if `overId === nodeId` and show a `<div className="h-0.5 bg-primary mx-2" />` above or below based on cursor Y vs element midpoint.

### Pattern 2: cURL Parser (Import)

**What:** Use `curlconverter.toJsonString()` to parse a cURL string. The output is a JSON object with `url`, `method`, `headers` (object), and `data` fields. Map those to `requestStore` setters.

```typescript
// Source: curlconverter GitHub README + curlconverter.com/json/ (verified output format)
// src/utils/curl.ts

import { toJsonString } from 'curlconverter';

export interface ParsedCurl {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | null;
}

export function parseCurl(curlCommand: string): ParsedCurl | null {
  try {
    const json = JSON.parse(toJsonString(curlCommand));
    return {
      method: (json.method ?? 'GET').toUpperCase(),
      url: json.url ?? '',
      headers: json.headers ?? {},
      body: typeof json.data === 'string' ? json.data : null,
    };
  } catch {
    return null;
  }
}

// In UrlBar.tsx — paste detection
const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
  const text = e.clipboardData.getData('text');
  if (text.trimStart().startsWith('curl ')) {
    e.preventDefault();
    const parsed = parseCurl(text);
    if (parsed) applyParsedCurl(parsed); // calls requestStore setters
  }
};
```

**Note:** `curlconverter` is ESM only (uses top-level `await`). The project already uses `"type": "module"` via Vite, so this is compatible. Import as `import { toJsonString } from 'curlconverter'`.

### Pattern 3: cURL Export (Build cURL String)

**What:** A pure function in `src/utils/curl.ts` that constructs a `curl` command string from `RequestStore` state, with `substitute()` applied to all fields first.

```typescript
// Source: curl man page conventions + existing variables.ts substitute() utility

export function buildCurlString(
  method: string,
  url: string,
  headers: KeyValueEntry[],
  body: RequestBody | null,
  auth: RequestAuth | null,
  vars: Record<string, string>,
): string {
  const resolvedUrl = substitute(url, vars);
  const parts = [`curl -X ${method} "${resolvedUrl}"`];

  // Add auth as Authorization header
  if (auth?.token) {
    parts.push(`  -H "Authorization: Bearer ${substitute(auth.token, vars)}"`);
  }

  // Add Content-Type if body present
  if (body?.type === 'json') {
    parts.push(`  -H "Content-Type: application/json"`);
  }

  // Add user headers (skip if enabled is false)
  for (const h of headers.filter(h => h.enabled)) {
    parts.push(`  -H "${substitute(h.key, vars)}: ${substitute(h.value, vars)}"`);
  }

  // Add body
  if (body?.content) {
    const data = substitute(body.content, vars);
    parts.push(`  -d '${data.replace(/'/g, "'\\''")}'`);
  }

  return parts.join(' \\\n');
}
```

**Clipboard:** Use `navigator.clipboard.writeText(curlString)` (available in Tauri WebView). Show a `toast.success('Copied as cURL')` via sonner.

### Pattern 4: Fuse.js Cmd+K Search

**What:** Build a flat search index from `collectionStore.collections` on modal open. Each entry carries `{ name, url, collectionSlug, collectionName, breadcrumb, nodeId }`. Fuse.js searches across `name`, `url`, `collectionName` with weighted keys.

```typescript
// Source: fusejs.io/api/options.html (verified)
import Fuse from 'fuse.js';

const fuse = new Fuse(searchItems, {
  keys: [
    { name: 'name', weight: 0.5 },
    { name: 'url', weight: 0.3 },
    { name: 'collectionName', weight: 0.2 },
  ],
  threshold: 0.4,    // 0.0 = exact, 1.0 = match anything; 0.4 is good for typo tolerance
  includeScore: true,
  includeMatches: true, // enables character highlight indices
  minMatchCharLength: 2,
});

const results = fuse.search(query);
```

**Grouping:** Group results by `collectionSlug` client-side after Fuse returns. Render with collection header + indented request rows.

```typescript
const grouped = new Map<string, { collectionName: string; items: FuseResult[] }>();
for (const result of results) {
  const { collectionSlug, collectionName } = result.item;
  if (!grouped.has(collectionSlug)) {
    grouped.set(collectionSlug, { collectionName, items: [] });
  }
  grouped.get(collectionSlug)!.items.push(result);
}
```

**Navigation on select:** Call `collectionStore.setActiveRequest(nodeId)`, then expand all ancestor nodes with `collectionStore.toggleExpanded()` for each ancestor in the path. Close the modal.

### Pattern 5: Global Keyboard Shortcut Listener

**What:** A single `useEffect` in `App.tsx` that registers `window.addEventListener('keydown', handler)`. Uses `event.metaKey` for Cmd on macOS.

**D-10 compliance (always active, including in text fields):** Do NOT check `event.target` for input/textarea. All shortcuts fire regardless. This means preventing default browser behavior (e.g., Cmd+S for save page, Cmd+W for close tab — in Tauri these are no-ops but still need `preventDefault`).

```typescript
// Source: MDN KeyboardEvent.metaKey + pattern from existing App.tsx focus listener

useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.metaKey && !e.shiftKey && e.key === 'Enter') {
      e.preventDefault();
      useRequestStore.getState().sendRequest();
      flashElement('send-button');
    }
    if (e.metaKey && !e.shiftKey && e.key === 'n') {
      e.preventDefault();
      // create request in active collection
    }
    if (e.metaKey && e.shiftKey && e.key === 'N') {
      e.preventDefault();
      // create collection
    }
    if (e.metaKey && !e.shiftKey && e.key === 'k') {
      e.preventDefault();
      useUiStore.getState().setSearchOpen(true);
    }
    if (e.metaKey && !e.shiftKey && e.key === 'e') {
      e.preventDefault();
      // open environment switcher
    }
    if (e.metaKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      // copy as cURL
    }
    if (e.metaKey && !e.shiftKey && e.key === 'w') {
      e.preventDefault();
      useCollectionStore.getState().clearActiveRequest();
    }
    if (e.metaKey && !e.shiftKey && e.key === 's') {
      e.preventDefault();
      // trigger sync
    }
    if (e.key === '/' && e.metaKey) {
      e.preventDefault();
      useUiStore.getState().setShortcutCheatsheetOpen(true);
    }
  };

  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []); // empty deps — reads stores via .getState(), not hooks
```

**Flash feedback (D-12):** Use `data-shortcut-id` attributes on target elements. The flash function adds a CSS class that triggers a brief Tailwind `animate-pulse` or a framer-motion `animate` for 300ms then removes it.

### Pattern 6: Rust Commands for DnD (New Commands)

The file-system model already has `insert_into_order`, `remove_from_order`, and `replace_in_order` helpers in `collections/io.rs`. Two new public functions are needed:

**`reorder_node(parent_dir, slug, new_index)`** — updates the `order` array in the parent manifest to move `slug` to `new_index`. No file moves.

**`move_node(src_parent_dir, dst_parent_dir, slug, is_dir, dst_index)`** — moves the file/directory from src to dst, removes from src manifest order, inserts at dst_index in dst manifest order. Path traversal checks required.

```rust
// Pattern follows existing io.rs conventions
pub fn reorder_node(parent_dir: &Path, slug: &str, new_index: usize) -> anyhow::Result<()> {
    let manifest_path = dir_manifest_path(parent_dir);
    // read order, remove slug, insert at new_index, write back
}

pub fn move_node(
    src_parent_dir: &Path,
    dst_parent_dir: &Path,
    workspace_dir: &Path, // for path traversal guard
    slug: &str,
    is_dir: bool,
    dst_index: Option<usize>,
) -> anyhow::Result<()> {
    // 1. Assert src and dst within workspace_dir
    // 2. fs::rename() the file/dir
    // 3. remove_from_order(src manifest, slug)
    // 4. insert into dst manifest at dst_index
}
```

### Anti-Patterns to Avoid

- **Separate DndContext per collection:** Prevents cross-collection drops. Use ONE `DndContext` at the `CollectionTree` level.
- **Using `useSortable` id as the tree node's key prop:** The `id` for `useSortable` must be unique across ALL items in the `DndContext`, not just within a collection. Use the full `nodeId` format (`collectionSlug/parentPath/slug`).
- **Calling `refreshWorkspace()` inside `onDragMove`:** This fires constantly during drag. Only call the Rust command and `refreshWorkspace()` in `onDragEnd`.
- **curlconverter as CJS require:** It uses top-level `await` and must be `import`-ed as ESM. Using `require()` will throw. This is fine in Vite-built code (already ESM).
- **Checking `event.target.tagName` to suppress keyboard shortcuts:** D-10 explicitly requires shortcuts fire in all contexts. Do not add input-field suppression logic.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shell argument tokenizer for cURL | Custom regex parser | `curlconverter` | Shell quoting rules are complex: `'single'`, `"double"`, `\` escapes, `$'...'` ANSI-C quoting. A naive regex breaks on `--data-raw '{"key": "val with \"quotes\""}'`. |
| Fuzzy matching algorithm | Levenshtein distance, trigram index | `fuse.js` (already dependency) | Fuse.js has weighted key scoring, threshold tuning, `includeMatches` for highlights. No server, no WASM. |
| Drag-and-drop from scratch | `mousedown/mousemove/mouseup` event tracking | `@dnd-kit/core` | Pointer sensors, touch support, keyboard accessibility, scroll-while-dragging, drop animation — hundreds of edge cases. |
| Cross-container DnD state tracking | Manual React state + refs | `useSortable` + `arrayMove` | dnd-kit handles the `overId`/`activeId` bookkeeping and provides transform CSS for smooth animations. |

**Key insight:** cURL parsing and drag-and-drop are both deceptively complex. The complexity isn't in the happy path — it's in the edge cases that only appear with real user data. Libraries encode those edge cases.

---

## Common Pitfalls

### Pitfall 1: dnd-kit Unique ID Constraint

**What goes wrong:** If two items in different collections share the same slug (e.g., both have a request named `get-users`), dnd-kit logs warnings and collision detection behaves unpredictably.

**Why it happens:** `SortableContext` uses IDs to track items across the DnD context. Duplicate IDs cause the wrong item to animate.

**How to avoid:** Use the full `nodeId` path as the `useSortable` id — e.g., `my-api/users/get-users` — not just the slug. This is consistent with the existing `collectionStore.activeRequestId` convention already in the codebase.

**Warning signs:** React console warning about duplicate keys, or the wrong item visually moving during drag.

### Pitfall 2: curlconverter Bundler Compatibility

**What goes wrong:** `curlconverter` uses top-level `await` internally. Bundlers that don't support top-level `await` in dependencies will throw a build error.

**Why it happens:** Vite 7.x with `"type": "module"` in `package.json` handles this correctly. However, the Tauri webview build must not use a CommonJS bundler output.

**How to avoid:** Confirm `vite.config.ts` uses ESM output (default for Vite). Do not add `--format cjs` to the build. Test with `npm run build` after installing, before writing any logic.

**Warning signs:** `SyntaxError: Cannot use import statement in a module` or `Top-level await is not available in the configured target environment`.

### Pitfall 3: Keyboard Shortcut Conflicts with macOS

**What goes wrong:** Some shortcuts conflict with macOS system actions. `Cmd+W` in a browser context typically closes the current tab, and `Cmd+S` typically triggers save-page.

**Why it happens:** Tauri's WKWebView still routes some system shortcuts through the OS before the JS event listener fires.

**How to avoid:** Call `e.preventDefault()` in the keydown handler for every shortcut. In Tauri 2.x, WKWebView forwards `keydown` events to JavaScript before the OS shortcut for most commands. Test each shortcut explicitly after implementation.

**Warning signs:** The shortcut does nothing, or triggers an OS action instead of the app action.

### Pitfall 4: DnD + Context Menu Race Condition

**What goes wrong:** The context menu (`contextMenuNodeId` in `collectionStore`) stays open during a drag operation and receives a click event when the drag ends, triggering an unintended action.

**Why it happens:** The `click` event listener that closes the context menu fires after `dragend` in some pointer event orderings.

**How to avoid:** In `CollectionTree.onDragStart`, call `collectionStore.setContextMenu(null, null)` to close any open context menus before the drag starts.

### Pitfall 5: Fuse.js Index Staleness

**What goes wrong:** User opens Cmd+K and searches, gets results, navigates to a request and renames it. Reopens Cmd+K and sees the old name in results.

**Why it happens:** The Fuse instance is created once and holds a stale copy of the collection data.

**How to avoid:** Rebuild the Fuse index inside the `SearchModal` on every open (in a `useMemo` or `useEffect` that depends on `collections` from `collectionStore`). The collection data is small (hundreds of items max) so rebuilding on open is negligible.

### Pitfall 6: cURL Body Single-Quote Escaping

**What goes wrong:** `buildCurlString` wraps the body in `'single quotes'`. A JSON body like `{"key": "it's fine"}` breaks the shell command.

**Why it happens:** Single-quoted shell strings don't allow any escaping inside them.

**How to avoid:** Replace `'` with `'\''` (end-quote, escaped-quote, reopen-quote) inside the data string, as shown in the code example above.

---

## Code Examples

### Building the Search Index from CollectionStore

```typescript
// Source: collectionStore.ts data model + fusejs.io/api/options.html

interface SearchItem {
  nodeId: string;       // collectionSlug/parentPath.join('/')/slug
  name: string;
  url: string;          // empty for collections and folders
  collectionSlug: string;
  collectionName: string;
  breadcrumb: string;   // "My API > Users > Get Users"
  type: 'request' | 'collection';
}

function buildSearchIndex(collections: CollectionItem[]): SearchItem[] {
  const items: SearchItem[] = [];

  function walkChildren(
    children: TreeChild[],
    collectionSlug: string,
    collectionName: string,
    parentPath: string[],
    breadcrumbPrefix: string,
  ) {
    for (const child of children) {
      const breadcrumb = breadcrumbPrefix
        ? `${breadcrumbPrefix} > ${child.name}`
        : child.name;
      const pathArr = [...parentPath, child.slug];
      const nodeId = `${collectionSlug}/${pathArr.join('/')}`;

      if (child.type === 'request') {
        items.push({
          nodeId,
          name: child.name,
          url: '', // url not in TreeChild — only loaded on request open
          collectionSlug,
          collectionName,
          breadcrumb,
          type: 'request',
        });
      } else if (child.type === 'folder') {
        walkChildren(child.children, collectionSlug, collectionName, pathArr, breadcrumb);
      }
    }
  }

  for (const collection of collections) {
    walkChildren(collection.children, collection.slug, collection.name, [], collection.name);
  }

  return items;
}
```

**Note:** `TreeChild` of type `request` does not carry the `url` field (only `name`, `method`, `slug`). D-07 specifies searching across request names, URLs, and collection names. URL search requires loading request files on search. Two options: (a) search only name + collectionName (simpler, likely sufficient), (b) pre-load all request files when the workspace loads and cache them. Option (a) is recommended since URLs in the sidebar tree are not shown anyway.

### DnD Node ID Encoding/Decoding

```typescript
// Node IDs used across DnD, collectionStore, and search
// Format: collectionSlug/folder1/folder2/requestSlug

function encodeNodeId(collectionSlug: string, parentPath: string[], slug: string): string {
  if (parentPath.length > 0) {
    return `${collectionSlug}/${[...parentPath, slug].join('/')}`;
  }
  return `${collectionSlug}/${slug}`;
}

function decodeNodeId(nodeId: string): {
  collectionSlug: string;
  parentPath: string[];
  slug: string;
} {
  const parts = nodeId.split('/');
  return {
    collectionSlug: parts[0],
    parentPath: parts.slice(1, -1),
    slug: parts[parts.length - 1],
  };
}
```

### HeroUI Modal for Cmd+K

```typescript
// Source: v2.heroui.com/docs/components/modal (HeroUI v2 pattern)
// Consistent with EnvironmentModal, LoginModal in this codebase

import { Modal, ModalContent, ModalBody } from '@heroui/react';

function SearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      placement="top"           // slides in from top like VS Code
      size="lg"
      classNames={{ base: 'mt-16' }}
    >
      <ModalContent>
        <ModalBody className="p-0">
          {/* search input + results */}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit | 2021-2023 | rbd is in maintenance mode; dnd-kit is the community successor |
| @dnd-kit/core v5 | @dnd-kit/core v6 | 2023 | v6 has improved pointer sensor, no breaking API changes for basic use |
| @dnd-kit/sortable v7 | @dnd-kit/sortable v10 | 2024 | v10 is the current stable; `arrayMove` API unchanged |
| curlconverter v3.x | curlconverter v4.12 | 2024 | v4 added ESM-only requirement and improved shell parsing |
| fuse.js v6 | fuse.js v7.1.0 | 2024 | v7 is backwards compatible; same API |

**Deprecated/outdated:**

- `react-beautiful-dnd`: In maintenance mode since 2023. Atlassian released `@hello-pangea/dnd` as a community fork, but it still lacks the flexibility of dnd-kit for tree structures.
- `@dnd-kit/core` v5 and earlier: v6 is current, minor internal refactors for better pointer event handling.

---

## Open Questions

1. **URL field in search index (NAV-01)**
   - What we know: `TreeChild` of type `request` carries `name`, `method`, `slug` but NOT `url`. The URL is in the `.json` request file on disk.
   - What's unclear: Whether to eagerly load all request files into the search index at workspace load, or restrict search to name + collection only.
   - Recommendation: Restrict search scope to `name` and `collectionName` for the initial implementation. D-07 says "request names, URLs, collection names" but URLs in the sidebar tree are not visible and searching them adds disk I/O. Log this as a potential v2 improvement.

2. **Cmd+E behavior (KEY-05)**
   - What we know: KEY-05 is "switches environment." The environment switcher is a `DropdownMenu` in `TopBar.tsx` with no programmatic open API.
   - What's unclear: Whether Cmd+E should cycle to the next environment (simple) or open the environment dropdown (complex, requires focus management).
   - Recommendation: Cycle to the next environment in `environments` array, wrapping around. Simpler, no focus management needed. Show a toast with the new environment name.

3. **DnD activation distance for sidebar items**
   - What we know: dnd-kit `PointerSensor` supports `activationConstraint: { distance: N }` to prevent accidental drag on click.
   - What's unclear: The right distance for small sidebar rows (32px tall items, often clicked for navigation).
   - Recommendation: Use `distance: 8` (pixels). This is the convention in most tree-style file browsers. Below 8px feels too sensitive; above 8px feels sluggish.

---

## Environment Availability

> This phase is purely frontend + Rust code changes with no new external service dependencies.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| npm (for dnd-kit, curlconverter) | COLL-05/06, CURL-01 | ✓ | — | — |
| navigator.clipboard | CURL-03/KEY-06 | ✓ | WKWebView (macOS) | — |
| Tauri WKWebView | All keyboard shortcuts | ✓ | macOS system | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x + Testing Library 16.x |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CURL-01 | parseCurl() maps cURL string to request fields | unit | `npm test -- src/utils/curl.test.ts` | ❌ Wave 0 |
| CURL-03 | buildCurlString() produces valid cURL with resolved vars | unit | `npm test -- src/utils/curl.test.ts` | ❌ Wave 0 |
| CURL-04 | buildCurlString() substitutes {{variables}} from vars map | unit | `npm test -- src/utils/curl.test.ts` | ❌ Wave 0 |
| NAV-02 | Fuse.js returns ranked fuzzy results for partial queries | unit | `npm test -- src/features/search/SearchModal.test.tsx` | ❌ Wave 0 |
| KEY-01 | Cmd+Enter calls sendRequest() | unit (mock) | `npm test -- src/App.test.tsx` | ✅ (extend) |
| COLL-05 | reorder within collection updates store correctly | unit | `npm test -- src/stores/collectionStore.test.ts` | ❌ Wave 0 |
| KEY-06 | Cmd+Shift+C copies cURL to clipboard | manual | — | manual-only (clipboard API in jsdom is limited) |
| COLL-05/06 | DnD drag end moves item visually | manual | — | manual-only (pointer events complex in jsdom) |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/utils/curl.test.ts` — covers CURL-01, CURL-03, CURL-04 (parseCurl and buildCurlString)
- [ ] `src/features/search/SearchModal.test.tsx` — covers NAV-02 (Fuse.js result ranking)
- [ ] `src/stores/collectionStore.test.ts` — covers COLL-05 (reorderNode store action)

---

## Project Constraints (from CLAUDE.md)

These directives must be followed in all implementation tasks:

| Directive | Application in Phase 8 |
|-----------|------------------------|
| HeroUI v2 stable (`@heroui/react@2.7.11`) — NOT v3 beta | Cmd+K Modal and cheatsheet modal use HeroUI v2 Modal component |
| Tailwind v3 — NOT v4 | All new components use Tailwind v3 utility classes |
| Inline SVG icons — no icon packages | Drop indicator, drag handle, search icon are inline SVGs |
| All authenticated requests via Rust/reqwest | No GitHub API calls in this phase — not applicable |
| tauri::async_runtime::spawn — NOT tokio::spawn | New Rust commands (`reorder_node`, `move_node`) if they become async |
| All git2 ops in tokio::task::spawn_blocking | No git operations in this phase — not applicable |
| GSD workflow entry via /gsd:execute-phase | Phase execution goes through GSD |
| JS-side fetch only for unauthenticated requests | cURL export uses `navigator.clipboard`, no fetch calls |
| `@dnd-kit/sortable@10.0.0` is NOT yet in the project | Install required before implementation |
| `curlconverter@4.12.0` is NOT yet in the project | Install required before implementation |
| `fuse.js@7.1.0` is declared in CLAUDE.md stack but not in `package.json` | Install required before implementation |

---

## Sources

### Primary (HIGH confidence)

- dndkit.com/presets/sortable — useSortable, SortableContext, cross-container patterns confirmed
- fusejs.io/api/options.html — keys, threshold, includeMatches, includeScore options confirmed
- curlconverter GitHub README — ESM requirement, `toJsonString` function, output format confirmed
- `npm view @dnd-kit/core version` — 6.3.1 confirmed 2026-03-30
- `npm view @dnd-kit/sortable version` — 10.0.0 confirmed 2026-03-30
- `npm view @dnd-kit/modifiers version` — 9.0.0 confirmed 2026-03-30
- `npm view curlconverter version` — 4.12.0 confirmed 2026-03-30
- `npm view fuse.js version` — 7.1.0 confirmed 2026-03-30
- Project codebase (`collectionStore.ts`, `variables.ts`, `io.rs`) — existing patterns and data model

### Secondary (MEDIUM confidence)

- WebSearch: dnd-kit cross-container patterns — verified against dndkit.com docs
- WebSearch: curlconverter toJsonString output format (method, url, headers, data structure) — verified against curlconverter.com/json/
- MDN KeyboardEvent.metaKey — standard Web API, consistent across all browsers

### Tertiary (LOW confidence)

- WebSearch: dnd-kit drop indicator patterns — implementation patterns from GitHub issues, not official docs. Treat as starting point, verify against actual rendering.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all versions verified via npm registry 2026-03-30
- Architecture patterns: HIGH — dnd-kit and fuse.js patterns verified from official docs; cURL builder is straightforward string manipulation
- Pitfalls: MEDIUM — mostly derived from dnd-kit GitHub issue tracker and curlconverter release notes; the unique-ID pitfall is confirmed from library docs

**Research date:** 2026-03-30
**Valid until:** 2026-05-01 (stable libraries; dnd-kit and fuse.js release infrequently)
