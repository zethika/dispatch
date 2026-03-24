# Phase 2: Data Model - Research

**Researched:** 2026-03-24
**Domain:** File-per-request JSON schema, Rust CRUD commands, collection tree UI (Tauri + React)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Collection Tree Display**
- D-01: Each request shows a colored HTTP method badge (GET=green, POST=blue, PUT=orange, DELETE=red) to the left of the request name
- D-02: Folders/collections use expand/collapse chevrons with standard tree indentation

**Tree Actions**
- D-03: Create/rename/delete/duplicate actions via right-click context menu (no hover icon buttons)
- D-04: Context menu items: New Request, New Folder, separator, Rename, Duplicate, Delete
- D-05: Inline text edit for rename — clicking Rename turns the name into an editable input. Enter to confirm, Escape to cancel.
- D-06: Delete shows a confirmation modal. For collections/folders with children, the modal states how many items will be deleted.

**Workspace Storage**
- D-07: Local workspaces stored in ~/Library/Application Support/dev.dispatch.app/workspaces/<id>/
- D-08: App auto-creates a "My Workspace" scratch workspace on first launch — user can immediately create collections and requests, supporting the 60-second goal
- D-09: When a user connects a GitHub repo, the scratch workspace is kept as-is. The repo becomes a second workspace. User switches between them via the workspace switcher.

**Slug Generation & Naming**
- D-10: File/folder slugs derived from display names via slugify (lowercase, hyphens, strip special chars)
- D-11: Renaming a request or collection renames the file/folder on disk (git tracks renames natively)
- D-12: Slug collisions handled by appending numeric suffix: get-users.json, get-users-2.json, get-users-3.json

**Request Defaults**
- D-13: New request defaults: name "New Request", method GET, empty URL (focused), no headers/params/body/auth
- D-14: If "New Request" already exists in the collection, name becomes "New Request (2)", "New Request (3)", etc.
- D-15: New collection defaults: name "New Collection", empty (no requests inside), created on disk immediately

**Duplicate Behavior**
- D-16: Duplicated request named "Original Name (copy)", placed after the original in collection order
- D-17: Duplicate slug derived from the copy name (e.g., get-users-copy.json)

### Claude's Discretion
- Slug max length and character handling details
- Exact slugify implementation (library choice or hand-rolled)
- Tree expand/collapse animation timing
- Collection tree scroll behavior within the fixed-width sidebar

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COLL-01 | User sees a sidebar tree of workspaces > collections > folders > requests | Custom React tree component; collectionStore drives rendering; Sidebar.tsx is the host component |
| COLL-02 | User can create, rename, and delete collections | Rust CRUD commands + `_collection.json` manifest + slug-safe directory creation/rename/deletion |
| COLL-03 | User can create, rename, and delete subfolders within collections (arbitrary nesting) | Same Rust CRUD pattern as collections; recursive directory walk for read; recursive delete for removal |
| COLL-04 | User can create, rename, delete, and duplicate requests | Per-request JSON file create/rename/delete/copy; Rust commands operate on individual files |
</phase_requirements>

---

## Summary

Phase 2 builds the data layer that all subsequent phases depend on. The work divides into three distinct areas: (1) the file-system schema — how JSON files and directories map to the workspace/collection/folder/request hierarchy; (2) the Rust command layer — CRUD operations that read and write that schema; (3) the React collection tree — a custom UI component that renders the hierarchy and drives user interactions (right-click context menu, inline rename, confirmation modal, HTTP method badges).

No native "tree" component exists in HeroUI v2. The collection tree must be hand-built from HeroUI primitives (Button, Input, Modal) and standard React patterns. This is expected and is not a significant complexity risk — the tree is simple (display name + chevron + badge, depth-unlimited but practically shallow). The context menu (D-03/D-04) requires either the HeroUI Dropdown or a Radix UI ContextMenu — both are available and well-documented.

The file-system schema is the single most load-bearing decision in the entire project. It was designed as file-per-request with `_collection.json` manifests before Phase 1 began (see ARCHITECTURE.md Pattern 4). Phase 2 locks and implements that schema. All Rust I/O uses `std::fs` — no `tauri-plugin-fs` is needed because all file operations are Rust-side (the frontend never touches the filesystem directly). The Rust commands add one new file: `src-tauri/src/commands/collections.rs`, plus a `src-tauri/src/collections/` engine module. The frontend adds `src/features/collections/`, `src/stores/collectionStore.ts`, and `src/api/collections.ts`.

