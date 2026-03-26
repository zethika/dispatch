---
phase: 6
slug: git-sync-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.1 |
| **Config file** | vite.config.ts (vitest inline config) |
| **Quick run command** | `npm run test -- --reporter=verbose` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --reporter=verbose`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | SYNC-04 | unit | `npm run test -- --reporter=verbose src/features/sync/SyncChip.test.tsx` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | SYNC-04 | unit | `npm run test -- --reporter=verbose src/stores/syncStore.test.ts` | ❌ W0 | ⬜ pending |
| 06-01-03 | 01 | 1 | SYNC-04 | unit | `npm run test -- --reporter=verbose src/components/layout/WorkspaceSwitcher.test.tsx` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | SYNC-05 | manual-only | N/A — requires real git repo with conflicts | — | ⬜ pending |
| 06-02-02 | 02 | 1 | SYNC-05 | unit (mock) | `npm run test -- --reporter=verbose src/features/sync/SyncChip.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/features/sync/SyncChip.test.tsx` — stubs for SYNC-04 chip rendering + SYNC-05 conflict toast
- [ ] `src/stores/syncStore.test.ts` — stubs for SYNC-04 event listener, state update
- [ ] `src/components/layout/WorkspaceSwitcher.test.tsx` — stubs for SYNC-04 dot colors

*Existing infrastructure: Vitest + @testing-library/react already configured. No framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pull with conflicts returns conflicted file paths | SYNC-05 | Requires two local git2 repos (remote + local) with diverged histories — full git2/filesystem integration test | 1. Create temp bare repo and clone it twice. 2. Commit different changes to same file in both. 3. Push from first. 4. Pull from second. 5. Verify conflict paths returned and remote version wins. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
