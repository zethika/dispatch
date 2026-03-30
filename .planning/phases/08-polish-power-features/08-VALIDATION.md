---
phase: 8
slug: polish-power-features
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend) + cargo test (Rust backend) |
| **Config file** | `vitest.config.ts` / `src-tauri/Cargo.toml` |
| **Quick run command** | `npm run test -- --reporter=verbose` |
| **Full suite command** | `npm run test && cd src-tauri && cargo test` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --reporter=verbose`
- **After every plan wave:** Run `npm run test && cd src-tauri && cargo test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | COLL-05, COLL-06 | unit | `npm run test -- Sidebar` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 1 | CURL-01, CURL-02 | unit | `npm run test -- curl` | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 1 | CURL-03, CURL-04 | unit | `npm run test -- curl` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 2 | NAV-01, NAV-02, NAV-03 | unit | `npm run test -- Search` | ❌ W0 | ⬜ pending |
| 08-04-01 | 04 | 2 | KEY-01 thru KEY-08 | unit | `npm run test -- shortcut` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/features/collections/Sidebar.test.tsx` — stubs for DnD reorder/move
- [ ] `src/features/curl/curlUtils.test.ts` — stubs for import/export
- [ ] `src/features/search/SearchModal.test.tsx` — stubs for fuzzy search
- [ ] `src/features/shortcuts/shortcuts.test.ts` — stubs for global shortcuts
- [ ] Existing test infrastructure covers framework installation

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag-and-drop visual feedback | COLL-05 | Requires visual inspection of drop line indicator | Drag a request in sidebar — verify blue drop line appears |
| Cross-collection move | COLL-06 | Requires drag gesture between tree sections | Drag request from collection A, drop in collection B |
| cURL paste auto-detect | CURL-01 | Requires clipboard interaction | Copy a cURL command, Cmd+V in URL field — verify auto-import |
| Cmd+K modal UX | NAV-01 | Requires visual + interaction verification | Cmd+K → type query → verify grouped results → select → navigate |
| Keyboard shortcuts from text field | KEY-01 | D-10 all shortcuts always active | Focus a text input, press Cmd+Enter — verify request sends |
| Shortcut flash feedback | KEY-01 | Visual animation verification | Press Cmd+Enter — verify brief flash on send button |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
