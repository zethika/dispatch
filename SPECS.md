# Dispatch — V1 Specification

## What Is Dispatch?

Dispatch is a native Mac desktop app for making HTTP requests, organizing them in collections, and sharing them with teammates — all backed by GitHub repos as the storage and collaboration layer.

It replaces Postman for teams that only need the fundamentals: grouped requests, environment variables, and frictionless sharing — without the bloat, account restrictions, or pricing surprises.

## Architecture

### Stack

- **Desktop shell**: Tauri (Rust backend, system webview)
- **Frontend**: React + TypeScript + HeroUI (NextUI v2) component library
- **Storage**: Local filesystem — collections, requests, and environments are JSON files inside user-selected GitHub repos
- **Sync**: Git operations via the Rust backend (clone, pull, commit, push) using the `git2` crate (libgit2 bindings)
- **Auth**: GitHub OAuth (device flow) — used for git push/pull credentials and to list/select repos

### Key Architectural Decisions

**GitHub repos as workspaces.** Each connected repo is a workspace. Repo access controls who can read/write. No separate user management, no server, no database.

**File-based data model.** Every request, collection, and environment is a human-readable JSON file committed to the repo. This means you get version history, diffs, branching, and collaboration from git for free.

**Local-only secrets layer.** Sensitive values (API keys, tokens, passwords) are stored locally on each user's machine, never committed to git. These are referenced in environments by key and resolved at request time.

**Auto-sync with debounce.** Changes are automatically committed and pushed after a debounce period (~2-3 seconds of inactivity after a change). Pulls happen on a regular interval (e.g., every 30 seconds) and on workspace focus. Conflicts are resolved with a last-write-wins strategy at the file level, with a notification when a conflict occurs.

**Offline-capable.** Everything works locally. Sync happens when connectivity is available. Unsyncable changes queue and push when back online.

## Data Model

### Repo/Workspace Structure

```
<repo-root>/
  dispatch.json                  # workspace metadata (name, version)
  collections/
    <collection-slug>/
      _collection.json           # collection metadata (name, description, order)
      <request-slug>.json        # individual request files
      <subfolder-slug>/          # nested folders (arbitrary depth)
        _collection.json         # subfolder metadata (same format)
        <request-slug>.json
  environments/
    <environment-slug>.json      # environment variable definitions
```

### Request File (`*.json`)

```json
{
  "name": "Create User",
  "method": "POST",
  "url": "{{base_url}}/api/users",
  "headers": [
    { "key": "Content-Type", "value": "application/json", "enabled": true },
    { "key": "Authorization", "value": "Bearer {{token}}", "enabled": true }
  ],
  "queryParams": [
    { "key": "verbose", "value": "true", "enabled": false }
  ],
  "body": {
    "type": "json",
    "content": "{\n  \"name\": \"{{user_name}}\",\n  \"email\": \"test@example.com\"\n}"
  },
  "auth": {
    "type": "bearer",
    "token": "{{token}}"
  }
}
```

### Environment File (`environments/*.json`)

```json
{
  "name": "Development",
  "variables": [
    { "key": "base_url", "value": "http://localhost:8080", "secret": false },
    { "key": "token", "value": "", "secret": true }
  ]
}
```

Variables marked `secret: true` have their values stored locally only (see secrets layer below), and the `value` field in the committed file is always empty string for those.

### Local Secrets Store

Location: `~/Library/Application Support/dev.dispatch.app/secrets/<repo-id>/<environment-slug>.json`

```json
{
  "token": "sk-live-abc123...",
  "admin_password": "hunter2"
}
```

These files are never touched by git. They are keyed by repo + environment so secrets don't leak across workspaces.

### Workspace Metadata (`dispatch.json`)

```json
{
  "version": "1",
  "name": "Backend APIs"
}
```

### Collection Metadata (`_collection.json`)

```json
{
  "name": "User API",
  "description": "User CRUD endpoints",
  "order": ["get-users", "get-user-by-id", "create-user", "update-user", "delete-user"]
}
```

The `order` array references request file slugs (filenames without `.json`) and subfolder slugs to define display order. Subfolders are distinguished from requests by matching against directory names.

## Features — V1

### 1. GitHub Authentication & Workspace Management

- GitHub OAuth device flow login
- List accessible repos (personal + org)
- Connect/disconnect repos as workspaces
- Clone repos locally on connect, remove on disconnect
- Workspace switcher in the sidebar

### 2. Collections & Requests

- Sidebar tree: workspaces > collections > folders/requests (arbitrary nesting depth)
- Create, rename, delete collections and subfolders
- Create, rename, delete, duplicate requests
- Drag and drop to reorder requests and folders within a collection/folder
- Drag and drop to move requests and folders between collections/folders

