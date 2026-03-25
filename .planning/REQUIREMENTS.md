# Requirements: Dispatch

**Defined:** 2026-03-23
**Core Value:** Teams can share and collaborate on API request collections through git — without anyone needing to know git is involved.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### HTTP Core

- [x] **HTTP-01**: User can send GET, POST, PUT, and DELETE requests from the request editor
- [x] **HTTP-02**: User can enter a URL with variable highlighting ({{var}} shown distinctly)
- [x] **HTTP-03**: User can add, edit, and toggle query parameters via key-value editor
- [x] **HTTP-04**: User can add, edit, and toggle request headers via key-value editor
- [x] **HTTP-05**: User can write a JSON request body with syntax highlighting (shown for POST/PUT)
- [x] **HTTP-06**: User can set bearer token authentication for a request
- [x] **HTTP-07**: User sees a loading state while a request is in flight

### Response

- [x] **RESP-01**: User sees the response status code with color coding (2xx green, 4xx yellow, 5xx red)
- [x] **RESP-02**: User sees the response time in milliseconds
- [x] **RESP-03**: User sees the response body with JSON syntax highlighting and formatting
- [x] **RESP-04**: User sees response headers in a collapsible section
- [x] **RESP-05**: User sees raw text fallback for non-JSON responses

### Collections

- [x] **COLL-01**: User sees a sidebar tree of workspaces > collections > folders > requests
- [x] **COLL-02**: User can create, rename, and delete collections
- [x] **COLL-03**: User can create, rename, and delete subfolders within collections (arbitrary nesting)
- [x] **COLL-04**: User can create, rename, delete, and duplicate requests
- [ ] **COLL-05**: User can drag and drop to reorder requests and folders within a collection
- [ ] **COLL-06**: User can drag and drop to move requests and folders between collections

### Environments

- [x] **ENV-01**: User can create, edit, and delete environments for a workspace
- [x] **ENV-02**: User can select an active environment from the top bar (global to workspace)
- [ ] **ENV-03**: User can add variables with a key-value editor and a "secret" toggle per variable
- [x] **ENV-04**: {{variable}} substitution works in URL, headers, query params, body, and auth token
- [x] **ENV-05**: Secret variable values are stored locally only and never committed to git
- [ ] **ENV-06**: User sees a visual indicator when a variable in a request cannot be resolved

### GitHub Auth

- [ ] **AUTH-01**: User can log in via GitHub OAuth device flow (browser-based code entry)
- [ ] **AUTH-02**: User can list accessible GitHub repos (personal + org) after login
- [ ] **AUTH-03**: User can connect a GitHub repo as a workspace (clones locally)
- [ ] **AUTH-04**: User can disconnect a workspace (removes local clone)
- [ ] **AUTH-05**: User can switch between connected workspaces via sidebar switcher

### Sync

- [ ] **SYNC-01**: Changes are automatically committed and pushed after ~2-3s of inactivity (debounce)
- [ ] **SYNC-02**: Workspace pulls from remote on a regular interval (~30s)
- [ ] **SYNC-03**: Workspace pulls immediately on focus/switch
- [ ] **SYNC-04**: Sync status indicator visible in the UI (synced / syncing / offline / conflict)
- [ ] **SYNC-05**: File-level last-write-wins conflict resolution with user notification
- [ ] **SYNC-06**: Changes queue locally when offline and push when connectivity returns

### Import/Export

- [ ] **CURL-01**: User can import a cURL command by pasting (Cmd+V auto-detect) in request panel
- [ ] **CURL-02**: User can import a cURL command via explicit action in collection context menu
- [ ] **CURL-03**: User can copy any request as cURL (context menu + Cmd+Shift+C)
- [ ] **CURL-04**: Exported cURL resolves variables from the active environment

### Search & Navigation

- [ ] **NAV-01**: User can open search with Cmd+K and search across request names, URLs, collection names
- [ ] **NAV-02**: Search uses fuzzy matching with ranked results
- [ ] **NAV-03**: Selecting a search result navigates directly to that request

### Keyboard Shortcuts

- [ ] **KEY-01**: Cmd+Enter sends the current request
- [ ] **KEY-02**: Cmd+N creates a new request
- [ ] **KEY-03**: Cmd+Shift+N creates a new collection
- [ ] **KEY-04**: Cmd+K opens search
- [ ] **KEY-05**: Cmd+E switches environment
- [ ] **KEY-06**: Cmd+Shift+C copies current request as cURL
- [ ] **KEY-07**: Cmd+W closes the current tab
- [ ] **KEY-08**: Cmd+S forces a sync

### App Shell

