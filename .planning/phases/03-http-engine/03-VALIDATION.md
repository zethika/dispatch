---
phase: 03
slug: http-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend) + cargo test (Rust) |
| **Config file** | `vitest.config.ts` / `src-tauri/Cargo.toml` |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test && cd src-tauri && cargo test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test && cd src-tauri && cargo test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | HTTP-01 | unit | `cargo test send_request` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | HTTP-03, HTTP-04 | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | HTTP-05 | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | HTTP-06 | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | RESP-01, RESP-02 | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | RESP-03 | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 1 | RESP-04 | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 03-02-04 | 02 | 1 | RESP-05 | unit | `npm run test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Rust unit tests for `send_request` command — HTTP execution logic
- [ ] React component tests for KeyValueEditor, BodyEditor, AuthEditor
- [ ] React component tests for ResponseViewer (status, body, headers)

*Existing vitest and cargo test infrastructure from Phase 1 covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Loading spinner during flight | HTTP-07 | Async UI state timing | Send request to slow endpoint, verify spinner visible |
| Color-coded status codes | RESP-01 | Visual CSS verification | Send requests producing 200, 404, 500; verify colors |
| JSON syntax highlighting | RESP-03 | Visual rendering | Send request returning JSON; verify colored tokens |
| Variable highlighting in URL | HTTP-02 | Visual rendering | Type `{{var}}` in URL input; verify distinct styling |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