### 3. Request Editor

- Method selector (GET, POST, PUT, DELETE)
- URL input with variable highlighting (`{{var}}` shown distinctly)
- Tabs for:
  - **Query Params**: key-value editor with enable/disable toggles
  - **Headers**: key-value editor with enable/disable toggles
  - **Body**: JSON editor with syntax highlighting (only shown for POST/PUT)
  - **Auth**: type selector (None, Bearer Token) with token input field
- Send button + `Cmd+Enter` shortcut
- Loading state while request is in flight

### 4. Response Viewer

- Status code with color coding (2xx green, 4xx yellow, 5xx red)
- Response time in ms
- Response headers (collapsible)
- Response body with JSON syntax highlighting and formatting
- Raw text fallback for non-JSON responses

### 5. Environments & Variables

- Environment manager (create, edit, delete environments)
- Active environment selector in the top bar (global to the workspace)
- Variable editor: key-value list with a "secret" toggle per variable
- `{{variable}}` substitution in: URL, headers, query params, body, auth token
- Secret variables: values stored locally only, never committed
- Visual indicator when a variable in a request can't be resolved

### 6. Auto-Sync (Git)

- On change: debounced commit + push (~2-3s after last edit)
- On interval: pull every ~30s
- On workspace focus/switch: pull immediately
- Sync status indicator in the UI (synced / syncing / offline / conflict)
- File-level last-write-wins conflict resolution
- Notification on conflict (whose change won)
- Offline queue: changes accumulate locally and push when connectivity returns

### 7. cURL Import

- Paste a cURL command via:
  - `Cmd+V` in the request panel (auto-detect cURL)
  - Dedicated "Import cURL" action in collection context menu
- Parses: method, URL, headers, body, query params, auth headers
- Creates a new request in the active collection

### 8. cURL Export

- "Copy as cURL" on any request (context menu + `Cmd+Shift+C`)
- Resolves variables from the active environment before exporting
- Copies to clipboard

### 9. Search

- `Cmd+K` or `Cmd+F` opens a search bar
- Searches across: request names, URLs, collection names
- Fuzzy matching with ranked results
- Select a result to navigate directly to it

### 10. Keyboard Shortcuts

| Action                  | Shortcut         |
|-------------------------|------------------|
| Send request            | `Cmd+Enter`      |
| New request             | `Cmd+N`          |
| New collection          | `Cmd+Shift+N`    |
| Search                  | `Cmd+K`          |
| Switch environment      | `Cmd+E`          |
| Copy as cURL            | `Cmd+Shift+C`    |
| Import cURL (paste)     | `Cmd+V` (auto)   |
| Close tab               | `Cmd+W`          |
| Save (force sync)       | `Cmd+S`          |

## Non-Goals for V1

These are explicitly out of scope to keep the first version focused:

- **No response history / logging** — fire and forget
- **No pre/post-request scripts** — no JS execution sandbox
- **No file upload support** — JSON bodies only
- **No WebSocket / GraphQL / gRPC** — HTTP REST only
- **No auth flows beyond bearer token** — no OAuth helpers, no basic auth UI
- **No team features beyond git** — no comments, no real-time cursors, no activity feed
- **No Windows/Linux builds** — Mac only for now (Tauri supports them later if needed)
- **No test assertions** — no built-in test runner
- **No request chaining** — no extracting values from one response to feed into the next

## UI Layout (Reference)

```
┌──────────────────────────────────────────────────────────────┐
│  [Workspace ▾]              [Environment ▾]     [Sync ●]     │
├──────────────┬───────────────────────────────────────────────┤
│              │  [GET ▾] [{{base_url}}/api/users     ] [Send] │
│  Search...   │───────────────────────────────────────────────│
│              │  [Params] [Headers] [Body] [Auth]             │
│  ▾ User API  │                                               │
│    GET users │  key        │ value        │ ☑                │
│    GET by id │  page       │ 1            │ ☑                │
│    POST new  │  limit      │ 20           │ ☑                │
│  ▾ Auth      │                                               │
│    POST login│───────────────────────────────────────────────│
│              │  200 OK  ·  143ms                             │
│              │                                               │
│              │  {                                             │
│              │    "users": [                                  │
│              │      { "id": 1, "name": "Alice" },            │
│              │      { "id": 2, "name": "Bob" }               │
│              │    ]                                           │
│              │  }                                             │
└──────────────┴───────────────────────────────────────────────┘
```

Left panel: workspace/collection/request tree with search.
Right panel top: request editor (method, URL, tabbed params/headers/body/auth).
Right panel bottom: response viewer (status, time, body).
Top bar: workspace switcher, environment selector, sync status.
