# Phase 7: Background Sync Loop - Research

**Researched:** 2026-03-28
**Domain:** Tokio async timer patterns, Tauri window events, debounce in Rust actors, offline state management
**Confidence:** HIGH

## Summary

Phase 7 activates automatic sync by layering two timers (debounce push + periodic pull) onto the existing mpsc git actor from Phase 6. The actor is already the serialization point for all git2 ops — this phase extends it with new message types and background timer tasks. No new crates are required: `tokio::time` is in the standard tokio feature set, and the Tauri window focus API is already available via `@tauri-apps/api`.

The debounce is cleanest as a tokio `sleep` future pinned inside a `select!` loop. When the actor receives a `NotifyChange` message, it resets the sleep deadline to `Instant::now() + 3s`. When the sleep expires, the actor fires `CommitAndPush`. This lives entirely in Rust — the frontend emits a fire-and-forget `notify_change` IPC call from each save command; the backend handles all timing. The periodic 30s pull is a separate `tauri::async_runtime::spawn` task that enqueues `Pull` messages to the actor, letting the actor's sequential queue prevent concurrent git2 calls.

On the frontend, three changes close out this phase: (1) `SyncStatus` type and `SyncStatusChip` gain an "offline" 6th state rendered with a gray cloud-off icon, (2) `syncStore` shows transition toasts on offline/online state changes, and (3) a `useEffect` in App.tsx (or equivalent root) attaches a `getCurrentWindow().onFocusChanged()` listener that calls `triggerPull` when `focused === true`.

**Primary recommendation:** Extend the actor with `NotifyChange` and debounce logic inside `run_actor`; spawn the periodic pull as a separate task via `tauri::async_runtime::spawn` in `lib.rs` `setup()`; use `getCurrentWindow().onFocusChanged()` for focus-pull on the frontend.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Trigger source is Tauri command hooks — hook into existing save commands (save_request, save_environment, etc.). No filesystem watcher (notify crate). Only in-app edits trigger sync; external edits are not detected.
- **D-02:** Debounce timer lives in Rust (git actor or companion task). Frontend signals "something changed", backend handles all timing logic. Keeps sync logic centralized in Rust.
- **D-03:** 3-second debounce delay. Standard reset-on-change behavior — timer restarts with every new "notify_change" signal. Push only fires after 3 seconds of true inactivity.
- **D-04:** Offline detection via push/pull failure. When a git operation fails with a network error, the workspace transitions to "offline" state. No proactive connectivity checks or OS-level network monitoring.
- **D-05:** In-memory offline queue only. Queue lives in Rust actor state. Lost on app quit. On next launch, the app detects uncommitted changes via git status and syncs normally. No disk persistence for the queue.
- **D-06:** Reconnection piggybacks on the periodic pull timer. The ~30s pull timer keeps running while offline. When a pull succeeds, offline state clears and any queued push fires. No dedicated retry loop or exponential backoff.
- **D-07:** Fixed 30-second pull interval using tokio timer. Runs continuously regardless of user activity. No adaptive frequency. If nothing changed remotely, pull is a cheap no-op (fetch finds no new commits).
- **D-08:** Focus-pull via Tauri window focus event on the frontend. Frontend listens for focus event and calls pull_workspace. Fires once per focus transition, not on every click.
- **D-09:** No special coordination between push and pull. Both go through the mpsc actor queue and execute in order. The actor's sequential processing naturally prevents concurrent git ops. No priority logic needed.
- **D-10:** New "offline" state added to SyncStatusChip (6th state). Gray cloud-off icon + "Offline" text. Distinct from "error" (red, implies something broke). Offline is an expected transient state, not a failure.
- **D-11:** Toast notifications on both offline and online transitions. Going offline: "You're offline - changes will sync when reconnected". Reconnecting: "Back online - syncing...". Follows the "reassure, don't alarm" principle from Phase 6.
- **D-12:** Clicking the sync chip while offline attempts an immediate sync. If connectivity returned, the sync succeeds and offline state clears. If still offline, stays in offline state. Gives user a manual retry option.

### Claude's Discretion