**Primary recommendation:** Implement the schema exactly as documented in ARCHITECTURE.md Pattern 4. Use `std::fs` in Rust for all I/O. Build the tree component from scratch with recursive React rendering. Use HeroUI Dropdown for the context menu — it already exists in the project and is built on React Aria (fully accessible, keyboard-navigable out of the box).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Rust `std::fs` | stdlib | File create/read/write/rename/delete/mkdir | No external dependency needed; all ops are synchronous and fast for JSON files; runs in Tauri command handlers |
| `serde` + `serde_json` | 1.x (already in Cargo.toml) | Serialize/deserialize request and collection JSON structs | Already installed; the only correct approach for typed JSON I/O in Rust |
| `tauri` `app_data_dir()` | 2.x (already installed) | Resolve `~/Library/Application Support/dev.dispatch.app/` path cross-platform | The canonical Tauri API for app-scoped storage; works on macOS and future platforms |
| Zustand | 5.x (already installed) | `collectionStore` — tree state, expanded nodes, active selection | Already installed; established pattern from Phase 1 `uiStore` |
| React + TypeScript | 19.x / 5.x (already installed) | Recursive tree component, inline rename, context menu integration | Already installed; React's component model is the right fit for a recursive tree |
| HeroUI Dropdown | 2.7.11 (already installed via @heroui/react) | Right-click context menu (D-03/D-04) | Built on React Aria — keyboard accessible, focus managed, no extra install |
| HeroUI Modal | 2.7.11 (already installed) | Delete confirmation modal (D-06) | Built on React Aria — traps focus, closes on Escape, no extra install |
| HeroUI Input | 2.7.11 (already installed) | Inline rename input (D-05) | Consistent HeroUI styling; supports autoFocus and onKeyDown for Enter/Escape |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `slugify` (npm) | 1.6.8 | Derive filesystem-safe slugs from display names (D-10 through D-12) | Frontend generates a slug preview; Rust validates/applies the final slug. Alternatively hand-roll a 10-line slug function — see Architecture Patterns section. |
| `@tauri-apps/api/path` | 2.x (already installed) | Call `appDataDir()` from frontend when needed for display | Only needed if the frontend ever needs to show the workspace path; Rust commands use `tauri::api::path::app_data_dir()` directly |
| `uuid` crate (Rust) | 1.x | Generate workspace IDs (D-07 path includes `<id>`) | Simple UUID v4 for workspace directory names; prevents collisions without any sync |

**No new npm installs are required for this phase.** All frontend libraries are already present.

**One optional Cargo addition:** `uuid = { version = "1", features = ["v4"] }` for workspace ID generation on first launch (D-08).

**Version verification (confirmed 2026-03-24):**
- `slugify` npm: 1.6.8 (latest)
- `uuid` crate: 1.16.0 (latest 1.x)

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| HeroUI Dropdown for context menu | Radix UI `@radix-ui/react-context-menu` (v2.2.16) | Radix ContextMenu fires on `contextmenu` event (actual right-click), so it feels more native. HeroUI Dropdown requires attaching to `onContextMenu` manually but works. Use HeroUI to avoid an extra dependency since it is already installed. |
| `std::fs` for file operations | `tauri-plugin-fs` (2.4.5) | `tauri-plugin-fs` is a JS-accessible filesystem abstraction — it is only needed if the frontend needs to read files directly. This phase routes all I/O through Rust commands, so `tauri-plugin-fs` is unnecessary overhead. |
| Hand-rolled slug | `slugify` npm 1.6.8 | `slugify` handles Unicode edge cases, emoji stripping, and locale-specific transliteration. A hand-rolled function is 10 lines and covers the 99% case for ASCII names. Given the simplicity of the requirement (D-10), either is acceptable — the hand-rolled approach avoids a dependency. |

---

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)

```
src/
├── api/
│   └── collections.ts           # Typed invoke() wrappers for all CRUD commands
├── features/
│   └── collections/
│       ├── CollectionTree.tsx    # Root tree component — renders workspace/collection list
│       ├── CollectionNode.tsx    # Renders one collection with its children
│       ├── FolderNode.tsx        # Renders one folder with its children (recursive)
│       ├── RequestNode.tsx       # Renders one request row (method badge + name)
│       ├── MethodBadge.tsx       # Colored HTTP method chip (D-01)
│       ├── RenameInput.tsx       # Inline rename input (D-05)
│       ├── DeleteModal.tsx       # Confirmation modal with child count (D-06)
│       └── TreeContextMenu.tsx   # Right-click menu wrapper (D-03/D-04)
├── stores/
│   └── collectionStore.ts        # Zustand: tree data, expanded state, active request
│
src-tauri/src/
├── collections/
│   ├── mod.rs                    # Re-exports; defines CollectionItem, RequestFile structs
│   ├── io.rs                     # read_workspace(), write_request_file(), delete_entry() etc.
│   └── slugify.rs                # Slug generation and collision detection
└── commands/
    └── collections.rs            # Thin Tauri command handlers delegating to collections::io
```

