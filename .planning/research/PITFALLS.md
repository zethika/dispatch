# Pitfalls Research

**Domain:** Native macOS desktop HTTP client with git-based sync and GitHub OAuth (Tauri + React + git2)
**Researched:** 2026-03-23
**Confidence:** HIGH (most items verified against official Tauri docs, git2 issue tracker, and GitHub OAuth docs)

---

## Critical Pitfalls

### Pitfall 1: git2 Credential Callback Infinite Loop

**What goes wrong:**
When git2's remote callbacks invoke `credentials()`, and the provided credentials fail, libgit2 calls the callback again—and again—until it receives a terminal failure. If the callback doesn't track which methods it has already tried, the process hangs indefinitely with no error surfaced to the UI.

**Why it happens:**
The git2 Rust bindings expose raw libgit2 behavior. Developers naively return a fresh credential object on every call (e.g., always trying SSH agent) without tracking attempt state. This is documented as a known footgun in git2-rs issue #347.

**How to avoid:**
Use `auth-git2` or `git2_credentials` crates instead of hand-rolling credential callbacks. Both track attempted auth methods and fail gracefully. For Dispatch's HTTPS-with-token model, implement a single-attempt callback that returns the GitHub token once and returns `Err` on any subsequent invocation.

**Warning signs:**
- Clone or push operations block the UI thread with no timeout
- Background sync task never completes or emits a result
- CPU stays at 0% during a "running" git operation (waiting, not working)

**Phase to address:** Git sync foundation phase (first phase that wires up remote operations)

---

### Pitfall 2: Secrets Leaking into Git Commits

**What goes wrong:**
Environment variables (API keys, Bearer tokens) stored in the workspace's JSON files get committed to the GitHub repo and pushed. Teammates and anyone with repo access can read them. This is catastrophic for users treating Dispatch workspaces as shared team collections.

**Why it happens:**
Variable substitution is implemented at request-send time, but the placeholder string `{{SECRET_KEY}}` and its resolved value are both potentially written to disk. If the resolved value ends up in any file path that git2 tracks, it commits. Or the secrets storage path (`~/Library/Application Support/dev.dispatch.app/secrets/`) is placed inside the workspace directory by mistake.

**How to avoid:**
- Enforce an absolute separation: secrets live only in `~/Library/Application Support/dev.dispatch.app/secrets/`, never inside the cloned repo directory
- Add a `.gitignore` entry generator that Dispatch writes on workspace init — even though the secrets dir is outside the repo, add a `*.secret` or `dispatch-secrets.json` pattern as a defense-in-depth measure
- Variable substitution in the HTTP layer must resolve values in memory only, never persist resolved values to disk
- Write a pre-commit hook or equivalent Rust-side guard that scans staged files for patterns matching known secret keys before any `git2::Repository::commit()` call

**Warning signs:**
- Secrets config path is relative to the workspace root rather than `~/Library/`
- Variable substitution writes a "resolved request" JSON to disk for history/logging
- Any code path that serializes a `Request` after variable substitution to a file

**Phase to address:** Data model + secrets layer phase (must be locked down before any git push operation is wired)

---

### Pitfall 3: Blocking the Main Thread with git2 Operations

**What goes wrong:**
git2 is a synchronous C library. Clone, fetch, and push on large repos take seconds. If called from a Tauri command handler without being offloaded to a background task, the entire UI freezes for the duration of the operation.

**Why it happens:**
Tauri commands can be synchronous or async. Developers new to Tauri often implement git operations synchronously in `#[tauri::command]` functions, not realizing this blocks the main runtime thread. Even async commands using `tokio::spawn` can stall if git2 calls are inside `block_in_place` incorrectly.

**How to avoid:**
Wrap all git2 operations in `tokio::task::spawn_blocking` — git2 is not async-safe and must run on a dedicated blocking thread. The Tauri async runtime uses a multi-threaded Tokio executor; `spawn_blocking` correctly routes to the blocking thread pool. Never call git2 directly from `async fn` without `spawn_blocking`.

