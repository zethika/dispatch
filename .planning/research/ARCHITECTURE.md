# Architecture Research

**Domain:** Native Mac desktop HTTP client with git-based sync (Tauri + React)
**Researched:** 2026-03-23
**Confidence:** HIGH (Tauri v2 official docs + verified patterns)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     WEBVIEW PROCESS (React/TS)                   │
├──────────────┬──────────────┬───────────────┬───────────────────┤
│  UI Layer    │  State Layer │  IPC Layer    │  Service Layer    │
│  (HeroUI)    │  (Zustand)   │  (@tauri-apps │  (api/ wrappers)  │
│  Components  │  Stores      │   /api/core)  │  typed invoke()   │
└──────┬───────┴──────┬───────┴───────┬───────┴─────────┬─────────┘
       │              │               │                 │
       │         subscribe        invoke()           listen()
       │              │               │                 │
┌──────┴───────────────────────────────────────────────┴─────────┐
│                     IPC BRIDGE (message passing)                 │
│         Commands (invoke → Result)    Events (emit → listen)     │
└──────────────────────────────────────────────────────────────────┘
       │
┌──────┴───────────────────────────────────────────────────────────┐
│                      CORE PROCESS (Rust)                          │
├──────────────┬──────────────┬───────────────┬────────────────────┤
│  Commands    │  AppState    │  HTTP Engine  │  Git Engine        │
│  (handlers)  │  (Mutex<T>)  │  (reqwest)    │  (git2 crate)      │
├──────────────┴──────────────┴───────────────┴────────────────────┤
│                   Background Tasks (tokio::spawn via             │
│               tauri::async_runtime::spawn in setup())            │
│      Sync loop │ Debounced commit │ Periodic pull │ Focus pull   │
└──────────────────────────────┬───────────────────────────────────┘
                               │
         ┌─────────────────────┼──────────────────────┐
         │                     │                      │
┌────────┴────────┐  ┌────────┴────────┐  ┌──────────┴──────────┐
│  Workspace FS   │  │  GitHub API     │  │  Local Secrets      │
│  ~/.../repos/   │  │  (REST + OAuth) │  │  (keyring crate)    │
│  JSON files     │  │  device flow    │  │  ~/Library/...      │
└─────────────────┘  └─────────────────┘  └─────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| UI Components | Render collections, request editor, response viewer, env manager | HeroUI + React, feature-folder layout |
| Zustand Stores | Frontend state: active request, response, selected env, UI state | Multiple domain stores, not one monolith |
| IPC Service Layer | Typed wrappers around `invoke()` — one file per command domain | TypeScript, exported as hooks or functions |
| Tauri Commands | Entry points from frontend; validate input, delegate to engines | `src-tauri/src/commands/` module per domain |
| AppState | Shared mutable state across commands: workspace path, auth token, sync status | `Mutex<AppState>` registered via `app.manage()` |
| HTTP Engine | Execute HTTP requests via reqwest; return structured response | Rust, async command, runs in core process |
| Git Engine | Clone, commit, push, pull via git2; conflict detection | Rust module, called from commands + background tasks |
| Sync Loop | Background task: debounced commit+push on change, periodic pull, focus pull | `tauri::async_runtime::spawn()` in setup hook |
| Workspace FS | Read/write JSON collection files from cloned repo on local disk | Rust fs operations; serde_json |
| Secrets Store | Persist GitHub tokens and secret env vars — never written to git | `keyring` crate (macOS Keychain) |
| GitHub API Client | Device flow OAuth, repo list/clone URL fetch | reqwest, Rust, called from auth commands |

## Recommended Project Structure

