---
phase: 7
slug: background-sync-loop
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend) + cargo test (Rust backend) |
| **Config file** | `vitest.config.ts` / `src-tauri/Cargo.toml` |
| **Quick run command** | `npm run test -- --reporter=verbose` |
| **Full suite command** | `npm run test && cd src-tauri && cargo test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --reporter=verbose`
- **After every plan wave:** Run `npm run test && cd src-tauri && cargo test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | SYNC-01 | unit | `cargo test debounce` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | SYNC-02 | unit | `cargo test periodic_pull` | ❌ W0 | ⬜ pending |
| 07-01-03 | 01 | 1 | SYNC-03 | unit | `cargo test offline_queue` | ❌ W0 | ⬜ pending |
| 07-01-04 | 01 | 1 | SYNC-06 | integration | `npm run test -- sync-status` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src-tauri/src/sync/tests.rs` — stubs for SYNC-01, SYNC-02, SYNC-03
- [ ] `src/tests/sync-status.test.ts` — stubs for SYNC-06
- [ ] Existing test infrastructure covers framework installation

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Focus-pull triggers on app regain focus | SYNC-02 | Requires OS-level window focus event | Switch away from app, make remote change, switch back — verify pull happens |
| Offline → online reconnect push | SYNC-03 | Requires network state simulation | Disable wifi, make changes, re-enable wifi — verify queued changes push |
| Sync status indicator visual states | SYNC-06 | Visual verification | Observe indicator during sync, offline, conflict states |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
