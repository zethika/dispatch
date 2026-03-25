# Phase 03: HTTP Engine - Research

**Researched:** 2026-03-25
**Domain:** Tauri IPC HTTP execution, request editor UI, response viewer UI, custom JSON syntax highlighting
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Tab strip below the URL bar: Params | Headers | Body | Auth. One tab visible at a time.
- **D-02:** URL bar row: method dropdown (left), URL input (center, flex-grow), Send button (right). Same row, always visible.
- **D-03:** Body tab is always visible in the tab strip regardless of HTTP method.
- **D-04:** Key-value editor rows have checkbox (enable/disable) and X button (delete). Disabled rows stay visible but grayed out and excluded from the request.
- **D-05:** An "+ Add" row at the bottom to add new key-value pairs.
- **D-06:** Plain textarea with JSON syntax highlighting — no CodeMirror/Monaco.
- **D-07:** Syntax highlighting via styled/colored text rendering, not an external editor library.
- **D-08:** Status bar at top: status code (color-coded 2xx green / 4xx yellow / 5xx red), response time in ms, response size.
- **D-09:** Below status bar, tabs: Body | Headers. Body is default.
- **D-10:** JSON response body always pretty-printed. Copy button copies raw JSON to clipboard.
- **D-11:** CSS-based JSON syntax highlighting — parse JSON tokens and render colored spans. No external highlighting library.
- **D-12:** Non-JSON responses show raw text fallback.
- **D-13:** Response panel shows centered spinner with "Sending request..." text while in flight.
- **D-14:** Send button shows loading/disabled state during request.
- **D-15:** Network errors displayed in response panel itself — red status area with error type and raw message. No toasts/modals.
- **D-16:** Send button in URL bar row, right side, always visible.
- **D-17:** Cmd+Enter deferred to Phase 8. Send button is the only trigger.

### Claude's Discretion

- Exact tab styling (underline vs pill vs flat)
- Key-value editor empty row behavior and focus management
- JSON body textarea sizing and resize handles
- Response status code text (e.g., "200 OK" vs just "200")
- Spinner animation style
- Copy button placement and feedback (tooltip vs brief flash)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HTTP-01 | User can send GET, POST, PUT, and DELETE requests from the request editor | Rust `send_request` command via tauri-plugin-http/reqwest; method dropdown in UI |
| HTTP-02 | User can enter a URL with variable highlighting ({{var}} shown distinctly) | Custom URL input with span rendering for `{{...}}` tokens; deferred to Phase 4 for resolution, but visual distinction scoped here |
| HTTP-03 | User can add, edit, and toggle query parameters via key-value editor | KeyValueEditor component — checkbox toggle, delete button, add row |
| HTTP-04 | User can add, edit, and toggle request headers via key-value editor | Same KeyValueEditor component reused for headers tab |
| HTTP-05 | User can write a JSON request body with syntax highlighting | Textarea + tokenizer for CSS-based highlighting (D-06/D-07) |
| HTTP-06 | User can set bearer token authentication | Auth tab with a single token input field |
| HTTP-07 | User sees a loading state while a request is in flight | Zustand `isLoading` flag; spinner in response panel + disabled Send button |
| RESP-01 | User sees response status code with color coding | Status bar component: green/yellow/red per range |
| RESP-02 | User sees response time in milliseconds | Rust measures `Instant::now()` before/after reqwest call; returned as `duration_ms: u64` |
| RESP-03 | User sees response body with JSON syntax highlighting and formatting | JSON tokenizer renders colored `<span>` elements in response panel |
| RESP-04 | User sees response headers in a collapsible section | Headers tab in response viewer — key-value list |
| RESP-05 | User sees raw text fallback for non-JSON responses | Detect non-JSON by attempting parse; show `<pre>` with raw text |
</phase_requirements>

---

## Summary

Phase 3 delivers the core job of an HTTP client: send a request, see a response. The implementation splits cleanly into two areas: (1) a new Rust command `send_request` that executes HTTP via the already-present `tauri-plugin-http`/reqwest stack and returns a typed response payload, and (2) a full replacement of the `RequestEditor` and `ResponseViewer` component shells with functional UI.

The Rust side is straightforward. `tauri-plugin-http` re-exports reqwest and is already listed as a project dependency in CLAUDE.md, but it is not yet in `src-tauri/Cargo.toml` — it must be added. The command takes the request fields (method, url, headers, params, body, auth) as arguments, builds a reqwest `Client`, executes the request inside `tauri::async_runtime::spawn`, and returns status code, headers, body string, and duration in milliseconds. Timing is measured with `std::time::Instant`.