- How to implement the "notify_change" signal from Tauri commands to the debounce timer (function call, mpsc message, shared atomic flag)
- Tokio timer implementation details (tokio::time::interval vs sleep loop)
- Whether the debounce timer and periodic pull timer are part of the actor or separate tasks
- How to distinguish network errors from auth errors or other git failures
- WorkspaceSwitcher dot color for offline state (likely gray, matching the chip)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SYNC-01 | Changes are automatically committed and pushed after ~2-3s of inactivity (debounce) | Debounce via `tokio::time::sleep` reset pattern in actor; save commands send `NotifyChange` IPC |
| SYNC-02 | Workspace pulls from remote on a regular interval (~30s) | `tokio::time::interval(Duration::from_secs(30))` in separate spawn task; enqueues `Pull` actor message |
| SYNC-03 | Workspace pulls immediately on focus/switch | `getCurrentWindow().onFocusChanged()` frontend listener calling `pull_workspace`; workspace switch already covered in Phase 6 |
| SYNC-06 | Changes queue locally when offline and push when connectivity returns | In-memory `pending_push` flag in actor state; periodic pull doubles as reconnect detector; on pull success, flush pending push |
</phase_requirements>

---

## Standard Stack

### Core (No new crates needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tokio::time | via tokio 1.50.0 (already in Cargo.toml with `sync` feature) | Debounce sleep + periodic interval | Standard tokio timer primitives; `time` feature must be added to tokio dependency |
| @tauri-apps/api window | 2.10.1 (already installed) | `getCurrentWindow().onFocusChanged()` for focus-pull | Official Tauri JS API; already a project dependency |
| sonner | 2.0.7 (already installed) | Offline/online transition toasts | Already used for conflict toasts in Phase 6 |

### Tokio Feature Gate

The existing Cargo.toml has:
```toml
tokio = { version = "1.50.0", features = ["sync"] }
```

`tokio::time` requires the `time` feature. Add it:
```toml
tokio = { version = "1.50.0", features = ["sync", "time"] }
```

**Confidence:** HIGH — verified against Cargo.toml in codebase and tokio docs.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `tokio::time::sleep` reset in actor | `tokio-debouncer` crate | Crate adds dependency overhead; `sleep` + `reset()` is 10 lines and sufficient for this use case |
| Actor-internal debounce | Shared `AtomicU64` timestamp + polling | More complex, racing; actor select! is cleaner and already the project pattern |
| `tokio::time::interval` for pull | `sleep` loop for pull | `interval` is correct here: predictable 30s cadence regardless of pull duration drift |

---

## Architecture Patterns

### Recommended Project Structure

No new files required. Modifications to existing files:

```
src-tauri/src/
├── sync/
│   ├── actor.rs          # Extend: add NotifyChange message, debounce select!, pending_push flag
│   └── types.rs          # Extend: add NotifyChange to SyncMessage enum, Offline to SyncStatus
src-tauri/src/
├── commands/
│   └── http.rs           # Extend: save_request calls notify_change after write
│   └── environments.rs   # Extend: save_environment calls notify_change after write
│   └── collections.rs    # Extend: mutating commands call notify_change after write
├── lib.rs                # Extend: spawn periodic pull task in setup()

src/
├── stores/
│   └── syncStore.ts      # Extend: add offline SyncStatus, offline/online toasts
├── features/sync/
│   └── SyncStatusChip.tsx # Extend: add offline case to icon/label rendering
└── App.tsx (or root)     # Extend: attach onFocusChanged listener
```

### Pattern 1: Debounce via Sleep Reset in Actor Select Loop

**What:** The actor run loop adds a pinned `sleep` future alongside the existing `receiver.recv()`. Receiving a `NotifyChange` message resets the sleep deadline. When the sleep expires, the actor fires `CommitAndPush` for the workspace.

**When to use:** Any time you need a reset-on-change timer serialized through an existing actor — prevents concurrent git2 calls by design.

