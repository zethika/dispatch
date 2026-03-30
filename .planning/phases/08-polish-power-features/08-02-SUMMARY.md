---
phase: 08-polish-power-features
plan: "02"
subsystem: curl-import-export
tags: [curl, import, export, url-bar, context-menu, modal, variables]
dependency_graph:
  requires:
    - src/utils/variables.ts (substitute function)
    - src/types/collections.ts (KeyValueEntry, RequestBody, RequestAuth)
    - src/stores/requestStore.ts (setMethod, setUrl, setHeaders, setBody, setAuth)
    - src/stores/environmentStore.ts (activeEnvVariables)
  provides:
    - parseCurl: parse cURL command strings into structured request data
    - buildCurlString: generate cURL command from request state with variable resolution
    - CurlImportModal: explicit import UI via modal
    - UrlBar paste auto-detection
    - TreeContextMenu Import cURL and Copy as cURL actions
  affects:
    - src/features/http/UrlBar.tsx
    - src/features/collections/TreeContextMenu.tsx
tech_stack:
  added:
    - curlconverter@4.12.0 (ESM-only cURL parser)
  patterns:
    - TDD (RED/GREEN) for utility functions
    - applyParsedCurl helper exported from CurlImportModal for shared use by UrlBar
    - Bearer auth header extracted from parsed headers into dedicated auth field
key_files:
  created:
    - src/utils/curl.ts
    - src/utils/curl.test.ts
    - src/features/http/CurlImportModal.tsx
  modified:
    - src/features/http/UrlBar.tsx
    - src/features/collections/TreeContextMenu.tsx
    - package.json
decisions:
  - applyParsedCurl exported from CurlImportModal to avoid duplication with UrlBar paste handler
  - Bearer Authorization header extracted to auth field during import (non-Bearer stays in headers)
  - curlconverter@4.12.0 pinned — ESM-only, handled natively by Vite
metrics:
  duration_minutes: 3
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_created: 3
  files_modified: 3
---

# Phase 8 Plan 2: cURL Import and Export Summary

**One-liner:** cURL import via paste auto-detection and explicit modal plus clipboard export with full `{{variable}}` resolution via curlconverter and buildCurlString.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | cURL utility functions (parseCurl + buildCurlString) with tests | 9237d4f | src/utils/curl.ts, src/utils/curl.test.ts, package.json |
| 2 | cURL paste detection in UrlBar, CurlImportModal, context menu, and export action | e20a5f6 | src/features/http/CurlImportModal.tsx, src/features/http/UrlBar.tsx, src/features/collections/TreeContextMenu.tsx |

## What Was Built

### Task 1: parseCurl + buildCurlString (TDD)

- Installed `curlconverter@4.12.0` (ESM-only, works natively with Vite)
- `parseCurl(cmd)`: detects `curl ` prefix, delegates to `curlconverter.toJsonString`, returns `{ method, url, headers, body }` or `null`
- `buildCurlString(method, url, headers, body, auth, vars)`: calls `substitute()` on all fields, emits `-H` flags for enabled headers, `-H "Authorization: Bearer ..."` for auth, `-H "Content-Type: application/json"` for JSON bodies, `-d '...'` with single-quote escaping
- 10 unit tests covering all behaviors, all passing

### Task 2: UI Integration

- **CurlImportModal**: HeroUI Modal with Textarea, Import button calls `parseCurl` and `applyParsedCurl`, shows `toast.success`/`toast.warning` per UI-SPEC
- **applyParsedCurl helper**: exported from `CurlImportModal.tsx`, sets method/url/headers/body/auth; extracts `Authorization: Bearer` tokens into the auth field, strips from headers
- **UrlBar paste handler**: `onPaste` intercepts clipboard text starting with `curl `, calls `parseCurl` + `applyParsedCurl`, prevents default (no text in URL field), shows toast
- **TreeContextMenu**: "Import cURL" opens `CurlImportModal`; "Copy as cURL" calls `buildCurlString` with current `requestStore` state and `environmentStore.activeEnvVariables`, writes to clipboard via `navigator.clipboard.writeText`

## Success Criteria Met

- CURL-01: Pasting cURL in URL bar auto-detects and imports
- CURL-02: Context menu "Import cURL" opens modal, imports on confirm
- CURL-03: Context menu "Copy as cURL" copies to clipboard with toast feedback
- CURL-04: Exported cURL resolves `{{variables}}` from active environment

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `src/utils/curl.ts` — FOUND
- `src/utils/curl.test.ts` — FOUND
- `src/features/http/CurlImportModal.tsx` — FOUND
- `src/features/http/UrlBar.tsx` (modified) — FOUND
- `src/features/collections/TreeContextMenu.tsx` (modified) — FOUND
- Commit `9237d4f` — FOUND
- Commit `e20a5f6` — FOUND
- `npm run test -- src/utils/curl.test.ts` — 10/10 PASS
- `npx tsc --noEmit` — PASS (0 errors)

## Known Stubs

None.
