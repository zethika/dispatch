---
phase: 5
slug: github-auth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend) + cargo test (Rust) |
| **Config file** | `vitest.config.ts` / `Cargo.toml [dev-dependencies]` |
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
| 05-01-01 | 01 | 1 | AUTH-01 | unit | `cargo test auth` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | AUTH-01 | unit | `cargo test auth` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | AUTH-02, AUTH-03 | unit | `cargo test workspace` | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 2 | AUTH-01 | component | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 05-03-02 | 03 | 2 | AUTH-02, AUTH-03 | component | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 05-03-03 | 03 | 2 | AUTH-05 | component | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| 05-03-04 | 03 | 2 | AUTH-04 | component | `npm run test -- --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src-tauri/src/auth/` — Auth module stubs for device flow + token storage
- [ ] `src-tauri/src/workspace/` — Workspace module stubs for clone/disconnect
- [ ] Test infrastructure already exists (vitest + cargo test)

*Existing infrastructure covers test framework needs. Wave 0 creates domain-specific stubs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GitHub device flow browser redirect | AUTH-01 | Requires browser interaction with GitHub | 1. Click Connect GitHub 2. Copy code 3. Open github.com/login/device 4. Enter code 5. Approve |
| Clone private repo via HTTPS | AUTH-03 | Requires real GitHub token + repo access | 1. Login 2. Connect a private repo 3. Verify collections load |
| Workspace switcher visual | AUTH-05 | Visual layout verification | 1. Connect 2+ workspaces 2. Open sidebar dropdown 3. Switch between them |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