**Example:**
```rust
// Source: tokio::time::Sleep docs (docs.rs/tokio/latest/tokio/time/struct.Sleep.html)
// Pattern: debounce reset in select!

use tokio::time::{sleep, Duration, Instant};
use tokio::pin;

// Inside run_actor, alongside existing receiver:
let debounce_duration = Duration::from_secs(3);
// Start with a far-future deadline so the sleep doesn't fire immediately
let debounce = sleep(Duration::from_secs(u64::MAX / 2));
pin!(debounce);

loop {
    tokio::select! {
        Some(msg) = receiver.recv() => {
            match msg {
                SyncMessage::NotifyChange { workspace_id, local_path, clone_url, token } => {
                    // Reset debounce timer — fire 3s after last change
                    debounce.as_mut().reset(Instant::now() + debounce_duration);
                    // Store workspace context for when timer fires
                    pending_push = Some(PendingPush { workspace_id, local_path, clone_url, token });
                }
                // ... existing CommitAndPush, Pull arms
            }
        }
        () = &mut debounce, if pending_push.is_some() => {
            // 3 seconds of inactivity — fire the push
            if let Some(ctx) = pending_push.take() {
                // ... execute commit_and_push via spawn_blocking
            }
            // Reset to far future — no new pending push
            debounce.as_mut().reset(Instant::now() + Duration::from_secs(u64::MAX / 2));
        }
    }
}
```

**Key insight:** The `if pending_push.is_some()` guard on the sleep arm prevents the debounce from firing spuriously when there's no pending push. Without it, the sleep would fire the moment it's initialized if the deadline ever passed.

### Pattern 2: Periodic Pull as Separate Spawn Task

**What:** A standalone `tauri::async_runtime::spawn` task runs a `tokio::time::interval(30s)` loop, calling `actor.pull(...)` on each tick. This is separate from the actor run loop — it enqueues messages like any other caller.

**When to use:** Periodic work that doesn't need actor-internal state. Keeping this separate simplifies the actor and makes the interval trivially cancellable.

**Example:**
```rust
// Source: tokio::time::Interval docs + Tauri spawn pattern from existing codebase
// In lib.rs setup():

use tokio::time::{interval, Duration};

let actor_handle = sync::ActorHandle::new();
let periodic_actor = actor_handle.clone(); // ActorHandle is Clone
let app_handle = app.handle().clone();

tauri::async_runtime::spawn(async move {
    let mut ticker = interval(Duration::from_secs(30));
    ticker.tick().await; // consume first immediate tick
    loop {
        ticker.tick().await;
        // Get active workspace(s) from registry
        // For each GitHub-backed workspace, enqueue a pull
        if let Ok(entries) = workspace::registry::load_registry_handle(&app_handle) {
            for entry in entries.iter().filter(|e| !e.is_local && e.clone_url.is_some()) {
                if let Ok(Some(token)) = auth::token::load_token(&app_handle) {
                    let _ = periodic_actor.pull(
                        entry.id.clone(),
                        entry.local_path.clone(),
                        entry.clone_url.clone().unwrap(),
                        token,
                    ).await;
                }
            }
        }
    }
});

app.manage(actor_handle);
```

**Key note:** `ticker.tick().await` is called once before the loop to consume the first immediate tick — the first real pull fires 30 seconds after launch, not immediately (workspace switch already handles the on-load pull via Phase 6 D-12).

### Pattern 3: Frontend Focus Listener

**What:** `getCurrentWindow().onFocusChanged()` fires with `{ payload: focused }`. When `focused === true`, call `triggerPull` for the active GitHub workspace.

**When to use:** One-time setup in root component effect; returns an unlisten function for cleanup.

**Example:**
```typescript
// Source: Tauri v2 window API docs (v2.tauri.app/reference/javascript/api/namespacewindow/)
import { getCurrentWindow } from '@tauri-apps/api/window';

// In App.tsx or syncStore.initListener():
useEffect(() => {
  let unlisten: (() => void) | undefined;
  getCurrentWindow().onFocusChanged(({ payload: focused }) => {
    if (focused) {
      const { activeWorkspaceId } = useWorkspaceStore.getState();
      const workspaces = useWorkspaceStore.getState().workspaces;
      const workspace = workspaces.find((w) => w.id === activeWorkspaceId);
      if (workspace && !workspace.is_local && workspace.clone_url) {
        void useSyncStore.getState().triggerPull(workspace.id);
      }
    }
  }).then((fn) => { unlisten = fn; });
  return () => unlisten?.();
}, []);
```