### File System Schema (locked from ARCHITECTURE.md Pattern 4)

This is the authoritative schema for Phase 2. All Rust structs and frontend TypeScript types derive from this.

```
~/Library/Application Support/dev.dispatch.app/
└── workspaces/
    └── <workspace-id>/           # UUID generated on first launch (D-07, D-08)
        ├── dispatch.json         # Workspace manifest: name, id, created_at
        ├── collections/
        │   └── <collection-slug>/
        │       ├── _collection.json    # Collection manifest: name, description, order
        │       ├── <request-slug>.json # Request file
        │       └── <folder-slug>/
        │           ├── _folder.json    # Folder manifest: name, order
        │           └── <request-slug>.json
        └── environments/         # (Phase 4 — not touched in Phase 2)
```

**`dispatch.json`** (workspace manifest):
```json
{
  "id": "uuid-v4",
  "name": "My Workspace",
  "created_at": "2026-03-24T00:00:00Z"
}
```

**`_collection.json`** (collection manifest):
```json
{
  "name": "User API",
  "description": "",
  "order": ["get-users", "auth", "create-user"]
}
```

**`_folder.json`** (folder manifest):
```json
{
  "name": "Auth",
  "order": ["login", "refresh"]
}
```

**Request file** (`get-users.json`):
```json
{
  "name": "Get Users",
  "method": "GET",
  "url": "",
  "params": [],
  "headers": [],
  "body": null,
  "auth": null
}
```

The `order` array in collection and folder manifests contains the slugs of child items in display order. This avoids filesystem ordering dependencies and supports Phase 8 drag-and-drop reordering without filesystem renames.

### Pattern 1: Recursive Tree Rendering in React

**What:** The collection tree is a set of mutually recursive React components. `CollectionTree` renders a list of `CollectionNode` components. Each `CollectionNode` renders its children as `FolderNode` or `RequestNode` components. `FolderNode` can render more `FolderNode` and `RequestNode` children recursively.

**When to use:** Always for this phase. This is the standard pattern for rendering hierarchical data without a tree library.

**Example:**
```typescript
// features/collections/FolderNode.tsx
interface FolderNodeProps {
  folder: FolderItem;
  depth: number;
}

export function FolderNode({ folder, depth }: FolderNodeProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <div
        style={{ paddingLeft: `${depth * 12}px` }}
        className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-default-100 rounded"
        onContextMenu={(e) => { e.preventDefault(); /* open context menu */ }}
        onClick={() => setExpanded(!expanded)}
      >
        <ChevronIcon expanded={expanded} />
        <span className="text-sm truncate">{folder.name}</span>
      </div>
      {expanded && folder.children.map((child) =>
        child.type === 'folder'
          ? <FolderNode key={child.id} folder={child} depth={depth + 1} />
          : <RequestNode key={child.id} request={child} depth={depth + 1} />
      )}
    </div>
  );
}
```

### Pattern 2: Tauri Command Pattern (Thin Command, Fat Engine)

**What:** CRUD Tauri commands are thin handlers in `commands/collections.rs` that call into `collections/io.rs`. Commands validate paths and delegate; no business logic in the command layer.

**Example:**
```rust
// commands/collections.rs
#[tauri::command]
#[specta::specta]
pub async fn create_collection(
    name: String,
    workspace_id: String,
    app: tauri::AppHandle,
) -> Result<CollectionMeta, String> {
    let base = collections::io::workspace_base(&app, &workspace_id)
        .map_err(|e| e.to_string())?;
    collections::io::create_collection(&base, &name)
        .map_err(|e| e.to_string())
}

// collections/io.rs
pub fn create_collection(workspace_base: &Path, name: &str) -> anyhow::Result<CollectionMeta> {
    let slug = slugify::to_slug(name);
    let slug = slugify::resolve_collision(workspace_base, &slug, "collections")?;
    let collection_dir = workspace_base.join("collections").join(&slug);
    std::fs::create_dir_all(&collection_dir)?;
    let meta = CollectionMeta { name: name.to_string(), slug: slug.clone(), order: vec![] };
    let manifest_path = collection_dir.join("_collection.json");
    let json = serde_json::to_string_pretty(&meta)?;
    std::fs::write(manifest_path, json)?;
    Ok(meta)
}
```

### Pattern 3: Context Menu via HeroUI Dropdown