The frontend side requires: a new `requestStore` (Zustand) to hold the active request's draft state and the latest response, a reusable `KeyValueEditor` component shared by the Params and Headers tabs, a CSS-based JSON tokenizer for both the body textarea (input highlighting) and the response viewer (output highlighting), and a `ResponseViewer` that handles all four states: empty, loading, success, and error.

**Primary recommendation:** Add `tauri-plugin-http` to Cargo.toml, implement `send_request` as a thin async Rust command delegating to an `http/executor.rs` module (matching the Phase 2 thin-command pattern), and build all UI components in a new `src/features/http/` directory.

---

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tauri-plugin-http | 2.5.7 | reqwest re-export for Rust HTTP execution | Per CLAUDE.md: all HTTP goes through Rust; **not yet in Cargo.toml — must be added** |
| reqwest (via plugin) | 0.12.x | HTTP client | Do not add separately; use `tauri_plugin_http::reqwest` |
| zustand | 5.x | Request draft state + response state | Matches existing collectionStore pattern |
| @heroui/react | 2.7.11 (pinned) | Tab, Input, Button, Spinner, Checkbox components | Project-pinned; do not upgrade |
| tailwindcss | 3.x | Utility styling | Required by HeroUI v2 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query | 5.x | Optional: wrap `send_request` invocation | Useful for loading/error states — but a simple useState + useCallback is also fine given the non-cacheable nature of HTTP requests; use TanStack Query only if team prefers consistent async patterns |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom JSON tokenizer | highlight.js / Prism.js | D-11 explicitly forbids external highlighting library; custom tokenizer is ~50 lines |
| Custom JSON tokenizer | Monaco / CodeMirror | D-06 explicitly forbids editor libraries |
| useState for request state | TanStack Query | HTTP request results are not cacheable in the traditional sense — each send is intentional. Simple useState is correct; TanStack Query adds unneeded stale-while-revalidate semantics |

**Installation (additions needed):**
```bash
# Cargo.toml — add:
# tauri-plugin-http = "2"
```

The tauri-plugin-http Tauri capability permission must also be added to `src-tauri/capabilities/default.json`.

**Version verification:** `tauri-plugin-http` 2.5.7 is confirmed in CLAUDE.md as of 2026-03-04.

---

## Architecture Patterns

### Recommended Project Structure

New files for this phase follow the established pattern:

```
src/
├── features/
│   └── http/                        # NEW — all HTTP engine UI
│       ├── KeyValueEditor.tsx        # reusable param/header rows
│       ├── BodyEditor.tsx            # textarea + CSS JSON highlight
│       ├── AuthEditor.tsx            # bearer token input
│       └── JsonViewer.tsx            # CSS-tokenized JSON response
├── components/layout/
│   ├── RequestEditor.tsx             # REPLACE shell — import feature components
│   └── ResponseViewer.tsx            # REPLACE shell — import JsonViewer, status bar
├── stores/
│   └── requestStore.ts               # NEW Zustand store (draft state + response)
└── api/
    └── http.ts                       # NEW invoke wrapper for send_request

src-tauri/src/
├── commands/
│   ├── mod.rs                        # ADD http module + register send_request
│   └── http.rs                       # NEW thin command delegate
└── http/
    ├── mod.rs                        # NEW module declaration
    └── executor.rs                   # NEW logic: build client, execute, time, return
```

### Pattern 1: Thin Rust Command (matches Phase 2 convention)

**What:** The command does only argument validation and path/handle extraction; all logic lives in a dedicated module.
**When to use:** All new Tauri commands. Established in Phase 2.

```rust
// src-tauri/src/commands/http.rs
use crate::http::executor;

#[tauri::command]
#[specta::specta]
pub async fn send_request(
    method: String,
    url: String,
    headers: Vec<KeyValueEntry>,
    query_params: Vec<KeyValueEntry>,
    body: Option<RequestBody>,
    auth: Option<RequestAuth>,
) -> Result<HttpResponse, String> {
    executor::execute(method, url, headers, query_params, body, auth)
        .await
        .map_err(|e| e.to_string())
}
```

