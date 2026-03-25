---
phase: 4
slug: environments-secrets
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.1 + @testing-library/react 16 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | ENV-01 | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | ENV-02 | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | ENV-03 | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 1 | ENV-04 | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 04-01-05 | 01 | 1 | ENV-05 | unit (Rust) | `cargo test -p dispatch --lib` | ❌ W0 | ⬜ pending |
| 04-01-06 | 01 | 1 | ENV-06 | unit | `npm run test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/features/environments/VariableEditor.test.tsx` — ENV-03: renders three columns, secret toggle shows/hides value
- [ ] `src/features/environments/EnvironmentModal.test.tsx` — ENV-01: create/rename/delete environment actions
- [ ] `src/components/layout/TopBar.test.tsx` (extend existing) — ENV-02: dropdown lists environments, "Manage Environments..." item present
- [ ] `src/utils/variables.test.ts` — ENV-04, ENV-06: tokenize, countUnresolved, substitute functions
- [ ] `src-tauri/src/environments/` (Rust unit tests in io.rs) — ENV-01, ENV-05: file written with empty secret values
- [ ] Add `tauri-plugin-store` to Cargo.toml and `@tauri-apps/plugin-store` to package.json

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Secret masking eye-icon toggle | ENV-03 | Visual interaction pattern | Open env modal, add secret variable, verify masked by default, click eye icon to reveal |
| Variable highlighting colors (orange/red) | ENV-04/ENV-06 | CSS overlay rendering | Type `{{var}}` in URL bar, verify orange if resolved, red if unresolved |
| Environment selector dropdown UX | ENV-02 | HeroUI dropdown rendering | Click TopBar dropdown, verify env list, select env, verify switch |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