```rust
let result = tokio::task::spawn_blocking(move || {
    // all git2 calls here
}).await?;
```

**Warning signs:**
- UI becomes unresponsive during sync operations
- `#[tauri::command]` async functions calling `repo.fetch(...)` or `repo.push(...)` directly
- No use of `spawn_blocking` anywhere in the git module

**Phase to address:** Git sync foundation phase

---

### Pitfall 4: GitHub OAuth Device Flow — Token Expiry Not Handled

**What goes wrong:**
GitHub App user access tokens expire after 8 hours. Refresh tokens expire after 6 months. The app silently fails on git push or API calls after the token expires, showing the user a cryptic auth error rather than re-prompting the device flow.

**Why it happens:**
Initial OAuth implementation handles the happy path (token granted, stored, used). Token expiry is a secondary concern that gets deferred and never implemented. The GitHub API returns `401 Unauthorized`, which developers mistake for a network error or incorrect token rather than an expiry signal.

**How to avoid:**
- Persist both `access_token` and `refresh_token` with their `expires_at` timestamps to the secrets layer at first auth
- Before every GitHub API call and git remote operation, check if the access token has expired (or will expire in the next 60 seconds)
- If expired, attempt silent refresh using the refresh token; if the refresh token is expired, trigger a new device flow
- Distinguish between "auth error = re-auth needed" and "network error = retry" in error handling

**Warning signs:**
- Token stored as a simple string with no expiry metadata
- No `refresh_token` stored alongside `access_token`
- GitHub API 401 errors handled the same way as network errors
- Users reporting "random logouts" after using the app all day

**Phase to address:** GitHub OAuth phase; must be complete before git sync phase

---

### Pitfall 5: Deep Links Don't Work in `tauri dev`

**What goes wrong:**
GitHub OAuth device flow completes in the browser, but the redirect back to the app via custom URI scheme (`dispatch://`) fails silently in development. Developers assume deep linking is broken and implement workarounds (localhost HTTP server, polling) that then ship to production.

**Why it happens:**
On macOS, deep link scheme registration requires the app to be bundled as a `.app`. When running `npm run tauri dev`, the app is not bundled, so macOS does not register the custom scheme. The `tauri-plugin-deep-link` documentation covers this but developers miss it.

**How to avoid:**
Test deep linking only with `tauri build` output during OAuth development. For dev iteration, implement a fallback: display the GitHub device code + verification URL in the UI and let the user manually copy the code to `github.com/login/device`. This also handles cases where the deep link race condition fires before the Rust event listener is registered.

**Warning signs:**
- Deep link testing only in `tauri dev` mode
- "OAuth works on my machine" but reports of it not working in production builds
- Custom URI scheme not in `Info.plist` (check `tauri.conf.json` `identifier` and deep link config)

**Phase to address:** GitHub OAuth phase

---

### Pitfall 6: Sync Race Condition — Concurrent Push and Pull

**What goes wrong:**
Auto-sync fires both a debounced push (user made changes) and a periodic pull at the same time. git2 does not serialize these for you. If push and fetch run concurrently on the same `Repository` handle, you get data corruption or a panic from the underlying C library's non-thread-safe state.

**Why it happens:**
The debounce timer and the periodic pull interval are independent Tokio tasks. Both hold a reference to the same repository state. Without a mutex guarding all git2 access, the two operations collide.

**How to avoid:**
Protect all git2 repository operations behind a single `tokio::sync::Mutex<Repository>` (or use a dedicated single-threaded Tokio task as a "git actor" that serializes all operations through an `mpsc` channel). The actor pattern is strongly preferred — it avoids lock contention and makes the operation queue inspectable for the offline queue feature.

```
UI thread → mpsc::Sender<GitOp> → git actor task → git2 operations (serial)
```

**Warning signs:**
- Separate Tokio tasks each holding `Arc<Repository>` without a mutex
- Debounce and periodic pull both calling `spawn_blocking` independently
- Any `unsafe` workaround to share the repository across threads

**Phase to address:** Git sync foundation phase; design the actor before writing any sync code

---

