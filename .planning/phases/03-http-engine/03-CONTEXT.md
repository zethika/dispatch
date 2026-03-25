# Phase 3: HTTP Engine - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can send HTTP requests (GET, POST, PUT, DELETE) and view formatted responses. This phase delivers the full request editor (URL, params, headers, body, auth), the Rust HTTP execution layer via Tauri IPC, and the response viewer (status, timing, body, headers). No environment variables, no git sync, no keyboard shortcuts beyond the Send button.

Requirements covered: HTTP-01, HTTP-02, HTTP-03, HTTP-04, HTTP-05, HTTP-06, HTTP-07, RESP-01, RESP-02, RESP-03, RESP-04, RESP-05

</domain>

<decisions>
## Implementation Decisions

### Request Editor Layout
- **D-01:** Tab strip below the URL bar: Params | Headers | Body | Auth. One tab visible at a time.
- **D-02:** URL bar row: method dropdown (left), URL input (center, flex-grow), Send button (right). Same row, always visible.
- **D-03:** Body tab is always visible in the tab strip regardless of HTTP method — some APIs accept bodies on GET/DELETE.

### Key-Value Editor (Params & Headers)
- **D-04:** Each row has a checkbox (enable/disable) and an X button (delete). Disabled rows stay visible but grayed out and excluded from the request.
- **D-05:** An "+ Add" row at the bottom to add new key-value pairs.

### Body Editor
- **D-06:** Plain textarea with JSON syntax highlighting — no CodeMirror/Monaco. Lightweight, fast, low dependency.
- **D-07:** Syntax highlighting via styled/colored text rendering, not an external editor library.

### Response Display
- **D-08:** Status bar at top of response panel: status code (color-coded per Phase 2 colors — 2xx green, 4xx yellow, 5xx red), response time in ms, response size.
- **D-09:** Below status bar, tabs: Body | Headers. Body is the default tab.
- **D-10:** JSON response body is always pretty-printed (formatted/indented). A copy button copies raw JSON to clipboard.
- **D-11:** CSS-based JSON syntax highlighting — parse JSON tokens and render with colored spans (keys, strings, numbers, booleans distinct). No external highlighting library.
- **D-12:** Non-JSON responses show raw text fallback (RESP-05).

### Loading State
- **D-13:** Response panel shows a centered spinner with "Sending request..." text while request is in flight.
- **D-14:** Send button shows a loading/disabled state during the request.

### Error Display
- **D-15:** Network errors displayed in the response panel itself — red status area with error type (timeout, DNS failure, connection refused) and raw error message. The error IS the response, no toasts or modals.

### Send Button
- **D-16:** Send button is in the URL bar row, right side, always visible.
- **D-17:** Cmd+Enter shortcut deferred to Phase 8 (keyboard shortcuts). Send button is the only trigger in this phase.

### Claude's Discretion
- Exact tab styling (underline vs pill vs flat)
- Key-value editor empty row behavior and focus management
- JSON body textarea sizing and resize handles
- Response status code text (e.g., "200 OK" vs just "200")
- Spinner animation style
- Copy button placement and feedback (tooltip vs brief flash)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Model & Schema
- `SPECS.md` — Full v1 specification including request file JSON schema (method, url, headers, queryParams, body, auth fields)

### Requirements
- `.planning/REQUIREMENTS.md` — HTTP-01 through HTTP-07 (request editor), RESP-01 through RESP-05 (response viewer)

### Prior Phase Context
- `.planning/phases/01-foundation/01-CONTEXT.md` — Panel layout, theme (green primary), first-launch state
- `.planning/phases/02-data-model/02-CONTEXT.md` — Data model decisions, collection store patterns, method color scheme

### Project Context
- `.planning/PROJECT.md` — Core value, constraints, tech stack

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/layout/RequestEditor.tsx` — Existing shell with method dropdown and URL input. Will be expanded with tab strip, key-value editors, body editor, and auth section.
- `src/components/layout/ResponseViewer.tsx` — Existing empty shell ("Response will appear here"). Will be replaced with status bar, body/headers tabs, and JSON viewer.
- `src/stores/collectionStore.ts` — Zustand store pattern (create store, export hook). New request execution state should follow same pattern.
- `src/types/collections.ts` — `RequestFile` type already defines method, url, headers, queryParams, body, auth fields. This is the data shape the editor will read/write.
- `src-tauri/src/commands/mod.rs` — Command registration pattern with tauri-specta. New HTTP execution command follows this pattern.

### Established Patterns
- Zustand for global UI state
- tauri-specta for typed IPC (Rust commands auto-generate TypeScript bindings)
- HeroUI v2 components with Tailwind v3 styling
- CSS grid for panel layout (RightPanel uses gridTemplateRows)
- Thin Rust commands delegating to logic modules (`commands/collections.rs` delegates to `collections/io.rs`)

### Integration Points
- `RequestEditor.tsx` — Expanding from placeholder to full editor
- `ResponseViewer.tsx` — Expanding from placeholder to full response display
- `RightPanel.tsx` — Already splits request/response with resizable handle
- `collectionStore.ts` — Active request selection (`activeRequestId`) feeds request data into the editor
- New Rust command: `send_request` — takes method, URL, headers, params, body, auth; returns status, headers, body, timing
- `src-tauri/Cargo.toml` — `tauri-plugin-http` already in dependencies (re-exports reqwest)

</code_context>

<specifics>
## Specific Ideas

- Tab strip should feel like Postman/Insomnia — clean horizontal tabs, familiar to API tool users
- Response JSON should be immediately readable — well-formatted, color-coded, scrollable
- Error display should be informative, not scary — show what went wrong and the raw error so users can debug
- The whole request-to-response flow should feel instant and responsive — no unnecessary transitions or delays

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-http-engine*
*Context gathered: 2026-03-25*