```
dispatch/
├── src/                          # React frontend
│   ├── main.tsx                  # React entry point
│   ├── App.tsx                   # Root layout + router
│   ├── components/               # Shared/generic UI components
│   │   ├── ui/                   # HeroUI wrappers and primitives
│   │   └── layout/               # Shell, sidebar, panels
│   ├── features/                 # Feature-sliced domain code
│   │   ├── collections/          # Collection tree, folder, drag-drop
│   │   ├── request/              # Request editor, tabs, params/headers/body
│   │   ├── response/             # Response viewer, status, headers, body
│   │   ├── environments/         # Env manager, variable substitution UI
│   │   ├── workspace/            # GitHub connect, sync status, repo picker
│   │   └── search/               # Cmd+K fuzzy search overlay
│   ├── stores/                   # Zustand state stores
│   │   ├── collectionStore.ts    # Collection/folder/request tree
│   │   ├── requestStore.ts       # Active request draft state
│   │   ├── responseStore.ts      # Last response per request
│   │   ├── envStore.ts           # Active environment + resolved vars
│   │   └── workspaceStore.ts     # Workspace, auth, sync status
│   ├── api/                      # Typed invoke() wrappers (IPC service layer)
│   │   ├── requests.ts           # sendRequest, importCurl, exportCurl
│   │   ├── collections.ts        # CRUD for collections/folders/requests
│   │   ├── environments.ts       # CRUD for envs + secrets
│   │   ├── workspace.ts          # clone, sync, disconnect
│   │   └── auth.ts               # GitHub login, logout, token check
│   ├── hooks/                    # Custom React hooks (compose stores + api/)
│   └── lib/                      # Utilities: variable substitution, cURL parse
│
└── src-tauri/                    # Rust backend
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── capabilities/             # Permission scopes (required in v2)
    │   └── default.json
    └── src/
        ├── main.rs               # Desktop entry — calls lib::run()
        ├── lib.rs                # Builder setup, manage state, spawn bg tasks
        ├── state.rs              # AppState struct definition
        ├── commands/             # Tauri command handlers (one module per domain)
        │   ├── mod.rs
        │   ├── http_request.rs   # send_request command
        │   ├── collections.rs    # read/write collection JSON files
        │   ├── environments.rs   # read/write env files, secrets via keyring
        │   ├── workspace.rs      # clone_repo, sync, disconnect
        │   └── auth.rs           # github_login, github_logout
        ├── git/                  # git2-based operations
        │   ├── mod.rs
        │   ├── clone.rs
        │   ├── sync.rs           # commit+push, pull, conflict detection
        │   └── conflict.rs
        ├── http/                 # reqwest HTTP execution
        │   ├── mod.rs
        │   └── execute.rs        # build and fire requests, return response struct
        ├── secrets.rs            # keyring read/write — never touches FS
        └── background.rs         # Sync loop, debounce, periodic pull logic
```

### Structure Rationale

- **`src/features/`:** Feature-sliced layout keeps each domain self-contained. Collections code doesn't bleed into response viewer code — easier to build and test incrementally.
- **`src/api/`:** A dedicated IPC service layer prevents raw `invoke()` calls from scattering across components. Types flow from Rust response structs to TypeScript via this boundary.
- **`src/stores/`:** Multiple focused stores rather than one global store. Each domain store is independently subscribable — response updates don't re-render the collection tree.
- **`src-tauri/src/commands/`:** One Rust module per command domain. `lib.rs` stays clean: it only wires modules and registers commands.
- **`src-tauri/src/git/`:** git2 operations isolated into their own module. Commands in `workspace.rs` call `git::sync::commit_and_push()` — commands stay thin.
- **`background.rs`:** Sync loop logic lives outside commands. It runs permanently via `tauri::async_runtime::spawn()` in setup and communicates back to the frontend via events, not command return values.

## Architectural Patterns

### Pattern 1: Thin Commands, Fat Engines

**What:** Tauri commands are entry points only — they validate input, call into domain engines (git/, http/), and return results. No business logic inside command handlers.

**When to use:** Always. Commands are the IPC boundary. Keeping them thin means the same logic is testable without a running Tauri instance.

**Trade-offs:** Slightly more files, but commands become trivial and engines are unit-testable with standard Rust tests.

**Example:**
```rust
// commands/http_request.rs — thin handler
#[tauri::command]
pub async fn send_request(
    request: RequestPayload,
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<HttpResponse, String> {
    let env = state.lock().unwrap().active_env.clone();
    http::execute::send(request, env).await.map_err(|e| e.to_string())
}

// http/execute.rs — the actual logic, testable independently
pub async fn send(req: RequestPayload, env: ResolvedEnv) -> anyhow::Result<HttpResponse> { ... }
```

### Pattern 2: Events for Push, Commands for Pull

**What:** Tauri supports two IPC directions. Use `invoke()` (commands) when the frontend asks for something. Use `emit()` + `listen()` (events) when the Rust backend needs to push updates to the frontend unprompted.

**When to use:** Sync status updates, conflict notifications, and offline/online state changes all push from Rust to React via events. Sending a request, reading a collection, or saving a file all pull via commands.

**Trade-offs:** Events are not type-safe end-to-end (JSON payload, no Rust return type). Commands provide typed Results. Mix appropriately.