**What:** The D-03 right-click context menu is implemented by wrapping each tree node in an `onContextMenu` handler that positions and opens a HeroUI Dropdown. State for which node's menu is open lives in `collectionStore` or local React state.

**Why HeroUI Dropdown:** It is already installed. It uses React Aria internally, meaning keyboard navigation (arrow keys, Enter, Escape) works correctly without extra work. The downside vs. Radix `ContextMenu` is that HeroUI Dropdown doesn't fire automatically on right-click — it must be triggered manually via `onContextMenu`. This is a 5-line wrapper, not a significant issue.

**Example:**
```typescript
// features/collections/TreeContextMenu.tsx
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';

export function TreeContextMenu({ children, onNewRequest, onNewFolder, onRename, onDuplicate, onDelete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setIsOpen(true);
  };

  return (
    <div onContextMenu={handleContextMenu}>
      {children}
      <Dropdown isOpen={isOpen} onOpenChange={setIsOpen}>
        {/* positioned via absolute CSS at position.x, position.y */}
        <DropdownTrigger><span style={{ position: 'fixed', left: position.x, top: position.y }} /></DropdownTrigger>
        <DropdownMenu>
          <DropdownItem key="new-request" onPress={onNewRequest}>New Request</DropdownItem>
          <DropdownItem key="new-folder" onPress={onNewFolder}>New Folder</DropdownItem>
          <DropdownItem key="rename" onPress={onRename}>Rename</DropdownItem>
          <DropdownItem key="duplicate" onPress={onDuplicate}>Duplicate</DropdownItem>
          <DropdownItem key="delete" color="danger" onPress={onDelete}>Delete</DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  );
}
```

> Note: HeroUI Dropdown's section divider maps to `DropdownSection` with `showDivider`. Use it to implement the separator between "New Request / New Folder" and "Rename / Duplicate / Delete" per D-04.

### Pattern 4: First-Launch Workspace Initialization (D-08)

**What:** On first launch, the app checks if any workspaces exist in the app data directory. If none, it creates a "My Workspace" scratch workspace automatically and stores its ID in a lightweight config file.

**Where to run this:** In Tauri's `setup` hook in `lib.rs`, before the window is shown. Use `tauri::async_runtime::spawn` if async I/O is needed, but for simple `std::fs` calls it can run synchronously in setup.

**Example:**
```rust
// lib.rs setup hook addition
.setup(|app| {
    let app_data = app.path().app_data_dir()?;
    workspace::init::ensure_default_workspace(&app_data)?;
    Ok(())
})
```

### Pattern 5: collectionStore Shape

**What:** The Zustand store holds the fully-loaded workspace tree in memory. A `loadWorkspace` action reads all JSON files from disk via a Tauri command on app startup and on any `collections:refreshed` event (from Phase 7 sync). Individual CRUD actions optimistically update the store and then issue the corresponding Tauri command.

```typescript
// stores/collectionStore.ts
interface CollectionStore {
  workspaceId: string | null;
  collections: CollectionItem[];          // Full tree in memory
  expandedNodes: Set<string>;             // Slug path keys
  activeRequestId: string | null;         // Currently open request
  renamingNodeId: string | null;          // Which node is in inline-rename mode
  loadWorkspace: (workspaceId: string) => Promise<void>;
  createCollection: (name: string) => Promise<void>;
  createFolder: (collectionSlug: string, parentPath: string[], name: string) => Promise<void>;
  createRequest: (collectionSlug: string, folderPath: string[], name: string) => Promise<void>;
  renameNode: (id: string, newName: string) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  duplicateRequest: (id: string) => Promise<void>;
  toggleExpanded: (nodeId: string) => void;
  setActiveRequest: (id: string | null) => void;
  setRenamingNode: (id: string | null) => void;
}
```

### Anti-Patterns to Avoid