**Implementation note:** `onFocusChanged` returns a `Promise<UnlistenFn>`. The `.then()` pattern is necessary because useEffect callbacks cannot be async. Store the unlisten fn and call it in the cleanup.

### Pattern 4: Offline State Detection and Queue

**What:** When `push_to_remote` or `pull` returns an error containing network-failure indicators, the actor emits an "offline" status event and sets an in-memory `is_offline` flag. Subsequent `NotifyChange` arrivals during offline mode set a `has_pending_push` flag instead of attempting push. When the periodic pull succeeds (implying reconnect), the actor clears `is_offline` and immediately fires any pending push.

**Network error detection (Claude's Discretion):** git2 network errors map to git2::Error with codes like `GIT_ENOTFOUND`, `GIT_EAUTH`, or messages containing "Could not connect", "SSL", "network". The clearest heuristic is checking for auth-related messages vs connectivity-related messages:

```rust
fn is_network_error(err: &str) -> bool {
    // Auth errors: "authentication failed", "not_authenticated" — NOT offline
    // Network errors: "Could not connect", "Network", "SSL", "timed out", "refused"
    let lower = err.to_lowercase();
    let is_auth = lower.contains("authentication failed") || lower.contains("not_authenticated");
    let is_network = lower.contains("could not connect")
        || lower.contains("network")
        || lower.contains("ssl")
        || lower.contains("timed out")
        || lower.contains("connection refused");
    is_network && !is_auth
}
```

This is heuristic-based (MEDIUM confidence) — git2 error messages are not a stable API surface. The consequence of misclassification is low: the user sees "offline" when they're actually having an auth error, which prompts a reconnect attempt that will fail and eventually fall through to an error toast.

### Anti-Patterns to Avoid

- **Calling `tokio::spawn` instead of `tauri::async_runtime::spawn`:** `tokio::spawn` panics in Tauri v2 because Tauri uses its own runtime. Project already enforces this; the periodic pull task must use `tauri::async_runtime::spawn`.
- **Multiple pinned sleeps:** Do not use separate pinned sleeps per workspace. Phase 7 handles a single active workspace at a time for the debounce. If multi-workspace support is needed later, a `HashMap<String, Instant>` last-change map is the right shape.
- **Debouncing on the frontend:** All timing logic lives in Rust (D-02). Do not implement debounce via `setTimeout` in the frontend.
- **Using `tokio::time::interval` for the debounce:** `interval` fires at fixed rate and cannot be "reset" by incoming events. Use `sleep` + `reset()` for debounce; use `interval` for the periodic pull.
- **Using the `notify` crate for filesystem watching:** D-01 explicitly excludes filesystem watchers. The save command hook pattern is the chosen mechanism.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Debounce reset | Custom channel with separate thread sleep | `tokio::time::sleep` + `reset()` in `select!` | stdlib tokio, no extra crates, cancel-safe |
| Periodic timer | `std::thread::sleep` loop | `tokio::time::interval` + `tick().await` | Non-blocking, no thread wasted, correct drift behavior |
| Focus event | `window.addEventListener('focus', ...)` DOM event | `getCurrentWindow().onFocusChanged()` | Tauri-native — fires on actual macOS window focus, not just tab focus in a browser context |
| Offline queue | Disk-persisted queue | In-memory `pending_push: bool` flag | D-05 mandates in-memory only; restart recovery is handled by `commit_all` detecting uncommitted changes |

---

## Common Pitfalls

### Pitfall 1: Debounce Fires Immediately on Actor Start

**What goes wrong:** If the pinned `sleep` starts with `Duration::from_secs(0)` or any elapsed instant, it fires in the first `select!` iteration before any message arrives.

**Why it happens:** `tokio::time::sleep` resolves immediately if the deadline is in the past.

**How to avoid:** Initialize with a far-future deadline — `Instant::now() + Duration::from_secs(u64::MAX / 2)` or `Duration::from_secs(86400)` (24h). Add the `if pending_push.is_some()` guard on the sleep arm.

**Warning signs:** Actor logs show "CommitAndPush" firing at startup with no user activity.

### Pitfall 2: Actor Deadlock When Periodic Pull Waits on Reply

**What goes wrong:** The periodic pull task calls `actor.pull(...)` which sends a message AND awaits a `oneshot` reply. If the actor is blocked on `spawn_blocking` for a long git2 op, the periodic task's channel send succeeds (mpsc capacity 32) but the `await` on the reply won't resolve until the actor finishes. This is expected and safe — not a deadlock — but if 32 messages accumulate (very unlikely at 30s intervals), new sends will block.

**Why it happens:** mpsc channel capacity is 32; periodic tasks + user-triggered syncs all share it.

**How to avoid:** This is not a real pitfall given realistic timing. Document it: the actor is designed for sequential ops and the queue capacity is sufficient. No action required.

### Pitfall 3: Focus Listener Triggering on Every Click Inside the App

**What goes wrong:** `window.addEventListener('focus', ...)` browser DOM event fires when any element inside the WebView receives focus. This would trigger a pull on every text field click.

**Why it happens:** DOM focus events bubble and fire at the document level.

**How to avoid:** Use `getCurrentWindow().onFocusChanged()` (Tauri window-level event), not the DOM `focus` event. The Tauri event fires only when the macOS window itself gains/loses focus — app switching, not element clicking.

**Warning signs:** Network traffic shows rapid pull attempts; `triggerPull` logs appear without window switching.

### Pitfall 4: `tokio::time` Feature Missing

**What goes wrong:** `tokio::time::sleep` and `tokio::time::interval` are compile errors: "use of undeclared crate or module `time`".

**Why it happens:** The current Cargo.toml has `features = ["sync"]` only. `time` is a separate feature gate.

**How to avoid:** Update Cargo.toml to `features = ["sync", "time"]` as the first step in Wave 0.

**Warning signs:** Rust compiler error on `tokio::time::sleep` or `tokio::time::interval`.

### Pitfall 5: Offline Toast Firing on Auth Errors

**What goes wrong:** The user is actually logged out (auth token expired), but the app shows "You're offline" because the push failure's error string is misclassified as a network error.

**Why it happens:** git2 error messages are not structured — both auth failures and network failures may say similar things depending on the git protocol layer.

**How to avoid:** Check for `not_authenticated` from `token::load_token` (returns `None`) before even attempting the push. If the token is absent, emit an "error" status event and skip the offline transition. For git2 errors post-attempt, apply the `is_network_error` heuristic and accept occasional misclassification (low consequence).

**Warning signs:** "You're offline" toast followed immediately by "Sync failed — sign in to GitHub and try again" toast.

### Pitfall 6: registry::load_registry Requires AppHandle in Periodic Task

**What goes wrong:** The periodic pull task runs outside any IPC command context. `load_registry` requires an `AppHandle` to resolve `app_data_dir()`.

**Why it happens:** Tauri path resolution is always relative to the app handle — no global state.

**How to avoid:** Clone `app.handle()` in `setup()` and move the clone into the spawned task. The `AppHandle` is `Clone` and `Send` — this is the standard pattern for background tasks in Tauri v2.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### Adding `time` feature to tokio
```toml
# src-tauri/Cargo.toml
tokio = { version = "1.50.0", features = ["sync", "time"] }
```

### NotifyChange IPC Command (new — Claude's Discretion: mpsc message)
```rust
// src-tauri/src/commands/sync.rs — new command, thin delegate
#[tauri::command]
#[specta::specta]
pub async fn notify_change(
    app: tauri::AppHandle,
    workspace_id: String,
) -> Result<(), String> {
    use tauri::Manager;
    let entries = crate::workspace::registry::load_registry(&app)?;
    let entry = entries.iter().find(|e| e.id == workspace_id)
        .ok_or_else(|| "workspace not found".to_string())?.clone();
    if entry.is_local { return Ok(()); }
    let clone_url = entry.clone_url.ok_or("no clone url")?;
    let token = crate::auth::token::load_token(&app)?
        .ok_or_else(|| "not_authenticated".to_string())?;
    let actor = app.state::<ActorHandle>();
    actor.notify_change(workspace_id, entry.local_path, clone_url, token).await
}
```

### Save Command Hook Pattern (save_request example)
```rust
// src-tauri/src/commands/http.rs — after existing fs::write
#[tauri::command]
#[specta::specta]
pub async fn save_request(
    workspace_id: String,
    // ... existing params
    app: tauri::AppHandle,
) -> Result<(), String> {
    // ... existing write logic ...
    // After successful write, signal the debounce timer
    // Fire-and-forget — sync failure doesn't fail the save
    let app2 = app.clone();
    let wid = workspace_id.clone();
    tauri::async_runtime::spawn(async move {
        let _ = notify_change_inner(&app2, wid).await;
    });
    Ok(())
}
```

### Actor Handle Extension (notify_change method)
```rust
// src-tauri/src/sync/actor.rs
impl ActorHandle {
    pub async fn notify_change(
        &self,
        workspace_id: String,
        local_path: String,
        clone_url: String,
        token: String,
    ) -> Result<(), String> {
        // Fire-and-forget — no reply channel needed
        self.sender
            .send(SyncMessage::NotifyChange { workspace_id, local_path, clone_url, token })
            .await
            .map_err(|_| "sync actor dropped".to_string())
    }
}
```

### Frontend SyncStatus Type Extension
```typescript
// src/stores/syncStore.ts
export type SyncStatus = 'synced' | 'syncing' | 'conflict' | 'error' | 'local' | 'offline';
```

### SyncStatusChip Offline Case
```tsx
// src/features/sync/SyncStatusChip.tsx — new icon + label arms
const CloudOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
    xmlns="http://www.w3.org/2000/svg" className="text-default-400">
    {/* cloud-off path */}
    <path d="M2 2L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M10.6 5.4A4 4 0 0 0 4.1 8.1C2.4 8.4 1 9.7 1 11.3 1 13 2.5 14 4 14h7.5"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// In icon selection:
const icon = status === 'offline' ? <CloudOffIcon /> : /* ... existing */;
const label = status === 'offline' ? 'Offline' : /* ... existing */;

// handlePress: allow click while offline — triggers sync attempt (D-12)
```

### Offline/Online Toast (syncStore)
```typescript
// src/stores/syncStore.ts — in the listen callback
// Track previous status for transition detection
let previousStatus: SyncStatus | undefined;

// In event listener:
const prevStatus = previousStatus;
previousStatus = status;

if (status === 'offline' && prevStatus !== 'offline') {
  toast("You're offline — changes will sync when reconnected");
}
if (status !== 'offline' && prevStatus === 'offline' && status === 'syncing') {
  toast("Back online — syncing...");
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tokio::spawn` in Tauri | `tauri::async_runtime::spawn` | Tauri v2 | `tokio::spawn` panics; must use Tauri's runtime |
| `window.addEventListener('focus', ...)` | `getCurrentWindow().onFocusChanged()` | Tauri v2 | DOM focus != window focus; Tauri event fires on OS-level focus change |
| Stronghold for secrets | `tauri-plugin-secure-storage` | Tauri v2 (Stronghold deprecated for v3) | Already on correct approach in this project |

---

## Open Questions

1. **Whether to debounce per-workspace or globally**
   - What we know: Only one workspace is "active" at a time; save commands receive `workspace_id`.
   - What's unclear: If a user has two workspaces with changes and switches between them rapidly, the debounce context switches.
   - Recommendation: Debounce per `workspace_id` — store `pending_push: HashMap<String, PendingPushCtx>` in actor state. Each entry is independently timed. Simpler than a single-context debounce and handles workspace switching cleanly.

2. **How many save commands need `notify_change` hooks**
   - What we know: Commands confirmed: `save_request`, `save_environment`, `save_secret_values`. Mutation commands: `create_collection`, `create_folder`, `create_request`, `rename_node`, `delete_node`, `delete_collection`, `rename_collection`, `duplicate_request`, `create_environment`, `delete_environment`, `rename_environment`.
   - What's unclear: `save_secret_values` writes only to the secrets file (never committed). Secrets are excluded from git by `.gitignore` pattern. Hooking it is harmless (commit_all would see no changes) but wastes a git status call.
   - Recommendation: Skip `save_secret_values`. Hook all other mutating commands.

3. **What to do if `registry::load_registry_handle` doesn't exist**
   - What we know: `load_registry` takes `&tauri::AppHandle` (verified in `src-tauri/src/commands/sync.rs`). The periodic pull task has an `AppHandle` clone.
   - What's unclear: Whether there's a function that takes `&AppHandle` vs `&tauri::App` — exact signature.
   - Recommendation: The existing `registry::load_registry(&app)` in sync.rs takes `&tauri::AppHandle` — confirmed by reading the command. The periodic task can use the same signature.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 7 is purely Rust/TypeScript code changes. No new external tools, services, or CLIs beyond what Phase 6 already required (`cargo`, `npm`). Both are confirmed available (Phase 6 shipped).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 3.x (inferred from `vitest run` in package.json) + Rust `cargo test` |
| Config file | `vitest.config.ts` (exists), jsdom environment, `src/test/setup.ts` |
| Quick run command | `npm test` (vitest run) |
| Full suite command | `npm test && cargo test --manifest-path src-tauri/Cargo.toml` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SYNC-01 | Debounced push fires after 3s inactivity | manual-only (requires real git remote + timing) | — | — |
| SYNC-01 | Save command hooks call notify_change | unit (Rust) | `cargo test --manifest-path src-tauri/Cargo.toml sync::` | ❌ Wave 0 |
| SYNC-02 | Periodic pull enqueues actor message | manual-only (requires timer elapse + real remote) | — | — |
| SYNC-03 | Focus event triggers pull | unit (frontend) | `npm test -- --grep "focus"` | ❌ Wave 0 |
| SYNC-06 | Offline flag set on network error | unit (Rust) | `cargo test --manifest-path src-tauri/Cargo.toml sync::actor` | ❌ Wave 0 |
| SYNC-06 | Pending push fires on pull success | unit (Rust) | `cargo test --manifest-path src-tauri/Cargo.toml sync::actor` | ❌ Wave 0 |
| D-10 | SyncStatusChip renders "Offline" state | unit (frontend) | `npm test -- --grep "SyncStatusChip"` | ❌ Wave 0 |
| D-11 | Offline toast shows on status transition | unit (frontend) | `npm test -- --grep "syncStore"` | ❌ Wave 0 |

**Note on SYNC-01/SYNC-02 manual-only classification:** Debounce timing and periodic interval tests require either: (a) mocked tokio time (complex in Tauri context), or (b) real git remotes. For this project's scope and given the Phase 6 precedent (no actor tests exist), these are verified via integration testing / UAT rather than automated unit tests.

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test && cargo test --manifest-path src-tauri/Cargo.toml`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/features/sync/SyncStatusChip.test.tsx` — covers D-10 offline state rendering
- [ ] `src/stores/syncStore.test.ts` — covers D-11 toast transitions (offline → online)
- [ ] `src-tauri/src/sync/actor_debounce_test.rs` (or inline `#[cfg(test)]` in actor.rs) — covers SYNC-06 offline flag and pending push flush

---

## Sources

### Primary (HIGH confidence)
- Tauri v2 window API docs (v2.tauri.app) — `getCurrentWindow().onFocusChanged()` confirmed, returns `Promise<UnlistenFn>`
- `tokio::time::Sleep` docs (docs.rs/tokio) — `reset(Instant)` method confirmed, `tokio::pin!` + `select!` pattern verified
- `tokio::time::Interval` docs (docs.rs/tokio) — `interval` vs sleep drift behavior confirmed
- Existing codebase (`src-tauri/src/sync/actor.rs`) — mpsc actor pattern, `spawn_blocking`, `tauri::async_runtime::spawn` confirmed

### Secondary (MEDIUM confidence)
- WebSearch + tokio docs cross-verification: `sleep` reset debounce pattern — multiple sources agree
- git2 error string heuristics for network vs auth detection — based on libgit2 behavior, not a stable API (flagged as heuristic)

### Tertiary (LOW confidence)
- `is_network_error` heuristic string matching — based on observed git2 error messages, not official enum mapping

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already in project; only `tokio time` feature gate missing
- Architecture: HIGH — patterns verified against tokio docs and existing Tauri v2 codebase
- Pitfalls: HIGH (pitfalls 1, 3, 4, 6) / MEDIUM (pitfall 5, network error heuristic)

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (tokio/Tauri APIs are stable; no fast-moving dependencies)