### Pitfall 7: File Watcher / Debounce Triggering on git2's Own Writes

**What goes wrong:**
Dispatch watches the workspace directory for file changes to debounce-commit. git2 writes to `.git/` during fetch and checkout operations. The file watcher fires on these internal git writes, triggering another commit cycle, which triggers another fetch, creating a feedback loop that hammers the GitHub API.

**Why it happens:**
File watchers using `notify` crate watch the entire workspace directory tree, including `.git/`. Developers filter for their JSON data files by extension but miss that `.git/FETCH_HEAD`, `.git/index`, and ref files also change.

**How to avoid:**
Explicitly exclude the `.git/` directory from the file watcher path. Only watch `collections/`, `environments/`, and the workspace manifest file. Alternatively, track changes via Dispatch's own write operations (not filesystem events) — only trigger a commit when Dispatch itself mutates data, not when the filesystem changes for any reason.

**Warning signs:**
- File watcher registered on the repo root path without explicit `.git` exclusion
- Sync operations incrementing rapidly in logs with no user activity
- GitHub rate limit errors appearing after startup

**Phase to address:** Git sync foundation phase

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store GitHub token as plain string in `~/.config/dispatch.json` | Simpler than keychain integration | Token readable by any process; fails security audit; users uncomfortable | Never — use `keyring` crate (wraps macOS Keychain) from day one |
| Hand-roll git2 credential callback | Avoid adding `auth-git2` dependency | Infinite loop hangs in edge cases; must be rewritten | Never — use `auth-git2` |
| Synchronous git2 calls in command handlers | Faster to write | UI freezes on slow connections; blocks Tauri event loop | Never for push/clone/fetch; acceptable for local-only reads (e.g., log, status) |
| Single JSON file for entire collection | Trivial reads/writes | Any edit to any request rewrites the whole file; large collections create large diffs; merge conflicts touch everything | Only for MVP with collections under ~20 requests; migrate to per-request files before v1 ships |
| Last-write-wins without user notification | No conflict UI needed | Users silently lose changes when two people edit the same collection; no way to know it happened | Never without the notification — notification is the entire contract of this approach |
| No token expiry handling | OAuth "works" on first run | Random auth failures 8+ hours later; users blame app reliability | Only acceptable in the first auth spike; must be resolved before any beta |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| git2 HTTPS auth | Passing username/password; trying SSH | Use `Cred::userpass_plaintext("x-access-token", &github_token)` for HTTPS with GitHub tokens |
| GitHub device flow | Polling with fixed interval | Respect the `interval` field in the device code response; add 5s on `slow_down` error as per spec |
| GitHub API for repo cloning | Using `git:` or `ssh:` URLs | Always use HTTPS clone URLs (`https://github.com/owner/repo.git`) since you have the token, not SSH keys |
| Tauri + macOS Keychain | Using `tauri-plugin-stronghold` for simple token storage | Use the `keyring` crate directly — it wraps macOS Keychain without the complexity of Stronghold's IOTA-based encryption |
| macOS deep links in dev | Testing in `tauri dev` | Always test OAuth redirect in a built `.app`; use manual code entry fallback for dev mode |
| git2 fetch on macOS | Using system libgit2 (often old) | The `git2` crate bundles libgit2 by default (`vendored` feature); do not link against system libgit2 which may be outdated or missing features |
| Tauri outgoing network | Missing entitlement for App Store | Use `com.apple.security.network.client` entitlement, not the generic outgoing one |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Cloning large repos on workspace connect | UI blocked for 30+ seconds with no progress | Run clone in `spawn_blocking`; emit progress events via Tauri events; show progress bar in UI | Any repo with >500MB history |
| Reading all JSON collection files on every render | Sluggish collection panel on large workspaces | Load collection tree lazily; cache in Zustand; only re-read files that have changed (track mtime) | Collections with 100+ requests |
| Debounce timer too short (< 1s) | Hammers git with tiny commits; slow repos accumulate hundreds of micro-commits | Use 3-5s debounce for commit; batch multiple file changes into one commit | Always visible — use 3s minimum |
| Re-rendering entire collection tree on any git event | UI jank during background sync | Emit specific `collection-changed` events with the file path that changed, not a blanket `sync-complete` | Noticeable at 50+ requests |
| Keeping the entire HTTP response body in Tauri state | Memory growth on large responses | Stream or truncate responses above 10MB; store only metadata in Rust state, pass body once to frontend | Responses > 5MB |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing all Tauri commands without capability scoping | Any XSS in webview can call git push, read secrets, make HTTP requests | Use Tauri v2 capabilities to explicitly enumerate which commands each window can invoke; deny by default |
| Sending resolved variables (with secret values) over IPC to log | Secrets appear in Tauri dev tools network tab or app logs | Variable substitution happens in Rust backend; only the unresolved template string ever crosses IPC in the non-request direction |
| Using `shell` permission to run git CLI as fallback | Arbitrary command injection if any user-controlled string reaches the shell | Never use shell exec for git; use git2 exclusively |
| Storing secrets in the workspace `.env`-style file inside the repo directory | Committed to git on first sync; visible to all teammates | Secrets live only in `~/Library/Application Support/dev.dispatch.app/secrets/`; workspace files contain only placeholder names |
| Not validating redirect URIs in device flow | Phishing via malicious app claiming same URI scheme | Device flow does not use redirect URIs — validation is built into the flow; do not add a redirect URI parameter |
| IPC command handlers accepting raw file paths from frontend | Path traversal outside workspace directory | Validate all file paths in Rust backend; resolve against workspace root and reject paths that escape it |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing raw git error messages to users | "authentication required but no callback set" is meaningless; user files a bug thinking app is broken | Map all git errors to human-readable messages: auth failure → "Sign in again", network error → "Can't reach GitHub, working offline" |
| Blocking the first request send behind GitHub auth | Users who just want to try the app can't until they log in; 60-second first-request goal broken | Local-only mode must be fully functional before any OAuth prompt; workspace creation requires auth but sending a request does not |
| Silent conflict resolution without notification | User's changes are gone; they don't know why | Always emit a visible (non-modal) toast: "Your changes to [collection name] were overwritten by a newer version from [teammate]" |
| No offline indicator | User sends a request, nothing happens, they don't know if it's the request or the sync that's broken | Show a persistent sync status indicator: synced / syncing / offline (queued N changes) |
| Auto-sync committing with generic messages like "auto-sync" | Git history becomes useless for debugging | Use structured commit messages: `dispatch: update [collection-name] ([N] requests)` with timestamp |
| Requiring users to set up git config (name, email) | First sync fails with "Please tell me who you are" libgit2 error | Pre-configure git author in all commits as `Dispatch <dispatch@app>` or use the GitHub user's name/email from the API |