- **Storing resolved file paths in the tree nodes:** Store slugs and derive paths at command call time. Absolute paths vary per machine and break when a workspace is moved.
- **Writing files from the React frontend via tauri-plugin-fs:** All filesystem operations go through Rust commands. The frontend holds state in memory (collectionStore) and issues commands — it never reads or writes files directly.
- **One large JSON file for the entire collection:** This is explicitly called out in PITFALLS.md as a technical debt trap. File-per-request is the correct model; implement it from the start.
- **Keeping expand/collapse state in the Rust backend:** Expand/collapse is pure UI state. It lives in the Zustand store, not in any serialized file.
- **Using `tokio::spawn` for file operations:** For synchronous `std::fs` operations, call them directly in async Tauri commands — they are fast enough for the file sizes involved. If heavy I/O is added later, use `tokio::task::spawn_blocking`. Do not use `tokio::spawn` (panics in Tauri v2 context).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Context menu keyboard navigation | Custom focus management for context menu | HeroUI Dropdown (React Aria) | React Aria handles arrow keys, Home, End, Escape, Enter automatically with ARIA roles; correct behavior on macOS with keyboard shortcuts |
| Delete confirmation modal | Custom `<dialog>` or absolutely-positioned div | HeroUI Modal | Focus trap, Escape to close, ARIA `role="dialog"` — all built in. 5 lines of JSX vs. 50 lines of custom code |
| JSON serialization | Manual JSON string building | `serde_json` | Already installed; handles edge cases (escaping, numbers, null) correctly; generates a compile error if a struct field is missing |
| Workspace path resolution | Manually construct `~/Library/Application Support/...` | `app.path().app_data_dir()` from Tauri | `app_data_dir()` returns the correct platform path. On macOS it resolves to `~/Library/Application Support/<identifier>`. Hard-coding the path is fragile. |
| Display name deduplication ("New Request (2)") | Custom counter loop | Simple loop checking `collectionStore` for name existence | This is 10 lines and project-specific enough that a library adds no value. Hand-roll is correct here. |

**Key insight:** The tree rendering is simple enough to hand-roll (it is just recursive React components). The accessibility and interaction primitives (modal, dropdown menu) are complex enough that HeroUI's React Aria base components eliminate meaningful risk.

---

## Common Pitfalls

### Pitfall 1: Slug Collision on Rename Creates Orphaned File

**What goes wrong:** User renames "Get Users" to "List Users". Rust renames `get-users.json` to `list-users.json`. If `list-users.json` already exists (from a different request named "List Users"), the rename overwrites it silently.

**Why it happens:** `std::fs::rename` on Unix replaces the destination if it exists, without error. Developers forget to pre-check for a collision before rename.

**How to avoid:** Before any rename, check if the target slug is already used by a different node. If so, apply the numeric suffix collision resolution (D-12): `list-users-2.json`, etc. The `collections::slugify::resolve_collision` function handles this.

**Warning signs:** Two requests with different names but the same slug being the same node, or a request disappearing after rename.

### Pitfall 2: `order` Array in Manifest Gets Out of Sync with Actual Files

**What goes wrong:** A request file is deleted but its slug is not removed from the parent `_collection.json` `order` array. The tree renders a ghost entry that points to a missing file, and the read command returns an error.

**Why it happens:** Delete operations update the file but forget to update the parent manifest. Or a rename updates the file name but forgets to update the slug in the parent's `order` array.

**How to avoid:** All write operations in `collections/io.rs` must atomically update both (1) the target file/directory and (2) the parent manifest's `order` array in a single function. Never split these into two separate commands. Add a validation pass in `read_workspace` that silently drops order entries pointing to non-existent files — defensive read.

**Warning signs:** Requests appearing in the tree that error on open; requests disappearing from tree that exist on disk.

### Pitfall 3: Inline Rename Input Loses Focus on Re-Render

**What goes wrong:** When the user clicks "Rename" in the context menu, the tree node switches to `<input>` mode. A Zustand store update triggers a re-render of the entire tree. The input loses focus because React re-creates it without autoFocus applying a second time.

**Why it happens:** `autoFocus` on an `<input>` only fires on initial mount. If the component unmounts and remounts due to a key change, `autoFocus` fires again. But if the component merely re-renders with the input already present, `autoFocus` does nothing.

**How to avoid:** Use a `useEffect` with a `ref.current.focus()` call that fires when `renamingNodeId` becomes the node's ID. This is more reliable than `autoFocus` in a re-rendering tree.

```typescript
const inputRef = useRef<HTMLInputElement>(null);
useEffect(() => {
  if (isRenaming) {
    inputRef.current?.focus();
    inputRef.current?.select(); // Select all text for easy replacement
  }
}, [isRenaming]);
```

**Warning signs:** Clicking Rename does nothing visually; the input appears but is not focused; user must click into the input.

### Pitfall 4: Context Menu Stays Open After Click-Outside on macOS WebView

**What goes wrong:** After opening the right-click context menu, clicking outside on the macOS WebView (e.g., on the window chrome) does not close the menu. The user sees a stuck dropdown.

**Why it happens:** HeroUI Dropdown's "click outside" detection uses a `mousedown` listener on `document`. Clicks on native macOS window chrome do not generate `mousedown` events in the WebView.

**How to avoid:** Supplement with a `blur` event listener on the window: when the Tauri window loses focus, close all open context menus. This covers the case where the user clicks on native chrome.

