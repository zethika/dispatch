---
phase: 07-background-sync-loop
plan: 01
subsystem: sync
tags: [rust, actor, debounce, offline-queue, periodic-pull, tokio]
dependency_graph:
  requires: []
  provides: [debounced-auto-push, periodic-pull-timer, offline-detection, notify-change-ipc]
  affects: [commands/http, commands/collections, commands/environments, sync/actor, sync/types]
tech_stack:
  added: [tokio/time feature]
  patterns: [select! debounce loop, fire-and-forget notify, offline queue in actor state]
key_files:
  created:
    - src-tauri/src/sync/tests.rs
  modified:
    - src-tauri/Cargo.toml
    - src-tauri/src/sync/types.rs
    - src-tauri/src/sync/actor.rs
    - src-tauri/src/sync/mod.rs
    - src-tauri/src/commands/sync.rs
    - src-tauri/src/commands/http.rs
    - src-tauri/src/commands/collections.rs
    - src-tauri/src/commands/environments.rs
    - src-tauri/src/lib.rs
    - src/api/sync.ts
decisions:
  - "ActorHandle accepts app_handle in new() to enable internal event emission without state lookup"
  - "is_network_error is pub(crate) so tests.rs can validate detection logic directly"
  - "notify_change_inner uses best-effort pattern: all failures silently ignored to never block saves"
  - "Debounce sleep reset while offline is skipped: no point timing when we cannot push"
  - "Reconnection flush (D-06): pull success while offline immediately fires queued commit+push"
  - "Periodic timer consumes first tick to avoid immediate pull on app startup"
metrics:
  duration_minutes: 5
  completed_date: "2026-03-29"
  tasks_completed: 3
  files_changed: 10
---

# Phase 7 Plan 1: Background Sync Loop — Actor Debounce & Periodic Pull Summary

**One-liner:** Debounced commit+push via tokio select! loop, 30s periodic pull timer, offline queue with reconnection flush, all wired into 13 mutating save commands.

## What Was Built

The Rust git actor was extended from a simple message loop into a full background sync engine. Three major behaviors were added:

1. **Debounced auto-push:** A `tokio::select!` loop with a pinned sleep future replaces the simple `while let Some(msg)` loop. `NotifyChange` messages reset a 3-second timer; when the timer fires with no new messages, it executes commit+push. Only one timer runs at a time — each new notify resets the deadline.

2. **Offline queue:** When any push fails with a network error, `is_offline` flips to `true` and the pending push context is preserved in `pending_push: Option<PendingPush>`. The timer reset is skipped while offline. When the periodic pull succeeds after a failure, offline clears and the queued push fires immediately (D-06 reconnection flush).

3. **Periodic pull:** A 30-second `tokio::time::interval` task spawned in `setup()` iterates all GitHub-backed workspaces and calls `actor.pull()` for each. The first tick is consumed immediately to avoid a pull on startup. The actor already handles pull results — reconnection detection is centralized there.

All 13 mutating save commands (save_request, 8 collection commands, 4 environment commands) now fire `notify_change_inner` as a fire-and-forget spawn after successful I/O. `save_secret_values` is intentionally excluded — secrets are never committed to git.

## Deviations from Plan

None — plan executed exactly as written.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 0 | Wave 0 test stubs | c02c049 | sync/tests.rs, sync/mod.rs |
| 1 | Actor types, debounce, notify_change command | 2d1525c | types.rs, actor.rs, commands/sync.rs, lib.rs, api/sync.ts |
| 2 | Hook save commands and periodic pull | c8d1a14 | http.rs, collections.rs, environments.rs, lib.rs |

## Verification

- `cargo check --manifest-path src-tauri/Cargo.toml` exits 0 (warnings only)
- `cargo test sync::tests` passes: 4 tests ok
  - test_is_network_error_detects_connection_failures
  - test_is_network_error_rejects_auth_failures
  - test_notify_change_message_variant_exists
  - test_offline_status_variant_exists

## Known Stubs

None — all sync behaviors wired to real implementation.

## Self-Check: PASSED