```rust
// src-tauri/src/http/executor.rs
use tauri_plugin_http::reqwest;
use std::time::Instant;

pub async fn execute(
    method: String,
    url: String,
    headers: Vec<KeyValueEntry>,
    query_params: Vec<KeyValueEntry>,
    body: Option<RequestBody>,
    auth: Option<RequestAuth>,
) -> anyhow::Result<HttpResponse> {
    let client = reqwest::Client::new();
    let start = Instant::now();

    let http_method = reqwest::Method::from_bytes(method.as_bytes())?;
    let mut builder = client.request(http_method, &url);

    // Apply enabled query params
    let params: Vec<(&str, &str)> = query_params.iter()
        .filter(|p| p.enabled)
        .map(|p| (p.key.as_str(), p.value.as_str()))
        .collect();
    if !params.is_empty() {
        builder = builder.query(&params);
    }

    // Apply enabled headers
    for h in headers.iter().filter(|h| h.enabled) {
        builder = builder.header(&h.key, &h.value);
    }

    // Apply auth (overrides any Authorization header)
    if let Some(a) = &auth {
        if a.auth_type == "bearer" && !a.token.is_empty() {
            builder = builder.bearer_auth(&a.token);
        }
    }

    // Apply body
    if let Some(b) = &body {
        if b.body_type == "json" && !b.content.is_empty() {
            builder = builder
                .header("Content-Type", "application/json")
                .body(b.content.clone());
        }
    }

    let response = builder.send().await?;
    let duration_ms = start.elapsed().as_millis() as u64;
    let status = response.status().as_u16();
    let resp_headers: Vec<KeyValueEntry> = response.headers().iter()
        .map(|(k, v)| KeyValueEntry {
            key: k.to_string(),
            value: v.to_str().unwrap_or("").to_string(),
            enabled: true,
        })
        .collect();
    let body_text = response.text().await.unwrap_or_default();

    Ok(HttpResponse {
        status,
        duration_ms,
        headers: resp_headers,
        body: body_text,
    })
}
```

### Pattern 2: requestStore (Zustand, mirrors collectionStore)

**What:** A single Zustand store holds both the current request draft (editable fields) and the latest response. The active request ID from collectionStore drives loading the draft from disk.

```typescript
// src/stores/requestStore.ts
import { create } from 'zustand';
import type { RequestFile, KeyValueEntry, RequestBody, RequestAuth } from '../types/collections';
import type { HttpResponse } from '../bindings'; // tauri-specta generated

type ResponseState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: HttpResponse }
  | { status: 'error'; message: string };

interface RequestStore {
  // Draft — what the editor shows
  method: string;
  url: string;
  headers: KeyValueEntry[];
  queryParams: KeyValueEntry[];
  body: RequestBody | null;
  auth: RequestAuth | null;

  // Response state
  response: ResponseState;

  // Actions
  loadFromFile: (file: RequestFile) => void;
  setMethod: (m: string) => void;
  setUrl: (u: string) => void;
  setHeaders: (h: KeyValueEntry[]) => void;
  setQueryParams: (p: KeyValueEntry[]) => void;
  setBody: (b: RequestBody | null) => void;
  setAuth: (a: RequestAuth | null) => void;
  sendRequest: () => Promise<void>;
}
```

**Key insight:** `loadFromFile` is called whenever `activeRequestId` changes in `collectionStore`. Use a `useEffect` in `RequestEditor` or a top-level watcher component.

### Pattern 3: CSS-Based JSON Tokenizer

**What:** A pure TypeScript function that parses a JSON string into token segments and wraps each in a `<span>` with a Tailwind color class. Used for both the body textarea overlay and the response JSON viewer.