```typescript
useEffect(() => {
  const handleBlur = () => setIsOpen(false);
  window.addEventListener('blur', handleBlur);
  return () => window.removeEventListener('blur', handleBlur);
}, []);
```

### Pitfall 5: First-Launch Race — Workspace Not Ready Before Frontend Loads

**What goes wrong:** The frontend loads and immediately invokes `load_workspace`. If the first-launch workspace creation in Rust `setup` hasn't written `dispatch.json` yet, `load_workspace` returns an empty or error state, and the tree shows nothing.

**Why it happens:** `setup` hook runs synchronously for synchronous ops, but the frontend load starts in parallel with the Tauri setup. For fast `std::fs` operations this is not normally an issue, but if workspace init is async, the race is real.

**How to avoid:** Keep `ensure_default_workspace` synchronous (it only creates a few small files — no async needed). The frontend should always call `load_workspace` inside `useEffect` after mount, not during module initialization. If `load_workspace` returns an empty result, the frontend should show the empty state (D-05 placeholder text from Phase 1) rather than an error.

### Pitfall 6: Path Traversal via Malicious Request Name

**What goes wrong:** A request name like `../../etc/passwd` is slugified to `..-..-etc-passwd` (if the slugifier is weak) and the resulting path escapes the workspace directory.

**Why it happens:** Slug functions designed for URL segments don't always strip path separators when the input is used as a filesystem path.

**How to avoid:** In `collections/slugify.rs`, strip `/` and `\` before any other processing. After slug generation, resolve the full path and assert it is a child of the workspace directory using `path.starts_with(workspace_base)`. Return an error if the assertion fails. This is the security validation from PITFALLS.md.

---

## Code Examples

### Reading the Workspace Tree (Rust)

```rust
// collections/io.rs
// Source: std::fs docs + serde_json 1.x docs (standard patterns)

pub fn read_workspace(workspace_base: &Path) -> anyhow::Result<Vec<CollectionItem>> {
    let collections_dir = workspace_base.join("collections");
    if !collections_dir.exists() {
        return Ok(vec![]);
    }

    let mut collections = vec![];
    for entry in std::fs::read_dir(&collections_dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            let manifest_path = path.join("_collection.json");
            if manifest_path.exists() {
                let json = std::fs::read_to_string(&manifest_path)?;
                let manifest: CollectionManifest = serde_json::from_str(&json)?;
                let children = read_children(&path, &manifest.order)?;
                collections.push(CollectionItem {
                    slug: path.file_name().unwrap().to_string_lossy().to_string(),
                    name: manifest.name,
                    children,
                });
            }
        }
    }
    Ok(collections)
}
```

### Writing a New Request File (Rust)

```rust
// collections/io.rs
pub fn create_request(
    parent_dir: &Path,
    name: &str,
) -> anyhow::Result<RequestMeta> {
    let slug = to_slug(name);
    let slug = resolve_collision(parent_dir, &slug, "json")?;
    let file_path = parent_dir.join(format!("{}.json", slug));

    let request = RequestFile {
        name: name.to_string(),
        method: "GET".to_string(),
        url: String::new(),
        params: vec![],
        headers: vec![],
        body: None,
        auth: None,
    };
    let json = serde_json::to_string_pretty(&request)?;
    std::fs::write(&file_path, json)?;

    // Update parent manifest order array
    update_order_array(parent_dir, &slug)?;

    Ok(RequestMeta { slug, name: name.to_string() })
}
```

### Slug Generation (Rust, hand-rolled)

```rust
// collections/slugify.rs
pub fn to_slug(name: &str) -> String {
    let slug: String = name
        .to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-");

    // Max 60 chars to avoid filesystem limits
    slug.chars().take(60).collect()
}

pub fn resolve_collision(dir: &Path, base_slug: &str, extension: &str) -> anyhow::Result<String> {
    let first = format!("{}.{}", base_slug, extension);
    if !dir.join(&first).exists() {
        return Ok(base_slug.to_string());
    }
    for n in 2..=999 {
        let candidate = format!("{}-{}.{}", base_slug, n, extension);
        if !dir.join(&candidate).exists() {
            return Ok(format!("{}-{}", base_slug, n));
        }
    }
    anyhow::bail!("Too many slug collisions for '{}'", base_slug)
}
```

### Loading Workspace into collectionStore (TypeScript)

```typescript
// stores/collectionStore.ts (partial)
import { create } from 'zustand';
import * as collectionsApi from '../api/collections';

