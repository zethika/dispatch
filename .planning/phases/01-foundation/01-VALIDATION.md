---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend) + cargo test (Rust backend) |
| **Config file** | vitest.config.ts (created in Wave 0) |
| **Quick run command** | `npm run test -- --run` |
| **Full suite command** | `npm run test -- --run && cd src-tauri && cargo test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run`
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | APP-01 | integration | `cargo tauri dev` (manual launch check) | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | APP-02 | visual | `npm run test -- --run` (component render) | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | APP-03 | visual | `npm run test -- --run` (top bar render) | ❌ W0 | ⬜ pending |
| 01-01-04 | 01 | 1 | IPC | unit | `cd src-tauri && cargo test` (ping command) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — Vitest configuration for React + TypeScript
- [ ] `src/test/setup.ts` — Test setup with jsdom environment
- [ ] `package.json` test script — `vitest` command
- [ ] `src-tauri/src/lib.rs` — Rust unit test module

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| App launches with three-panel layout | APP-02 | Visual layout verification requires running app | Run `cargo tauri dev`, verify sidebar + editor + response panels render |
| HMR works in dev mode | N/A (success criterion) | Requires interactive dev server | Change a React component, verify it updates without full reload |
| Dark/light theme follows system | D-06 | Requires macOS appearance toggle | Toggle System Preferences > Appearance, verify app follows |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