---

## "Looks Done But Isn't" Checklist

- [ ] **OAuth:** Token stored with expiry timestamp AND refresh token — verify both survive app restart by reading from secrets store on launch
- [ ] **Secrets layer:** Secrets directory path is absolute (`~/Library/...`), not relative to workspace — verify by checking what git2 `Repository::workdir()` returns vs. secrets path
- [ ] **Offline queue:** Changes made while offline are committed to a local queue AND replayed after reconnect — verify by killing network during edit, restoring network, and checking remote
- [ ] **git2 auth callback:** Credential callback has retry-limit guard — verify by providing a wrong token and confirming the app fails fast with an error rather than hanging
- [ ] **Focus pull:** App triggers a pull when it comes back to foreground — verify by editing the remote repo in another client while Dispatch is backgrounded, then foregrounding
- [ ] **Conflict notification:** Last-write-wins fires a visible notification — verify by having two instances open the same file and saving in quick succession
- [ ] **Variable substitution:** Secret variable values never appear in committed JSON files — verify by searching `.git/` objects for a known secret value after a sync
- [ ] **File watcher:** `.git/` directory changes do not trigger debounce-commit — verify by running a fetch and confirming no new commit is created
- [ ] **macOS code signing:** App is notarized, not just signed — verify by downloading the built `.dmg` on a fresh Mac and opening without Gatekeeper warning
- [ ] **Tauri command capabilities:** Only the minimum required commands are exposed in each window's capability config — verify by attempting to call an unrelated command from the webview console

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Secrets committed to git | HIGH | Rotate all affected tokens immediately; use BFG Repo Cleaner or `git filter-repo` to scrub history; force-push; notify affected users |
| Infinite credential loop shipped | MEDIUM | Hotfix release wrapping all git callbacks in attempt-limit guard; app update required |
| Main thread blocking shipped | MEDIUM | Refactor git commands to `spawn_blocking`; no data migration needed; ship patch |
| Token expiry not handled | LOW | Add expiry check + refresh logic; existing tokens still work until they expire; transparent to user |
| Single large JSON file per collection | HIGH (if shipped) | Schema migration required; all workspace repos need their JSON files restructured; coordinate with users |
| Deep link not working in release builds | LOW | Debug `Info.plist` scheme registration in `tauri.conf.json`; re-notarize; ship patch |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| git2 credential callback loop | Git sync foundation | Test with an invalid token — confirm fast failure, not hang |
| Secrets leaked to git | Data model + secrets layer | Grep `.git/` objects for a known secret value post-sync |
| Blocking main thread | Git sync foundation | Verify all git2 calls use `spawn_blocking`; UI stays responsive during clone |
| OAuth token expiry | GitHub OAuth phase | Fast-forward system clock 9 hours; confirm silent refresh occurs |
| Deep links in dev only | GitHub OAuth phase | Run full device flow against a `tauri build` release binary |
| Sync race condition | Git sync foundation | Implement git actor before wiring debounce AND periodic pull |
| File watcher feedback loop | Git sync foundation | Run fetch; confirm zero new commits created by watcher |
| Missing conflict notification | Git sync + collection CRUD phase | Force a last-write-wins scenario; confirm toast appears |
| Code signing / notarization | Distribution phase | Test on a fresh Mac with Gatekeeper enabled |
| Author identity in git commits | Git sync foundation | Check `git log` in the workspace repo for "Please tell me who you are" errors |
| Variable substitution memory-only | Data model + HTTP execution phase | Confirm no request file on disk contains a resolved secret value |

