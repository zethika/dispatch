---
phase: 07-background-sync-loop
verified: 2026-03-28T06:25:00Z
status: gaps_found
score: 7/10 must-haves verified
gaps:
  - truth: "SyncStatusChip renders 'Offline' label with gray cloud-off icon when status is offline"
    status: partial
    reason: "CloudOffIcon is declared twice in SyncStatusChip.tsx (lines 71 and 115), causing TS2451 TypeScript compile error and test suite failures. The offline label and icon selection logic exists but the file is invalid."
    artifacts:
      - path: "src/features/sync/SyncStatusChip.tsx"
        issue: "Duplicate const declaration: CloudOffIcon declared at line 71 AND line 115. TypeScript error TS2451 'Cannot redeclare block-scoped variable'. File fails to compile."
    missing:
      - "Remove one of the two CloudOffIcon declarations (keep the first at lines 71-94 which uses 24x24 viewBox, or keep the second at lines 115-137 which uses 16x16 — both render offline correctly, remove the redundant one)"
  - truth: "App pulls from remote immediately when the macOS window regains focus"
    status: partial
    reason: "App.tsx focus-pull logic is correctly implemented, but the TypeScript compile error in SyncStatusChip.tsx causes the whole build to fail. The focus-pull listener itself is correct."
    artifacts:
      - path: "src/features/sync/SyncStatusChip.tsx"
        issue: "Build error blocks test verification — 3 test files fail with esbuild transform error due to duplicate CloudOffIcon"
    missing:
      - "Fix the duplicate CloudOffIcon declaration so the build succeeds and tests can run"
  - truth: "Toast fires when status transitions to offline / from offline to syncing"
    status: partial
    reason: "syncStore.ts transition toast logic is correct, but the SyncStatusChip.tsx compile error fails 3 test files (App.test.tsx, TopBar.test.tsx, EnvironmentModal.test.tsx) that import the broken file transitively."
    artifacts:
      - path: "src/features/sync/SyncStatusChip.tsx"
        issue: "Transform error propagates to any test that imports App.tsx or TopBar.tsx which import SyncStatusChip"
    missing:
      - "Same fix: remove duplicate CloudOffIcon declaration"
human_verification:
  - test: "Full background sync loop"
    expected: "Debounced push (3s), periodic pull (30s), focus-pull, offline chip with CloudOffIcon, transition toasts, WorkspaceSwitcher gray dot for offline workspaces"
    why_human: "Runtime behavior — debounce timing, network disconnect simulation, window focus events, and visual rendering cannot be verified statically"
---

# Phase 7: Background Sync Loop Verification Report

**Phase Goal:** Sync is invisible and automatic — changes push after brief inactivity, pulls happen on schedule and focus, offline changes queue and push on reconnect

**Verified:** 2026-03-28T06:25:00Z

**Status:** gaps_found

**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

Plan 01 truths (SYNC-01, SYNC-02, SYNC-06 — backend):

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | After saving a request, a commit+push fires automatically after 3 seconds of inactivity | VERIFIED | actor.rs uses `tokio::select!` with `Duration::from_secs(3)` debounce; 13 save commands fire `notify_change_inner` |
| 2 | Remote changes appear on the local workspace within ~30 seconds without any user action | VERIFIED | lib.rs spawns `interval(Duration::from_secs(30))` periodic pull; first tick consumed to avoid startup pull |
| 3 | When a push/pull fails with a network error, the workspace transitions to offline status | VERIFIED | `is_network_error()` helper in actor.rs; both actor loop and IPC commands emit "offline" status |
| 4 | When the periodic pull succeeds while offline, pending push fires and offline clears | VERIFIED | actor.rs Pull arm: `Ok(_) if is_offline => { is_offline = false; flush pending_push immediately }` |

Plan 02 truths (SYNC-03, SYNC-06 — frontend):

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 5 | SyncStatusChip renders 'Offline' label with gray cloud-off icon when status is offline | PARTIAL | Logic exists (lines 180-184, 192-195) but file has TS2451 compile error: CloudOffIcon declared twice (lines 71 and 115) |
| 6 | Toast fires when status transitions to offline: "You're offline — changes will sync when reconnected" | PARTIAL | syncStore.ts line 38 is correct; but SyncStatusChip.tsx compile error breaks 3 test files |
| 7 | Toast fires when status transitions from offline to syncing: "Back online — syncing..." | PARTIAL | syncStore.ts line 40-42 is correct; same build breakage affects test runs |
| 8 | App pulls from remote immediately when the macOS window regains focus | VERIFIED | App.tsx: `getCurrentWindow().onFocusChanged()` fires `triggerPull` on window focus; correct unlisten cleanup |
| 9 | Clicking the sync chip while offline triggers a sync attempt | VERIFIED | handlePress calls `triggerSync(workspaceId)` for all non-local statuses; offline is non-local |
| 10 | WorkspaceSwitcher dot shows bg-default-400 gray for offline workspaces | VERIFIED | WorkspaceSwitcher.tsx line 41: `offline: 'bg-default-400'` in colorMap |

