# Roadmap: Dispatch

## Overview

Dispatch is built in strict dependency order: the file model before git, auth before sync, sync before the background loop. Eight phases deliver a usable HTTP client as early as Phase 3, then layer in the git collaboration features that are the product's core differentiator. By Phase 8, the app is polished enough to replace Postman for a development team's daily workflow.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Tauri project scaffolding with working IPC, HeroUI, and app shell layout (completed 2026-03-24)
- [x] **Phase 2: Data Model** - File-per-request JSON schema, Rust read/write commands, and collection tree UI (completed 2026-03-24)
- [x] **Phase 3: HTTP Engine** - Send requests and view responses — 60 seconds to first request from launch (completed 2026-03-25)
- [x] **Phase 4: Environments & Secrets** - Environment variables with secret storage and variable substitution (completed 2026-03-25)
- [x] **Phase 5: GitHub Auth** - OAuth device flow login, repo listing, workspace connect/disconnect (completed 2026-03-25)
- [ ] **Phase 6: Git Sync Engine** - Synchronous clone/commit/push/pull via git actor, conflict notification
- [ ] **Phase 7: Background Sync Loop** - Invisible auto-sync, offline queue, sync status indicator
- [ ] **Phase 8: Polish & Power Features** - cURL import/export, Cmd+K search, drag-and-drop, keyboard shortcuts

## Phase Details

### Phase 1: Foundation
**Goal**: The Tauri toolchain is validated and the app shell renders correctly before any feature work begins
**Depends on**: Nothing (first phase)
**Requirements**: APP-01, APP-02, APP-03
**Success Criteria** (what must be TRUE):
  1. App launches and renders a three-panel layout (sidebar, request editor, response viewer) with a top bar
  2. A Tauri command round-trip (e.g., ping) completes successfully between Rust backend and React frontend
  3. HeroUI components render correctly with Tailwind CSS styling
  4. Hot module replacement works in development mode (frontend changes reflect without full reload)
**Plans**: 2 plans
Plans:
- [x] 01-01-PLAN.md — Scaffold Tauri project, install deps, configure HeroUI/Tailwind, Rust ping command, vitest
- [x] 01-02-PLAN.md — Three-panel app shell layout with TopBar, Sidebar, RightPanel, visual verification
**UI hint**: yes

### Phase 2: Data Model
**Goal**: The file-per-request JSON schema is defined and locked, with working Rust I/O commands and a rendered collection tree
**Depends on**: Phase 1
**Requirements**: COLL-01, COLL-02, COLL-03, COLL-04
**Success Criteria** (what must be TRUE):
  1. User can create, rename, and delete collections that persist to JSON files on disk
  2. User can create, rename, and delete nested subfolders within collections
  3. User can create, rename, delete, and duplicate requests within collections
  4. The sidebar tree renders the workspace > collections > folders > requests hierarchy correctly
**Plans**: 2 plans
Plans:
- [x] 02-01-PLAN.md — Rust data engine (types, slugify, I/O, CRUD commands) and frontend data layer (types, store, API wrappers)
- [x] 02-02-PLAN.md — Collection tree UI components (recursive tree, method badges, context menu, inline rename, delete modal)
**UI hint**: yes

### Phase 3: HTTP Engine
**Goal**: Users can send HTTP requests and view formatted responses — the core job is functional before any auth or git feature exists
**Depends on**: Phase 2
**Requirements**: HTTP-01, HTTP-02, HTTP-03, HTTP-04, HTTP-05, HTTP-06, HTTP-07, RESP-01, RESP-02, RESP-03, RESP-04, RESP-05
**Success Criteria** (what must be TRUE):
  1. User can send GET, POST, PUT, and DELETE requests and receive a response
  2. User can configure URL, query parameters, headers, JSON body, and bearer token auth from the request editor
  3. User sees the response status code (color-coded), time in milliseconds, formatted JSON body with syntax highlighting, and response headers
  4. User sees a loading state while the request is in flight
  5. User sees a raw text fallback for non-JSON responses
**Plans**: 3 plans
Plans:
- [x] 03-01-PLAN.md — Rust HTTP executor (send_request, load_request, save_request commands), requestStore, API wrappers
- [x] 03-02-PLAN.md — Request editor UI (UrlBar, KeyValueEditor, BodyEditor, AuthEditor, tab wiring)
- [x] 03-03-PLAN.md — Response viewer UI (StatusBar, JsonViewer tokenizer, four-state display)
**UI hint**: yes

### Phase 4: Environments & Secrets
**Goal**: Users can create environments with variables and secrets, and variable substitution works throughout the request editor
**Depends on**: Phase 3
**Requirements**: ENV-01, ENV-02, ENV-03, ENV-04, ENV-05, ENV-06
**Success Criteria** (what must be TRUE):
  1. User can create, edit, and delete environments and select the active environment from the top bar
  2. User can add key-value variables with a "secret" toggle; secret values are stored locally only and never written to disk in the workspace
  3. {{variable}} references in URL, headers, query params, body, and auth token resolve to their values from the active environment
  4. User sees a visual indicator when a {{variable}} reference in a request cannot be resolved