**Example:**
```rust
// background.rs — Rust pushes sync events
app_handle.emit("sync:status", SyncStatus { state: "pushing" }).unwrap();
app_handle.emit("sync:conflict", ConflictPayload { file: "requests/get-users.json" }).unwrap();
```

```typescript
// stores/workspaceStore.ts — React listens
import { listen } from '@tauri-apps/api/event';
listen<SyncStatus>('sync:status', (e) => set({ syncState: e.payload.state }));
```

### Pattern 3: Background Sync Loop in Setup

**What:** The git sync loop is a long-lived background task spawned in `lib.rs` setup, not triggered by commands. It runs independently: debounced commit+push on FS changes, periodic pull every N minutes, and a focus pull on app foreground.

**When to use:** Any operation that must happen without user action. Do not try to implement this as a command the frontend calls on a timer — that couples sync lifecycle to frontend state.

**Trade-offs:** The background task needs a cloned `AppHandle` to access state and emit events. Must be spawned with `tauri::async_runtime::spawn()`, not `tokio::spawn()` (the latter panics in Tauri v2's runtime context).

**Example:**
```rust
// lib.rs
.setup(|app| {
    let handle = app.handle().clone();
    tauri::async_runtime::spawn(async move {
        background::run_sync_loop(handle).await;
    });
    Ok(())
})
```

### Pattern 4: File-Per-Request Data Model

**What:** Each HTTP request is one JSON file on disk. Folders map to filesystem directories. Collections map to the repo root or a subdirectory. This is the same model Bruno uses and why git diffs are human-readable.

**When to use:** This is the core storage contract for Dispatch. Every read/write of collection data goes through this layer.

**Trade-offs:** No atomic cross-file transactions. Last-write-wins at the file level is acceptable — stated requirement. Conflict resolution is: pull, check for diverged files, notify user.

```
workspace/
├── collection.json          # Collection metadata (name, description)
├── environments/
│   ├── dev.json             # Non-secret vars only — committed
│   └── prod.json
└── requests/
    ├── auth/
    │   ├── login.json       # Single request definition
    │   └── refresh.json
    └── users/
        └── get-users.json
```

## Data Flow

### Request Execution Flow

```
User clicks "Send"
    |
requestStore.dispatch(sendRequest)
    |
api/requests.ts: invoke('send_request', payload)
    |
[IPC Bridge]
    |
commands/http_request.rs: send_request()
    |
http/execute.rs: build reqwest client, apply headers, resolve body
    |
Target API server (external network)
    |
http/execute.rs: parse status, headers, body, timing
    |
commands/http_request.rs: return Ok(HttpResponse)
    |
[IPC Bridge] → Promise resolves in TS
    |
api/requests.ts: typed HttpResponse
    |
responseStore.setResponse(requestId, response)
    |
ResponseViewer re-renders
```

### Collection Edit + Sync Flow

```
User edits request (URL, method, body, etc.)
    |
requestStore: update draft state (no disk write yet)
    |
User saves (Cmd+S or auto-save after debounce)
    |
api/collections.ts: invoke('save_request', { requestId, data })
    |
commands/collections.rs: write JSON file to workspace path
    |
[Disk write complete]
    |
background sync loop detects FS change (or receives signal)
    |
git/sync.rs: stage modified file, commit "auto: update request"
    |
git/sync.rs: push to GitHub remote
    |
app_handle.emit("sync:status", { state: "idle" })
    |
workspaceStore receives event → updates sync indicator in UI
```

### Sync Pull Flow (incoming changes)

```
Periodic timer fires (or app comes to foreground)
    |
background.rs: git/sync.rs::pull()
    |
    ├── No conflict: merge fast-forward
    │       |
    │       collectionStore reload from disk (full re-read)
    │       |
    │       app_handle.emit("collections:refreshed")
    │
    └── Conflict detected (diverged files)
            |
            git/conflict.rs: accept remote (last-write-wins)
            |
            app_handle.emit("sync:conflict", { files: [...] })
            |
            UI shows conflict notification with file names
```

### Variable Resolution Flow

```
User types {{baseUrl}}/users in URL field
    |
lib/variableResolver.ts: scan active environment
    |
envStore.getResolved() → { baseUrl: "https://api.example.com" }
    |
lib/variableResolver.ts: substitute → "https://api.example.com/users"
    |
Display resolved URL in preview (not stored — runtime only)
    |
On send: resolved values passed in RequestPayload to Rust
         (Rust does NOT re-resolve — frontend is source of truth for env)
```

### Secret Storage Flow

```
User saves secret env var (marked as secret)
    |
api/environments.ts: invoke('save_secret', { key, value })
    |
commands/environments.rs: secrets::write(key, value)
    |
secrets.rs: keyring::Entry::new("dispatch", key).set_password(value)
    |
macOS Keychain — never written to disk, never committed to git

Non-secret vars:
    |
commands/environments.rs: write to environments/[env-name].json
    |
Git tracks this file — shared with teammates
```

## Component Boundaries

| Boundary | Communication | Direction | Notes |
|----------|---------------|-----------|-------|
| React components ↔ Zustand stores | Subscribe / dispatch | Bidirectional | Standard React patterns |
| Zustand stores ↔ IPC layer (api/) | Function call | Store → api/ | api/ returns typed Promise |
| IPC layer ↔ Tauri commands | `invoke()` | Frontend → Rust | Serialized via JSON |
| Tauri commands ↔ Rust engines | Function call | Commands → engines | Commands stay thin |
| Rust engines ↔ Filesystem | fs read/write | Engines → FS | serde_json for JSON files |
| Rust engines ↔ Keychain | keyring crate | Secrets module → OS | macOS Keychain only |
| Background loop → Frontend | `emit()` events | Rust → React | Sync status, conflicts, reload |
| Git engine ↔ GitHub remote | git2 fetch/push | Rust → network | Uses stored GitHub token |
| HTTP engine ↔ Target API | reqwest | Rust → network | TLS, redirects, timeouts |

## Suggested Build Order

Dependencies drive this order. Each layer must exist before what depends on it.

### Layer 1: Core IPC Skeleton
**What:** Scaffolded Tauri project with one working round-trip command.
**Why first:** Validates the toolchain. Everything else is built on this IPC pattern.
**Outputs:** `src-tauri/` compiles, `invoke('ping')` works from React.

### Layer 2: Data Model + File I/O
**What:** Collection/folder/request JSON schema, read/write commands, no git yet.
**Why:** The file format is the single most load-bearing decision. Define it before anything reads or writes it.
**Outputs:** `commands/collections.rs`, collection JSON schema, `api/collections.ts`.

### Layer 3: HTTP Execution Engine
**What:** `send_request` command using reqwest — all methods, headers, body, response struct.
**Why:** This is the core MVP. A user can send a request before any git/auth features exist.
**Outputs:** `http/execute.rs`, `commands/http_request.rs`, response viewer in React.

### Layer 4: Environment Variables
**What:** Env CRUD, variable substitution (frontend), secret storage via keyring.
**Why:** Immediately needed alongside HTTP — requests without variable support are severely limited.
**Outputs:** `commands/environments.rs`, `secrets.rs`, `envStore.ts`, resolver in `lib/`.

### Layer 5: GitHub Auth
**What:** Device flow OAuth, store token in keyring, GitHub REST API calls for repo list.
**Why:** Auth gates everything sync-related. Must exist before clone/push/pull.
**Outputs:** `commands/auth.rs`, `api/auth.ts`, `workspaceStore.ts` auth state.

### Layer 6: Git Sync Engine
**What:** Clone repo, manual sync command, conflict detection with last-write-wins.
**Why:** git2 integration is complex. Build synchronous first, validate against real repos.
**Outputs:** `git/clone.rs`, `git/sync.rs`, `git/conflict.rs`, `commands/workspace.rs`.

### Layer 7: Background Sync Loop
**What:** Auto debounce-commit, periodic pull, focus pull, sync status events to frontend.
**Why:** Background loop depends on the sync engine working correctly first.
**Outputs:** `background.rs`, `lib.rs` setup hook, `sync:status` / `sync:conflict` event listeners in React.

### Layer 8: Polish Features
**What:** cURL import/export, Cmd+K fuzzy search, drag-and-drop, keyboard shortcuts.
**Why:** These are enhancers, not blockers. Build them last on a stable core.
**Outputs:** `lib/curlParser.ts`, `features/search/`, drag-and-drop in collection tree.

## Anti-Patterns

### Anti-Pattern 1: Business Logic in Tauri Commands

**What people do:** Write HTTP execution, file parsing, or git operations directly inside `#[tauri::command]` functions in `commands/*.rs`.
**Why it's wrong:** Commands become untestable without a running app. Logic gets duplicated when called from background tasks. Files balloon to hundreds of lines.
**Do this instead:** Commands call into `http::execute`, `git::sync`, or `collections::read`. Keep commands under ~20 lines — validate, delegate, return.

### Anti-Pattern 2: `tokio::spawn()` in Tauri v2

**What people do:** Use `tokio::spawn()` directly for background tasks, especially inside event listeners.
**Why it's wrong:** Tauri v2 owns the Tokio runtime. Calling `tokio::spawn()` outside the runtime context panics with "no reactor running."
**Do this instead:** Use `tauri::async_runtime::spawn()` exclusively. Spawn all background tasks in the setup hook where the runtime is active.

### Anti-Pattern 3: Raw `invoke()` in Components

**What people do:** Call `invoke('send_request', payload)` directly inside React components.
**Why it's wrong:** No type safety at the call site. Command names are stringly-typed strings. Impossible to refactor without grep-and-pray. Business logic bleeds into UI.
**Do this instead:** All `invoke()` calls live in `src/api/`. Components call typed functions like `api.requests.send(payload)`. Rename a command? Change it in one place.

### Anti-Pattern 4: Storing Secrets in JSON Files

**What people do:** Write all environment variables (including tokens, API keys) to the env JSON file committed to git.
**Why it's wrong:** Secrets leak to anyone with repo read access. Git history is permanent — a committed secret is compromised even if deleted later.
**Do this instead:** Variables marked as "secret" in the UI are routed through `secrets.rs` to the OS keychain. The committed env JSON contains only non-secret vars. Secrets are re-hydrated from keychain at runtime and never serialized to disk.

### Anti-Pattern 5: One Giant Zustand Store

**What people do:** Put all application state in a single `useAppStore` — collections, active request, response, env, auth, sync status.
**Why it's wrong:** Any state update re-renders every subscriber. A response arriving re-renders the collection sidebar. Debugging state transitions is painful.
**Do this instead:** Multiple focused stores: `collectionStore`, `requestStore`, `responseStore`, `envStore`, `workspaceStore`. Each re-renders only what cares about that domain.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| GitHub REST API | reqwest from Rust; device flow for auth | Token stored in keyring; used for repo list + clone URL |
| GitHub remote (git) | git2 crate; ssh or HTTPS with token | Stored credential via git2 callbacks |
| Target APIs (user's endpoints) | reqwest via `send_request` command | All TLS, redirect, timeout handled in Rust |
| macOS Keychain | `keyring` crate (wraps Security.framework) | Read/write on demand; no caching in AppState |

### Internal Boundaries

| Boundary | Communication | Considerations |
|----------|---------------|----------------|
| Frontend ↔ Collection Files | Via `invoke()` commands | Frontend never touches FS directly; Rust mediates all reads/writes |
| Background loop ↔ Commands | Shared `AppState` via `Mutex<T>` | Background reads workspace path; commands write it on connect |
| Git engine ↔ Secrets store | Direct Rust call in `commands/workspace.rs` | Token retrieved from keyring before each git operation needing auth |
| Frontend ↔ Sync loop | Tauri events only — no commands | Sync loop is fire-and-forget; events are the only feedback channel |

## Sources

- [Tauri v2 Architecture](https://v2.tauri.app/concept/architecture/) — HIGH confidence
- [Tauri v2 Process Model](https://v2.tauri.app/concept/process-model/) — HIGH confidence
- [Tauri v2 Project Structure](https://v2.tauri.app/start/project-structure/) — HIGH confidence
- [Tauri v2 State Management](https://v2.tauri.app/develop/state-management/) — HIGH confidence
- [Tauri v2 Calling Rust from Frontend](https://v2.tauri.app/develop/calling-rust/) — HIGH confidence
- [Tauri v2 HTTP Plugin](https://v2.tauri.app/plugin/http-client/) — HIGH confidence
- [Organizing Tauri Commands in Rust](https://dev.to/n3rd/how-to-reasonably-keep-your-tauri-commands-organized-in-rust-2gmo) — MEDIUM confidence
- [Long-running async tasks in Tauri v2](https://sneakycrow.dev/blog/2024-05-12-running-async-tasks-in-tauri-v2) — MEDIUM confidence
- [Tauri v2 tokio::spawn panic issue](https://github.com/tauri-apps/tauri/issues/10289) — HIGH confidence (bug confirmed in official repo)
- [Bruno file-based collection model](https://www.usebruno.com/) — MEDIUM confidence (prior art reference)

---
*Architecture research for: Dispatch — native Mac HTTP client with git-based sync*
*Researched: 2026-03-23*