**Score:** 7/10 truths verified (3 partial due to single file compile error)

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src-tauri/src/sync/types.rs` | NotifyChange variant, Offline status variant | VERIFIED | `NotifyChange` at line 35, `Offline` at line 14 |
| `src-tauri/src/sync/actor.rs` | Debounce select! loop, pending_push state, offline detection | VERIFIED | `tokio::select!` at line 126; `pending_push` at line 122; `is_offline` at line 123; `is_network_error()` at line 303 |
| `src-tauri/src/sync/tests.rs` | Unit tests for debounce, periodic pull, offline queue | VERIFIED | 4 tests present and passing |
| `src-tauri/src/commands/sync.rs` | notify_change IPC command | VERIFIED | `pub async fn notify_change` at line 275; `notify_change_inner` at line 245 |
| `src-tauri/src/lib.rs` | Periodic pull spawn task | VERIFIED | `interval(Duration::from_secs(30))` at line 74-91; ActorHandle::new accepts AppHandle at line 68 |

### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/features/sync/SyncStatusChip.tsx` | 6th offline state rendering with CloudOffIcon | STUB | CloudOffIcon declared twice (lines 71 and 115) — TS2451 compile error. Offline branch logic is present but file is invalid. |
| `src/features/sync/SyncStatusChip.test.tsx` | Test stubs for offline chip rendering | VERIFIED | 4 tests present; tests are logic-level (no React render) |
| `src/stores/syncStore.ts` | offline type, transition toasts, previousStatus tracking | VERIFIED | SyncStatus includes 'offline' (line 7); previousStatuses map (line 28); transition toasts (lines 37-42) |
| `src/stores/syncStore.test.ts` | Test stubs for offline status handling | VERIFIED | 2 tests: type check and network error detection |
| `src/App.tsx` | onFocusChanged listener for focus-pull | VERIFIED | `getCurrentWindow().onFocusChanged()` at lines 35-48; unlisten cleanup at line 48 |
| `src/components/layout/WorkspaceSwitcher.tsx` | offline dot color in statusDot | VERIFIED | `offline: 'bg-default-400'` at line 41 |

---

## Key Link Verification

### Plan 01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src-tauri/src/commands/http.rs` | `src-tauri/src/sync/actor.rs` | notify_change_inner after save_request | WIRED | Line 72: `crate::commands::sync::notify_change_inner` called in spawn after save |
| `src-tauri/src/lib.rs` | `src-tauri/src/sync/actor.rs` | periodic pull task enqueues Pull messages | WIRED | Lines 82-89: `periodic_actor.pull(...)` called in 30s interval loop |
| `src-tauri/src/sync/actor.rs` | `sync-status-changed` event | emit offline status on network error | WIRED | `emit_status(&app, ..., "offline", ...)` called in both Pull and CommitAndPush error arms |