- [x] **APP-01**: User can send a request within 60 seconds of first launch, before any GitHub login
- [x] **APP-02**: App uses a three-panel layout: sidebar (tree), request editor (top-right), response viewer (bottom-right)
- [x] **APP-03**: Top bar shows workspace switcher, environment selector, and sync status

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Authentication

- **AUTH2-01**: Basic auth support for requests
- **AUTH2-02**: Additional HTTP methods (PATCH, HEAD, OPTIONS)

### Response

- **RESP2-01**: Response search/filter for large JSON payloads
- **RESP2-02**: SSL certificate verification toggle

### Collections

- **COLL2-01**: Collection-level default headers and auth settings
- **COLL2-02**: Code snippet generation (cURL, Python, JS fetch)

### Import

- **IMP2-01**: Postman collection import

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Pre/post-request scripts | Requires JS runtime sandbox, massively expands attack surface and maintenance burden |
| Test assertions / test runner | Turns HTTP client into CI tool — scope creep competing with dedicated tools |
| Request chaining | Deep complexity, requires execution engine, breaks "fire a request" mental model |
| Real-time collaboration | Requires WebSocket infrastructure and identity server — contradicts no-server architecture |
| Response history / logging | Unbounded disk growth, privacy concern — git commit history serves as the log |
| Mock server | Completely different problem domain — recommend Mockoon or Wiremock |
| WebSocket / GraphQL / gRPC | Each requires different UI paradigm and protocol implementation — REST only |
| File upload / multipart | Binary handling in file-based data model is problematic — JSON bodies only |
| Windows / Linux builds | macOS-first allows fast iteration — cross-platform later via Tauri |
| Cloud sync (non-GitHub) | Requires running a server and billing — contradicts no-server architecture |
| OpenAPI / Swagger import | Scope explosion — lossy import breeds support tickets |
| AI-assisted features | Unfocused, LLM costs, privacy concerns — can come later as polish |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| APP-01 | Phase 1 | Complete |
| APP-02 | Phase 1 | Complete |
| APP-03 | Phase 1 | Complete |
| COLL-01 | Phase 2 | Complete |
| COLL-02 | Phase 2 | Complete |
| COLL-03 | Phase 2 | Complete |
| COLL-04 | Phase 2 | Complete |
| HTTP-01 | Phase 3 | Complete |
| HTTP-02 | Phase 3 | Complete |
| HTTP-03 | Phase 3 | Complete |
| HTTP-04 | Phase 3 | Complete |
| HTTP-05 | Phase 3 | Complete |
| HTTP-06 | Phase 3 | Complete |
| HTTP-07 | Phase 3 | Complete |
| RESP-01 | Phase 3 | Complete |
| RESP-02 | Phase 3 | Complete |
| RESP-03 | Phase 3 | Complete |
| RESP-04 | Phase 3 | Complete |
| RESP-05 | Phase 3 | Complete |
| ENV-01 | Phase 4 | Complete |
| ENV-02 | Phase 4 | Complete |
| ENV-03 | Phase 4 | Pending |
| ENV-04 | Phase 4 | Complete |
| ENV-05 | Phase 4 | Complete |
| ENV-06 | Phase 4 | Pending |
| AUTH-01 | Phase 5 | Pending |
| AUTH-02 | Phase 5 | Pending |
| AUTH-03 | Phase 5 | Pending |
| AUTH-04 | Phase 5 | Pending |
| AUTH-05 | Phase 5 | Pending |
| SYNC-04 | Phase 6 | Pending |
| SYNC-05 | Phase 6 | Pending |
| SYNC-01 | Phase 7 | Pending |
| SYNC-02 | Phase 7 | Pending |
| SYNC-03 | Phase 7 | Pending |
| SYNC-06 | Phase 7 | Pending |
| COLL-05 | Phase 8 | Pending |
| COLL-06 | Phase 8 | Pending |
| CURL-01 | Phase 8 | Pending |
| CURL-02 | Phase 8 | Pending |
| CURL-03 | Phase 8 | Pending |
| CURL-04 | Phase 8 | Pending |
| NAV-01 | Phase 8 | Pending |
| NAV-02 | Phase 8 | Pending |
| NAV-03 | Phase 8 | Pending |
| KEY-01 | Phase 8 | Pending |
| KEY-02 | Phase 8 | Pending |
| KEY-03 | Phase 8 | Pending |
| KEY-04 | Phase 8 | Pending |
| KEY-05 | Phase 8 | Pending |
| KEY-06 | Phase 8 | Pending |
| KEY-07 | Phase 8 | Pending |
| KEY-08 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 53 total
- Mapped to phases: 53
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-23*
*Last updated: 2026-03-23 after roadmap creation*