export const useCollectionStore = create<CollectionStore>((set, get) => ({
  workspaceId: null,
  collections: [],
  expandedNodes: new Set(),
  activeRequestId: null,
  renamingNodeId: null,

  loadWorkspace: async (workspaceId: string) => {
    const collections = await collectionsApi.loadWorkspace(workspaceId);
    set({ workspaceId, collections });
  },

  createCollection: async (name: string) => {
    const { workspaceId } = get();
    if (!workspaceId) return;
    const meta = await collectionsApi.createCollection(workspaceId, name);
    set((s) => ({ collections: [...s.collections, { ...meta, children: [] }] }));
  },

  // ... other actions
}));
```

### Method Badge Component (TypeScript)

```typescript
// features/collections/MethodBadge.tsx
const METHOD_COLORS: Record<string, string> = {
  GET: 'text-success',      // green — HeroUI success color = #17c964 (D-07 primary)
  POST: 'text-primary',     // blue — HeroUI default primary is blue-ish; or remap
  PUT: 'text-warning',      // orange
  DELETE: 'text-danger',    // red
  PATCH: 'text-secondary',  // purple fallback
};

export function MethodBadge({ method }: { method: string }) {
  const colorClass = METHOD_COLORS[method.toUpperCase()] ?? 'text-default-500';
  return (
    <span className={`text-[10px] font-bold font-mono w-10 shrink-0 ${colorClass}`}>
      {method.toUpperCase()}
    </span>
  );
}
```

> Note: GET should use `text-success` which maps to `#17c964` (the app's primary green per D-07). POST/PUT/DELETE map to HeroUI semantic color tokens for consistency with the theme.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single collection.json for all requests | File-per-request with `_collection.json` manifest | Bruno pioneered this ~2022; it is now the standard for git-backed HTTP clients | Human-readable diffs, clean merge conflicts, no rewrite of the entire collection on every edit |
| Tree UI libraries (react-arborist, rc-tree) | Hand-rolled recursive React components | React 18+ concurrent rendering makes hand-rolled trees trivial; libraries add bundle weight and opinionated APIs | Simpler, smaller, no version lock-in |
| `Stronghold` for Tauri secret storage | `tauri-plugin-secure-storage` (wraps keyring/macOS Keychain) | Tauri announced Stronghold deprecation in 2025 | Native OS credential store, no IOTA dependency |

**Deprecated/outdated:**
- Stronghold plugin: deprecated in Tauri v3 roadmap — do not use. `tauri-plugin-secure-storage` is the replacement.
- `tauri-plugin-fs` for Rust-side file operations: unnecessary when all I/O is in Rust commands. Only needed when the frontend needs direct file access.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 2 is code-only changes with no external service dependencies. All file operations use `std::fs` (stdlib). No database, no external CLI tools, no new network services.

---

## Open Questions

1. **`dispatch.json` workspace manifest vs. Zustand-only workspace tracking**
   - What we know: D-07 specifies a directory structure with `<workspace-id>` in the path. Something must persist the workspace ID so the app reloads the same workspace on restart.
   - What's unclear: Should the workspace ID/name be stored in `dispatch.json` inside the workspace directory, in a separate app-level `config.json` at the root of app data dir, or in `tauri-plugin-store`?
   - Recommendation: Use a `config.json` at `~/Library/Application Support/dev.dispatch.app/config.json` that stores `{ "workspaces": [{ "id": "...", "name": "My Workspace", "path": "workspaces/<id>" }], "last_workspace": "..." }`. This is separate from the workspace itself, avoiding confusion. Implement with `serde_json` on `std::fs` — no `tauri-plugin-store` needed for Phase 2.

2. **How deeply to implement `activeRequestId` state in this phase**
   - What we know: COLL-01 requires seeing the tree; COLL-04 requires creating requests; RequestEditor (Phase 1 shell) exists and receives the active request.
   - What's unclear: Should clicking a request in the tree populate the RequestEditor with the request data in Phase 2, or is that Phase 3 scope?
   - Recommendation: Phase 2 should set `activeRequestId` in the store and pass basic request fields (name, method, url) to the RequestEditor shell to confirm the data flow works. Full HTTP execution is Phase 3.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COLL-01 | Sidebar renders workspace > collections > folders > requests tree | unit (React) | `npm test -- src/features/collections/CollectionTree.test.tsx` | Wave 0 |
| COLL-02 | Create collection adds item to tree; rename updates name; delete removes it | unit (React + store) | `npm test -- src/stores/collectionStore.test.ts` | Wave 0 |
| COLL-03 | Create subfolder adds nested item; rename/delete work recursively | unit (React + store) | `npm test -- src/stores/collectionStore.test.ts` | Wave 0 (same file) |
| COLL-04 | Create request adds to collection; duplicate creates copy; delete removes | unit (React + store) | `npm test -- src/stores/collectionStore.test.ts` | Wave 0 (same file) |