**Plans**: 3 plans
Plans:
- [x] 04-01-PLAN.md — Rust environment I/O + secrets store + IPC commands, frontend types/store/API, variable utilities
- [x] 04-02-PLAN.md — Environment manager modal (two-pane), TopBar dropdown wiring, variable editor with secret toggle
- [x] 04-03-PLAN.md — Variable substitution in sendRequest, UrlBar highlighting overlay, unresolved variable badge
**UI hint**: yes

### Phase 5: GitHub Auth
**Goal**: Users can log in with GitHub, browse their repos, and connect a repo as a workspace — auth state is production-ready with token expiry handling
**Depends on**: Phase 4
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. User can initiate GitHub OAuth device flow login from the app and complete it in a browser
  2. User can see a list of their personal and organization GitHub repos after login
  3. User can connect a GitHub repo as a workspace (clones the repo locally) and disconnect it (removes the local clone)
  4. User can switch between connected workspaces via the sidebar switcher
  5. App continues to function in local-only mode if the user has not logged in to GitHub
**Plans**: 3 plans
Plans:
- [x] 05-01-PLAN.md — Rust backend: auth/github/workspace modules, IPC commands, deps (git2, secure-storage)
- [x] 05-02-PLAN.md — Frontend auth flow: authStore, sonner toasts, LoginModal, RepoBrowserModal
- [x] 05-03-PLAN.md — Frontend workspace UI: WorkspaceSwitcher, TopBar auth states, DisconnectConfirmModal, workspace switch wiring
**UI hint**: yes

### Phase 6: Git Sync Engine
**Goal**: Workspaces sync to GitHub through manual and triggered operations, with conflict notification, using a thread-safe git actor
**Depends on**: Phase 5
**Requirements**: SYNC-04, SYNC-05
**Success Criteria** (what must be TRUE):
  1. A connected workspace can commit and push local changes to the GitHub remote
  2. A connected workspace can pull remote changes to the local clone
  3. The sync status indicator in the top bar reflects the current state (synced / syncing / conflict)
  4. When a last-write-wins conflict is resolved, the user receives a notification identifying the affected file
**Plans**: 2 plans
Plans:
- [x] 06-01-PLAN.md — Rust git actor (mpsc channel, spawn_blocking ops), commit/push/pull with conflict resolution, IPC commands
- [ ] 06-02-PLAN.md — Frontend sync store, SyncStatusChip, TopBar/WorkspaceSwitcher integration, conflict toasts, pull-on-switch
**UI hint**: yes

### Phase 7: Background Sync Loop
**Goal**: Sync is invisible and automatic — changes push after brief inactivity, pulls happen on schedule and focus, offline changes queue and push on reconnect
**Depends on**: Phase 6
**Requirements**: SYNC-01, SYNC-02, SYNC-03, SYNC-06
**Success Criteria** (what must be TRUE):
  1. Changes committed to a collection automatically push to GitHub within ~3-5 seconds of inactivity, without any user action
  2. The workspace pulls from remote approximately every 30 seconds and immediately when the app regains focus
  3. Changes made while offline are queued locally and automatically pushed when connectivity is restored
  4. The sync status indicator correctly shows syncing, synced, offline, and conflict states throughout the cycle
**Plans**: 2 plans
Plans:
- [ ] 01-01-PLAN.md — Scaffold Tauri project, install deps, configure HeroUI/Tailwind, Rust ping command, vitest
- [ ] 01-02-PLAN.md — Three-panel app shell layout with TopBar, Sidebar, RightPanel, visual verification

### Phase 8: Polish & Power Features
**Goal**: The app is fast to navigate and fully keyboard-driven, with cURL import/export and fuzzy search completing the power-user workflow
**Depends on**: Phase 7
**Requirements**: COLL-05, COLL-06, CURL-01, CURL-02, CURL-03, CURL-04, NAV-01, NAV-02, NAV-03, KEY-01, KEY-02, KEY-03, KEY-04, KEY-05, KEY-06, KEY-07, KEY-08
**Success Criteria** (what must be TRUE):
  1. User can drag and drop to reorder requests and folders within a collection, and move them between collections
  2. User can paste a cURL command in the request panel and have it auto-detected and imported, or import via context menu
  3. User can copy any request as a cURL command (Cmd+Shift+C or context menu) with variables resolved from the active environment
  4. User can open Cmd+K search, type a fuzzy query, and navigate directly to a matching request
  5. All keyboard shortcuts (Cmd+Enter, Cmd+N, Cmd+Shift+N, Cmd+K, Cmd+E, Cmd+Shift+C, Cmd+W, Cmd+S) work from anywhere in the app
**Plans**: 2 plans
Plans:
- [ ] 01-01-PLAN.md — Scaffold Tauri project, install deps, configure HeroUI/Tailwind, Rust ping command, vitest
- [ ] 01-02-PLAN.md — Three-panel app shell layout with TopBar, Sidebar, RightPanel, visual verification
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | Complete   | 2026-03-24 |
| 2. Data Model | 2/2 | Complete   | 2026-03-24 |
| 3. HTTP Engine | 3/3 | Complete   | 2026-03-25 |
| 4. Environments & Secrets | 3/3 | Complete   | 2026-03-25 |
| 5. GitHub Auth | 3/3 | Complete   | 2026-03-25 |
| 6. Git Sync Engine | 1/2 | In Progress|  |
| 7. Background Sync Loop | 0/? | Not started | - |
| 8. Polish & Power Features | 0/? | Not started | - |
