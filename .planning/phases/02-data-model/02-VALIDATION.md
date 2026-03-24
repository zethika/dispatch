---
phase: 2
slug: data-model
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend) + cargo test (Rust) |
| **Config file** | `vitest.config.ts` (exists from Phase 1) |
| **Quick run command** | `npm run test -- --run` |
| **Full suite command** | `npm run test -- --run && cd src-tauri && cargo test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run`
- **After every plan wave:** Run `npm run test -- --run && cd src-tauri && cargo test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | COLL-01 | unit | `cd src-tauri && cargo test` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | COLL-02 | unit | `cd src-tauri && cargo test` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | COLL-03 | unit | `cd src-tauri && cargo test` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | COLL-04 | integration | `npm run test -- --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src-tauri/src/models/` — Rust data model structs with serde Serialize/Deserialize
- [ ] `src-tauri/tests/` — Rust unit tests for collection/request CRUD operations
- [ ] `src/components/layout/__tests__/` — React component tests for collection tree rendering

*Existing vitest infrastructure from Phase 1 covers frontend test framework.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sidebar tree renders hierarchy correctly | COLL-01 | Visual layout verification | Launch app, create workspace/collection/folder/request, verify tree indentation and icons |
| Right-click context menu appears | COLL-02, COLL-03, COLL-04 | Browser event + visual | Right-click tree item, verify menu items match spec |
| Inline rename input focus | COLL-02, COLL-03, COLL-04 | DOM focus behavior | Click Rename in context menu, verify input appears and is focused |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