All four requirements can be tested at the React/Zustand layer with a mocked `invoke()`. Rust CRUD logic is testable with standard Rust unit tests in `collections/io.rs` (no Tauri instance needed — pure `std::fs`).

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/features/collections/CollectionTree.test.tsx` — covers COLL-01 rendering
- [ ] `src/stores/collectionStore.test.ts` — covers COLL-02, COLL-03, COLL-04 store actions
- [ ] Rust unit tests in `src-tauri/src/collections/io.rs` as `#[cfg(test)]` mod — covers file I/O functions (no framework install needed; `cargo test` is already available)

---

## Project Constraints (from CLAUDE.md)

These directives from `CLAUDE.md` are binding on all planning and implementation in this phase:

| Constraint | Implication for Phase 2 |
|-----------|------------------------|
| HeroUI v2 stable (`@heroui/react@2.7.11` pinned) — do NOT use v3 beta | Use only HeroUI v2 components. Modal, Dropdown, Input are all v2. |
| Tailwind v3 (not v4) | No Tailwind v4 utility classes. All styling via Tailwind v3 utility classes. |
| `tauri-plugin-http` re-exports reqwest — do not add reqwest separately | Not relevant for Phase 2 (no HTTP requests), but do not add `reqwest` to Cargo.toml. |
| JS-side fetch: never use for authenticated GitHub calls | Not relevant for Phase 2 (no GitHub calls). |
| All git2 operations in `tokio::task::spawn_blocking` | Not relevant for Phase 2 (no git2). File I/O via `std::fs` is synchronous but fast; call from async Tauri commands directly. |
| Use `tauri::async_runtime::spawn`, never `tokio::spawn` | Applies if any background task is spawned in setup for first-launch workspace creation. |
| Secrets in `~/Library/Application Support/dev.dispatch.app/secrets/` only | Phase 2 writes no secrets. Workspace JSON files do not contain secrets. Enforce the absolute path pattern now to establish the precedent. |
| tauri-specta RC version pins: `tauri-specta@2.0.0-rc.21`, `specta@=2.0.0-rc.22`, `specta-typescript@0.0.9` | All new Rust commands must be annotated with `#[specta::specta]` and registered in `collect_commands![]` in `lib.rs`. Do not add newer specta versions — the RC pin is fragile. |
| `@heroui/react@2.7.11` pinned — `npm latest` now resolves to v3.0.1 | Do not run `npm install @heroui/react` without the explicit version pin. |
| Green primary color `#17c964` as primary semantic slot | Method badge colors should use HeroUI semantic tokens (`text-success`, `text-danger`, `text-warning`, `text-primary`). GET=success (green). |

---

## Sources

### Primary (HIGH confidence)
- `ARCHITECTURE.md` — Pattern 4 (file-per-request schema), project structure, IPC patterns — loaded directly from project
- `PITFALLS.md` — Pitfall 2 (secrets), Pitfall 6 (sync race — not Phase 2 but informs schema decisions) — loaded directly from project
- `CONTEXT.md` Phase 2 — All locked decisions (D-01 through D-17)
- `CLAUDE.md` — Binding project constraints
- Rust `std::fs` — stdlib; no version uncertainty
- `serde_json` 1.x — already in Cargo.toml; no uncertainty
- Tauri 2.x `app.path().app_data_dir()` — official Tauri v2 API

### Secondary (MEDIUM confidence)
- HeroUI v2 Dropdown docs — installed package at 2.7.11; Dropdown and DropdownMenu component API verified against node_modules
- HeroUI v2 Modal docs — installed package; Modal component API verified against node_modules
- `slugify` npm 1.6.8 — version confirmed via `npm view slugify version`

### Tertiary (LOW confidence)
- Context menu positioning via `onContextMenu` + absolute positioned Dropdown trigger — common pattern but exact HeroUI positioning API not verified against live docs. May need adjustment during implementation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed; no new installs required for core functionality
- File-system schema: HIGH — directly from ARCHITECTURE.md which was previously researched
- Architecture patterns: HIGH — derived from established project patterns in Phase 1 + ARCHITECTURE.md
- Tree rendering: HIGH — standard recursive React pattern; no library uncertainty
- Context menu: MEDIUM — HeroUI Dropdown works but exact positioning of a context-menu-style trigger needs implementation-time adjustment
- Pitfalls: HIGH — derived from project-specific PITFALLS.md + direct code analysis

**Research date:** 2026-03-24
**Valid until:** 2026-04-23 (stable stack; 30-day validity)