### Plan 02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/stores/syncStore.ts` | `sync-status-changed` event | listen callback detects offline transitions | WIRED | `listen<SyncStatusPayload>('sync-status-changed', ...)` with `previousStatuses` tracking |
| `src/App.tsx` | `src/stores/syncStore.ts` | focus listener calls triggerPull | WIRED | `useSyncStore.getState().triggerPull(workspace.id)` at line 41 |
| `src/features/sync/SyncStatusChip.tsx` | `src/stores/syncStore.ts` | reads offline status, calls triggerSync on click | WIRED | Reads `syncStatuses` from store; `handlePress` calls `triggerSync` |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `actor.rs` debounce arm | `pending_push` | Set by `NotifyChange` message | Yes — populated by real file save hooks | FLOWING |
| `actor.rs` Pull arm | `is_offline` | Set by `is_network_error()` on real push/pull result | Yes | FLOWING |
| `lib.rs` periodic pull | `entries` from `load_registry` | Reads real workspace registry JSON | Yes | FLOWING |
| `syncStore.ts` | `syncStatuses` | Populated by `sync-status-changed` Tauri event from actor | Yes — actor emits after real git ops | FLOWING |
| `App.tsx` focus listener | `workspace` | Read from `workspaceStore.getState()` | Yes — real workspace state | FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Rust sync tests pass | `cargo test sync::tests` | 4 tests ok | PASS |
| Rust compilation | `cargo check` | 0 errors (2 warnings only) | PASS |
| TypeScript compilation | `npx tsc --noEmit` | TS2451: CloudOffIcon redeclared at SyncStatusChip.tsx:71 and :115 | FAIL |
| Frontend test suite | `npm run test` | 3 test files fail (App.test.tsx, TopBar.test.tsx, EnvironmentModal.test.tsx) — esbuild transform error on duplicate CloudOffIcon | FAIL |
| syncStore and SyncStatusChip logic tests | (subset of above) | syncStore.test.ts (2 pass), SyncStatusChip.test.tsx (4 pass), 5 other files pass — only files that transitively import broken SyncStatusChip fail | PARTIAL |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SYNC-01 | 07-01 | Changes auto-committed and pushed after ~2-3s debounce | SATISFIED | actor.rs select! loop; 13 save commands fire notify_change_inner; 3-second debounce confirmed in code |
| SYNC-02 | 07-01 | Workspace pulls from remote on ~30s interval | SATISFIED | lib.rs periodic pull timer: `interval(Duration::from_secs(30))`; iterates all GitHub-backed workspaces |
| SYNC-03 | 07-02 | Workspace pulls immediately on focus/switch | SATISFIED | App.tsx: `getCurrentWindow().onFocusChanged()` fires `triggerPull` on window focus gain |
| SYNC-06 | 07-01, 07-02 | Changes queue locally when offline and push on reconnect | SATISFIED (backend) / PARTIAL (frontend display) | Backend: `pending_push` queue + reconnection flush in actor.rs fully implemented. Frontend offline display blocked by SyncStatusChip compile error. |

**Orphaned requirements check:** REQUIREMENTS.md maps only SYNC-01, SYNC-02, SYNC-03, SYNC-06 to Phase 7. No orphaned requirements found.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/features/sync/SyncStatusChip.tsx` | 71 & 115 | Duplicate `const CloudOffIcon` declaration — two distinct SVG implementations of the same identifier | BLOCKER | TypeScript TS2451 compile error. Breaks frontend build, fails 3 test files, prevents ship. |

**Classification detail:** The first `CloudOffIcon` (lines 71-94) uses `viewBox="0 0 24 24"` with a 2-path cloud-off design. The second `CloudOffIcon` (lines 115-137) uses `viewBox="0 0 16 16"` with a different 2-path design. This appears to be a Wave 0 stub that was not removed when the production implementation was added. Both are substantive SVG components, but only one can be kept.

---

## Human Verification Required

### 1. Full Background Sync Loop (SYNC-01 through SYNC-06)

**Test:** After fixing the CloudOffIcon duplicate issue, run `npm run tauri dev`, connect a GitHub workspace, and exercise the full sync loop as described in Task 3 of 07-02-PLAN.md.

**Expected:**
- Save a request → chip shows "Syncing" after ~3s, then "Synced"
- Rapid saves → push fires only once, 3s after last save
- Wait 30s idle → chip briefly shows "Syncing" from periodic pull
- Switch away and back → chip shows "Syncing" immediately on focus return
- Disconnect Wi-Fi, make change → chip shows "Offline" + "You're offline" toast
- Reconnect Wi-Fi → chip transitions Offline → Syncing → Synced with "Back online — syncing..." toast
- Click offline chip → triggers sync attempt

**Why human:** Runtime timing, window focus events, real network conditions, and visual chip rendering cannot be verified statically.

---

## Gaps Summary

One blocker prevents full phase completion: `src/features/sync/SyncStatusChip.tsx` contains two declarations of `const CloudOffIcon` (lines 71-94 and lines 115-137). This is a TypeScript TS2451 error that breaks the entire frontend build. The symptom is that 3 test files fail with an esbuild transform error and `npx tsc --noEmit` exits non-zero.

The root cause is clear: the Wave 0 test stub task (Plan 02, Task 0) existed before the production component was written, and when Task 1 implemented the component it appears both the stub-era and final-era CloudOffIcon SVGs were left in the file. The offline label/icon selection logic itself (the `status === 'offline'` branches) is correct — only the duplicate component definition needs removal.

**All backend work (Plan 01) is fully verified and passing.** The Rust actor, debounce loop, periodic pull timer, notify_change_inner hooks across 13 save commands, and all 4 Rust unit tests are correct and confirmed working.

The fix is minimal: delete one of the two `CloudOffIcon` constant declarations from `SyncStatusChip.tsx` (approximately 23 lines of SVG code). After that fix, TypeScript compilation and the full frontend test suite are expected to pass.

---

_Verified: 2026-03-28T06:25:00Z_
_Verifier: Claude (gsd-verifier)_