---

## Sources

- [git2-rs credential callback hanging issue #347](https://github.com/rust-lang/git2-rs/issues/347)
- [auth-git2 crate — crates.io](https://crates.io/crates/auth-git2)
- [libgit2 authentication guide](https://libgit2.org/docs/guides/authentication/)
- [RUSTSEC-2023-0003: libgit2 SSH host key verification](https://rustsec.org/advisories/RUSTSEC-2023-0003.html)
- [Tauri v2 Security — Capabilities](https://v2.tauri.app/security/capabilities/)
- [Tauri v2 CSP](https://v2.tauri.app/security/csp/)
- [Tauri v2 IPC concepts](https://v2.tauri.app/concept/inter-process-communication/)
- [Tauri v2 Deep Linking plugin](https://v2.tauri.app/plugin/deep-linking/)
- [Tauri macOS code signing](https://v2.tauri.app/distribute/sign/macos/)
- [Tauri macOS outgoing network blocked issue #13878](https://github.com/tauri-apps/tauri/issues/13878)
- [Tauri webview versions reference](https://v2.tauri.app/reference/webview-versions/)
- [GitHub OAuth Device Flow docs](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [GitHub refreshing user access tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens)
- [Tokio + Tauri async process pattern](https://rfdonnelly.github.io/posts/tauri-async-rust-process/)
- [Tauri state management](https://v2.tauri.app/develop/state-management/)
- [macOS Keychain data protection — Apple](https://support.apple.com/guide/security/keychain-data-protection-secb0694df1a/web)
- [Deep linking OAuth use case in Tauri](https://mrlaude.com/articles/deep-linking-in-tauri-an-o-auth-use-case/)

---
*Pitfalls research for: Tauri + React + git2 native macOS HTTP client with GitHub OAuth and git-based sync*
*Researched: 2026-03-23*
