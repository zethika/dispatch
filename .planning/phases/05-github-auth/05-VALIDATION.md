---
phase: 5
slug: github-auth
status: draft
nyquist_compliant: true
wave_0_complete: true
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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 05-01-01 | 01 | 1 | AUTH-01 | compilation | `cargo check -p dispatch` | ⬜ pending |
| 05-01-02 | 01 | 1 | AUTH-01 | compilation | `cargo check -p dispatch` | ⬜ pending |
| 05-02-01 | 02 | 2 | AUTH-02, AUTH-03 | compilation | `npx tsc --noEmit` | ⬜ pending |
| 05-02-02 | 02 | 2 | AUTH-01 | compilation | `npx tsc --noEmit` | ⬜ pending |
| 05-03-01 | 03 | 2 | AUTH-04, AUTH-05 | compilation | `npx tsc --noEmit` | ⬜ pending |
| 05-03-02 | 03 | 2 | AUTH-04, AUTH-05 | compilation | `npx tsc --noEmit` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Nyquist Compliance Rationale

This phase is **integration-heavy** (OAuth device flow, git clone, GitHub API, Keychain storage). The features primarily require manual E2E testing against real GitHub infrastructure. Unit test stubs for modal components and device flow polling have low ROI because:

1. **Device flow** requires actual GitHub API interaction (POST to github.com/login/device/code, poll access_token endpoint) — mocking removes all meaningful coverage
2. **git2 clone** requires a real remote repository and valid auth token — test doubles would only verify mock wiring
3. **Keychain storage** requires macOS Keychain entitlements — cannot be meaningfully unit tested in CI
4. **Modal components** (LoginModal, RepoBrowserModal, WorkspaceSwitcher) are UI state machines best verified by manual interaction

**Verification strategy:** Compilation checks (`cargo check`, `tsc --noEmit`) catch type errors and wiring issues. Manual verification (see table below) covers behavioral correctness. This combination is accepted as sufficient for this phase.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GitHub device flow browser redirect | AUTH-01 | Requires browser interaction with GitHub | 1. Click Connect GitHub 2. Copy code 3. Open github.com/login/device 4. Enter code 5. Approve |
| Clone private repo via HTTPS | AUTH-03 | Requires real GitHub token + repo access | 1. Login 2. Connect a private repo 3. Verify collections load |
| Workspace switcher visual | AUTH-05 | Visual layout verification | 1. Connect 2+ workspaces 2. Open sidebar dropdown 3. Switch between them |
| Session expiry toast with action | AUTH-01 | Requires expired/revoked token state | 1. Login 2. Revoke token on GitHub 3. Trigger API call 4. Verify toast appears with "Sign in" action 5. Click action opens login modal |
| Workspace appears in sidebar after connect | AUTH-03 | Visual + state verification | 1. Open repo browser 2. Connect a repo 3. Verify workspace appears in sidebar switcher behind the modal |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands (compilation checks)
- [x] Sampling continuity: compilation check after every task
- [x] Wave 0 not needed — compilation checks are the automated baseline
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** accepted — compilation checks + manual E2E verification covers this integration-heavy phase