**Token types and colors (suggested — Claude's discretion):**
- Keys (strings before `:`): `text-blue-400`
- String values: `text-green-400`
- Numbers: `text-yellow-400`
- Booleans (`true`/`false`): `text-purple-400`
- Null: `text-gray-400`
- Punctuation (`{`, `}`, `[`, `]`, `,`, `:`): `text-default-500`

```typescript
// src/features/http/JsonViewer.tsx
// Tokenizer approach: regex-based scan of the JSON string.
// Handles string literals (with escaped quotes), numbers, booleans, null, punctuation.
// Returns React nodes with colored spans.

type TokenType = 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punctuation' | 'whitespace';

interface Token {
  type: TokenType;
  value: string;
}

function tokenizeJson(json: string): Token[] {
  // Regex pattern covers: strings (with escape), numbers, booleans, null, punctuation, whitespace
  const TOKEN_REGEX = /("(?:[^"\\]|\\.)*")|(\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|(true|false)|(null)|([{}\[\],:])|(\s+)/g;
  const tokens: Token[] = [];
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  let prevNonWhitespace: Token | null = null;

  while ((match = TOKEN_REGEX.exec(json)) !== null) {
    if (match.index > lastIndex) {
      // Unmatched characters — treat as raw text
      tokens.push({ type: 'punctuation', value: json.slice(lastIndex, match.index) });
    }
    lastIndex = TOKEN_REGEX.lastIndex;

    if (match[1]) {
      // String — determine if key (followed by ':') or value
      // Mark as 'key' provisionally; post-process or peek ahead
      const type: TokenType = 'string'; // refined below
      tokens.push({ type, value: match[1] });
    } else if (match[2]) {
      tokens.push({ type: 'number', value: match[2] });
    } else if (match[3]) {
      tokens.push({ type: 'boolean', value: match[3] });
    } else if (match[4]) {
      tokens.push({ type: 'null', value: match[4] });
    } else if (match[5]) {
      tokens.push({ type: 'punctuation', value: match[5] });
    } else if (match[6]) {
      tokens.push({ type: 'whitespace', value: match[6] });
    }
  }

  // Post-process: mark string tokens followed by ':' (skipping whitespace) as 'key'
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === 'string') {
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j].type === 'whitespace') continue;
        if (tokens[j].type === 'punctuation' && tokens[j].value === ':') {
          tokens[i] = { ...tokens[i], type: 'key' };
        }
        break;
      }
    }
  }

  return tokens;
}

const TOKEN_COLORS: Record<TokenType, string> = {
  key: 'text-blue-400',
  string: 'text-green-400',
  number: 'text-yellow-400',
  boolean: 'text-purple-400',
  null: 'text-gray-500',
  punctuation: 'text-default-500',
  whitespace: '',
};
```

### Pattern 4: Response State Machine (four states)

**What:** ResponseViewer renders four mutually exclusive states based on `response.status`.

```typescript
// ResponseViewer renders based on response.status:
// 'idle'    → "Send a request to see the response" placeholder
// 'loading' → centered Spinner + "Sending request..." text
// 'success' → StatusBar + Body/Headers tabs + JsonViewer or raw text
// 'error'   → StatusBar with red bg + error type + raw message
```

### Pattern 5: tauri-plugin-http capability permission

Adding `tauri-plugin-http` requires both Cargo.toml and the capabilities file.

```json
// src-tauri/capabilities/default.json — add to permissions array:
"http:default"
```

This grants the frontend the ability to use the plugin. The Rust side (`send_request` command) does NOT need this permission since it's a Rust command, not a JS fetch call. The permission is only needed if the frontend calls the plugin's JS API directly — which it should NOT (all HTTP goes through the Rust command). However, registering the plugin in `lib.rs` is required regardless.

```rust
// src-tauri/src/lib.rs — add to tauri::Builder::default() chain:
.plugin(tauri_plugin_http::init())
```

### Anti-Patterns to Avoid

- **Calling reqwest directly in an async Tauri command without spawn_blocking:** reqwest's async API is fully async and is fine to `await` directly inside an `async` Tauri command. `spawn_blocking` is for synchronous/blocking operations (like git2). Do NOT wrap reqwest calls in `spawn_blocking` — it's unnecessary and wastes a blocking thread.
- **Using `tauri::async_runtime::spawn` inside the command:** Commands declared `async fn` are already running on the async runtime. Call `executor::execute(...).await` directly.
- **Using JS-side fetch for the HTTP request:** All HTTP execution goes through the Rust command. JS-side `fetch` is prohibited for this use case (CLAUDE.md).
- **Adding Monaco or CodeMirror:** D-06 is locked. Custom textarea + tokenizer only.
- **Storing response in collectionStore:** Response state belongs in `requestStore` (separate concern from collection tree management).
- **Content-Type conflict:** If the user adds a `Content-Type` header manually AND there's a JSON body, the manual header takes precedence — do not override it. Add `Content-Type: application/json` only when no `Content-Type` header is present among enabled headers.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP client | Custom TCP socket | `tauri_plugin_http::reqwest` | TLS, redirects, content encoding, timeout, all handled |
| Request timing | `Date.now()` on JS side | `std::time::Instant` in Rust | JS timing is unreliable across IPC boundary; Rust `Instant` measures actual network time |
| Bearer auth header | Manual `"Bearer " + token` string concatenation | `reqwest::RequestBuilder::bearer_auth()` | Handles spacing correctly, avoids double-Authorization pitfall |
| Query string encoding | Manual `?key=value` URL string building | `reqwest`'s `.query()` builder | Handles percent-encoding of special characters |
| Spinner/loading animation | Custom CSS animation | HeroUI `Spinner` component | Already in the dependency; consistent with project UI |
| Tab UI | Custom div + onClick state | HeroUI `Tabs` component | Accessible, keyboard-navigable, matches existing UI patterns |
| Checkbox in key-value rows | Custom div | HeroUI `Checkbox` component | Accessible, consistent |

**Key insight:** The Rust HTTP layer is thin — reqwest handles all the hard parts. The frontend complexity is primarily in UI state management and the JSON tokenizer.

---

## Common Pitfalls

### Pitfall 1: Content-Type auto-injection conflict
**What goes wrong:** Adding `Content-Type: application/json` unconditionally in the Rust executor while the user also has a `Content-Type` header in their headers list results in a duplicate header sent to the server, which some servers reject.
**Why it happens:** Easy to write `builder.header("Content-Type", "application/json")` without checking.
**How to avoid:** In the executor, only add `Content-Type: application/json` for a JSON body if none of the enabled headers already contains a `Content-Type` key (case-insensitive check).
**Warning signs:** Tests against APIs that enforce single Content-Type header return 400.

### Pitfall 2: tauri-plugin-http not registered in lib.rs
**What goes wrong:** Adding `tauri-plugin-http` to Cargo.toml but forgetting `.plugin(tauri_plugin_http::init())` in `lib.rs` causes a runtime panic when `reqwest::Client::new()` is called (the plugin sets up the async runtime context reqwest needs in Tauri).
**Why it happens:** Unlike pure crate dependencies, Tauri plugins require explicit initialization.
**How to avoid:** Add both Cargo.toml entry AND `.plugin(tauri_plugin_http::init())` to `lib.rs` in the same task.
**Warning signs:** App panics on first `send_request` call with a runtime error about missing plugin context.

### Pitfall 3: requestStore not reset when switching active requests
**What goes wrong:** User clicks request A (loads its fields), clicks request B, but the response from request A is still visible because `response` state wasn't cleared.
**Why it happens:** `loadFromFile` sets the draft fields but doesn't reset `response` to `{ status: 'idle' }`.
**How to avoid:** Always reset `response: { status: 'idle' }` inside `loadFromFile`.
**Warning signs:** Response panel shows stale response data from previous request.

### Pitfall 4: JSON tokenizer fails on malformed input
**What goes wrong:** User types partial JSON in the body textarea; tokenizer throws, crashes the component.
**Why it happens:** Regex-based tokenizer is resilient to malformed input (it scans character by character), but if using `JSON.parse` for formatting in the response viewer it throws on malformed JSON.
**How to avoid:** Wrap `JSON.parse` in a try/catch. If it throws, fall back to rendering raw text (RESP-05 rule applies equally to malformed JSON).
**Warning signs:** Response panel goes blank on non-JSON API responses.

### Pitfall 5: Large response bodies blocking the UI
**What goes wrong:** A 50MB JSON response payload causes the JSON tokenizer to run for several seconds on the main thread, freezing the UI.
**Why it happens:** Regex over a large string is synchronous.
**How to avoid:** Cap JSON formatting/tokenizing at a reasonable threshold (e.g., bodies > 100KB are shown as raw text with a note "Response too large to syntax highlight — showing raw"). This is a phase-3 pragmatic decision.
**Warning signs:** UI freezes after receiving large API responses.

### Pitfall 6: specta type registration for new types
**What goes wrong:** Adding `HttpResponse` struct in Rust without `#[derive(Type)]` and `specta::specta` on the command causes the bindings export to fail at startup.
**Why it happens:** tauri-specta requires all types used in command signatures to implement `specta::Type`.
**How to avoid:** Every struct in `HttpResponse` and nested types needs `#[derive(Debug, Clone, Serialize, Deserialize, Type)]`. Add the command to `collect_commands![]` in `lib.rs`.
**Warning signs:** App fails to start in debug mode with "Failed to export TS bindings".

### Pitfall 7: activeRequestId-to-file-content bridge missing
**What goes wrong:** `collectionStore.activeRequestId` changes when user clicks a request in the tree, but `RequestEditor` still shows the previous request's fields because nothing loaded the new request file.
**Why it happens:** Phase 2 only sets `activeRequestId` (a slug path string). There is no existing command to load the full `RequestFile` contents by that path.
**How to avoid:** This phase must add a `load_request` Rust command (reads the JSON file and returns `RequestFile`), an `http.ts` API wrapper, and a `useEffect` in `RequestEditor` (or equivalent) that fires when `activeRequestId` changes to load the file into `requestStore`.
**Warning signs:** Clicking a different request in the sidebar doesn't update the editor fields.

---

## Code Examples

### Rust: HttpResponse type

```rust
// src-tauri/src/http/executor.rs
use serde::{Deserialize, Serialize};
use specta::Type;
use crate::collections::types::KeyValueEntry;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct HttpResponse {
    pub status: u16,
    pub duration_ms: u64,
    pub headers: Vec<KeyValueEntry>,
    pub body: String,
}
```

### Rust: Plugin registration in lib.rs

```rust
// src-tauri/src/lib.rs — updated Builder chain
tauri::Builder::default()
    .plugin(tauri_plugin_http::init())  // ADD THIS
    .invoke_handler(builder.invoke_handler())
    .setup(move |app| { ... })
    .run(tauri::generate_context!())
```

### Rust: Cargo.toml addition

```toml
[dependencies]
tauri-plugin-http = "2"
```

### TypeScript: invoke wrapper

```typescript
// src/api/http.ts
import { invoke } from '@tauri-apps/api/core';
import type { HttpResponse } from '../bindings';
import type { KeyValueEntry, RequestBody, RequestAuth } from '../types/collections';

export async function sendRequest(params: {
  method: string;
  url: string;
  headers: KeyValueEntry[];
  queryParams: KeyValueEntry[];
  body: RequestBody | null;
  auth: RequestAuth | null;
}): Promise<HttpResponse> {
  return invoke<HttpResponse>('send_request', params);
}

export async function loadRequest(params: {
  workspaceId: string;
  collectionSlug: string;
  parentPath: string[];
  slug: string;
}): Promise<import('../types/collections').RequestFile> {
  return invoke('load_request', params);
}
```

### TypeScript: Status code color helper

```typescript
// Used in status bar component
function statusColor(code: number): string {
  if (code >= 200 && code < 300) return 'text-success';    // green (#17c964)
  if (code >= 400 && code < 500) return 'text-warning';    // yellow
  if (code >= 500) return 'text-danger';                   // red
  return 'text-default-500';                               // 1xx, 3xx
}
```

### TypeScript: KeyValueEditor component shape

```typescript
// src/features/http/KeyValueEditor.tsx
interface KeyValueEditorProps {
  entries: KeyValueEntry[];
  onChange: (entries: KeyValueEntry[]) => void;
  placeholder?: { key: string; value: string };
}
// Renders: list of rows (checkbox | key input | value input | delete button)
// + "+ Add" button at bottom that appends { key: '', value: '', enabled: true }
```

### TypeScript: requestStore skeleton

```typescript
// src/stores/requestStore.ts
import { create } from 'zustand';
import * as httpApi from '../api/http';
import type { RequestFile, KeyValueEntry, RequestBody, RequestAuth } from '../types/collections';
import type { HttpResponse } from '../bindings';

type ResponseState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: HttpResponse }
  | { status: 'error'; message: string };

interface RequestStore {
  method: string;
  url: string;
  headers: KeyValueEntry[];
  queryParams: KeyValueEntry[];
  body: RequestBody | null;
  auth: RequestAuth | null;
  response: ResponseState;
  loadFromFile: (file: RequestFile) => void;
  setMethod: (m: string) => void;
  setUrl: (u: string) => void;
  setHeaders: (h: KeyValueEntry[]) => void;
  setQueryParams: (p: KeyValueEntry[]) => void;
  setBody: (b: RequestBody | null) => void;
  setAuth: (a: RequestAuth | null) => void;
  sendRequest: () => Promise<void>;
}

export const useRequestStore = create<RequestStore>((set, get) => ({
  method: 'GET',
  url: '',
  headers: [],
  queryParams: [],
  body: null,
  auth: null,
  response: { status: 'idle' },

  loadFromFile: (file) => set({
    method: file.method,
    url: file.url,
    headers: file.headers,
    queryParams: file.queryParams,
    body: file.body,
    auth: file.auth,
    response: { status: 'idle' },   // always reset response
  }),

  sendRequest: async () => {
    const { method, url, headers, queryParams, body, auth } = get();
    set({ response: { status: 'loading' } });
    try {
      const data = await httpApi.sendRequest({ method, url, headers, queryParams, body, auth });
      set({ response: { status: 'success', data } });
    } catch (e) {
      set({ response: { status: 'error', message: String(e) } });
    }
  },

  setMethod: (m) => set({ method: m }),
  setUrl: (u) => set({ url: u }),
  setHeaders: (h) => set({ headers: h }),
  setQueryParams: (p) => set({ queryParams: p }),
  setBody: (b) => set({ body: b }),
  setAuth: (a) => set({ auth: a }),
}));
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monaco/CodeMirror for JSON in simple tools | Custom tokenizer or no highlighting | Ongoing | D-11 mandates CSS tokenizer — correct for Dispatch's scope |
| Separate loading state in component | Discriminated union `ResponseState` type | React era | Eliminates impossible states (loading=true + data present) |
| Raw string HTTP responses | Typed response struct across IPC | Tauri v2 + specta | TypeScript bindings auto-generated; no manual type drift |

---

## Open Questions

1. **HTTP-02: Variable highlighting in URL input**
   - What we know: `{{var}}` syntax is in SPECS.md; visual distinction is in scope for Phase 3 per requirements
   - What's unclear: HTTP-02 says "variable highlighting" — does this mean the URL input itself needs to render colored spans (like a rich text input), or just that typed `{{var}}` text appears distinct?
   - Recommendation: Implement a simple approach — a `<div contenteditable>` with inline span injection is complex; simpler is a read-only overlay div positioned over a transparent-text input that renders `{{...}}` tokens in a distinct color. **However**, full variable resolution is Phase 4. For Phase 3, the planner should scope HTTP-02 as: `{{var}}` tokens visually distinct in the URL input (e.g., different text color via regex-replace approach), no resolution required.

2. **load_request command: path resolution from activeRequestId**
   - What we know: `activeRequestId` format is `"collectionSlug/optionalFolder.../requestSlug"` (documented in collectionStore)
   - What's unclear: Should `load_request` accept the full slug path string (parsed on Rust side) or accept `collectionSlug + parentPath[] + slug` separately (matching existing command conventions)?
   - Recommendation: Follow existing command conventions — accept `workspaceId`, `collectionSlug`, `parentPath: Vec<String>`, `slug` separately. The frontend splits `activeRequestId` string to extract these.

3. **Request draft persistence: save-on-change vs. save-on-send**
   - What we know: Phase 3 has no sync (that's Phase 7). The `RequestFile` must be saved to disk when the user edits fields, otherwise edits are lost on app restart.
   - What's unclear: CONTEXT.md does not explicitly address save-on-change. The Phase 2 data model writes files on create/rename/delete but not on field edits.
   - Recommendation: Implement save-on-change with debounce (~500ms after last edit) — use `useMemo`/`useEffect` in the store or a debounced effect in `RequestEditor`. This is a natural extension and expected behavior for an HTTP client. The planner should include a `save_request` Rust command and a debounced save in `requestStore`.

---

## Environment Availability

Phase 3 is code/config changes only. No new external runtime dependencies beyond those already in the project.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Rust stable | Cargo build | Verified (project builds Phase 2) | 1.78+ | — |
| tauri-plugin-http | send_request command | **Not in Cargo.toml yet** | 2.5.7 (to add) | — |
| Node.js + npm | Frontend build | Verified (project builds Phase 2) | — | — |

**Missing dependencies with no fallback:**
- `tauri-plugin-http = "2"` must be added to `src-tauri/Cargo.toml` before the HTTP command can compile.
- `.plugin(tauri_plugin_http::init())` must be added to `src-tauri/src/lib.rs`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — Phase 3 adds no test infrastructure |
| Config file | none |
| Quick run command | `cd /Users/kenneth/Documents/rust/dispatch/src-tauri && cargo test` (Rust unit tests only) |
| Full suite command | `cd /Users/kenneth/Documents/rust/dispatch/src-tauri && cargo test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HTTP-01 | `send_request` executes GET/POST/PUT/DELETE | unit (Rust) | `cargo test http::executor` | ❌ Wave 0 |
| HTTP-02 | URL variable token detection | unit (TS) | none — manual visual | manual-only |
| HTTP-03 | KeyValueEditor toggle/add/delete | manual visual | — | manual-only |
| HTTP-04 | Headers key-value editor | manual visual | — | manual-only |
| HTTP-05 | Body textarea accepts JSON | manual visual | — | manual-only |
| HTTP-06 | Bearer auth sends Authorization header | unit (Rust) | `cargo test http::executor::test_bearer_auth` | ❌ Wave 0 |
| HTTP-07 | Loading state while in-flight | manual visual | — | manual-only |
| RESP-01 | Status code color coding | manual visual | — | manual-only |
| RESP-02 | Response time returned correctly | unit (Rust) | `cargo test http::executor::test_timing` | ❌ Wave 0 |
| RESP-03 | JSON tokenizer produces correct token types | unit (TS) | none without test infra | ❌ Wave 0 |
| RESP-04 | Response headers returned as list | unit (Rust) | `cargo test http::executor::test_headers` | ❌ Wave 0 |
| RESP-05 | Non-JSON body shown as raw text | unit (Rust) + manual | `cargo test http::executor::test_text_body` | ❌ Wave 0 |

**Note on Rust unit tests for executor:** The executor uses `reqwest::Client` which requires a live network. Tests should use a mock HTTP server (e.g., `mockito` crate, or `wiremock-rs`) or test the helper logic (header building, param encoding) in isolation. A simple approach: add integration tests that call a known public endpoint (e.g., `https://httpbin.org/get`) — but this is fragile in CI. Recommend testing the non-network logic (header assembly, bearer auth injection, Content-Type conflict avoidance) as pure unit tests without network calls.

### Sampling Rate
- **Per task commit:** `cargo test` (Rust unit tests)
- **Per wave merge:** `cargo test` + manual smoke of send_request in running app
- **Phase gate:** Full manual verification of all 5 success criteria before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src-tauri/src/http/executor_tests.rs` — covers HTTP-01, HTTP-06, RESP-02, RESP-04, RESP-05 (mock or httpbin)
- [ ] `mockito` or `wiremock` added to `[dev-dependencies]` in Cargo.toml for executor unit tests
- [ ] TS unit test infra (Vitest): currently absent from project — defer TS tests to Phase 8 or add Vitest in Wave 0 if JSON tokenizer logic is complex enough to warrant it

---

## Sources

### Primary (HIGH confidence)
- CLAUDE.md project instructions — stack decisions, version pins, tauri-plugin-http usage rules
- `src-tauri/Cargo.toml` — confirmed `tauri-plugin-http` is NOT yet present
- `src-tauri/src/lib.rs` — plugin registration pattern verified
- `src-tauri/src/commands/collections.rs` — thin command + module delegation pattern
- `src-tauri/src/collections/types.rs` — `RequestFile`, `KeyValueEntry`, `RequestBody`, `RequestAuth` type definitions
- `src/stores/collectionStore.ts` — Zustand store pattern used in project
- `src/types/collections.ts` — TypeScript type definitions matching Rust types
- `03-CONTEXT.md` — locked decisions D-01 through D-17

### Secondary (MEDIUM confidence)
- reqwest documentation (builder pattern, `.bearer_auth()`, `.query()`) — standard reqwest API, stable across 0.12.x
- Tauri v2 plugin system (`.plugin(init())` registration pattern) — confirmed from prior phase research in CLAUDE.md

### Tertiary (LOW confidence)
- JSON tokenizer regex approach — common pattern, no single authoritative source; implementation details are Claude's own construction based on JSON grammar. Needs validation during implementation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already decided in CLAUDE.md; only addition is confirming tauri-plugin-http needs adding to Cargo.toml
- Architecture: HIGH — thin command pattern, Zustand store shape, and file structure directly mirror Phase 2 established patterns
- Pitfalls: HIGH for Content-Type conflict and plugin registration (common Tauri gotchas); MEDIUM for JSON tokenizer edge cases (implementation-time concern)
- Open questions: MEDIUM — save-on-change behavior needs planner decision; HTTP-02 scoping needs explicit planner clarification

**Research date:** 2026-03-25
**Valid until:** 2026-06-01 (stable stack, slow-moving dependencies)
