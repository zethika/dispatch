# Project Research Summary

**Project:** Dispatch — Native Mac HTTP Client
**Domain:** Desktop HTTP client with git-backed team collaboration
**Researched:** 2026-03-23
**Confidence:** HIGH

## Executive Summary

Dispatch is a native macOS HTTP client built on Tauri 2.x (Rust backend, WKWebView frontend) that competes directly with Postman, Insomnia, and Bruno. The competitive differentiation is narrow but sharp: invisible, automatic git sync using GitHub as the collaboration layer, with a file-per-request data model that makes collections git-diffable and PR-reviewable. No competitor delivers transparent auto-sync without manual git operations (Bruno) or without proprietary cloud accounts (Postman, Insomnia). The no-account-required first launch — 60 seconds to first request — and macOS-native performance via Tauri are the two trust-building properties that must never regress.

The recommended implementation approach follows a strict layered build order driven by hard dependencies: the file-based data model must be defined before the git engine, the git engine before the sync loop, and GitHub OAuth before any remote git operations. The architecture separates concerns cleanly across Rust engines (HTTP execution via reqwest, git operations via git2, secrets via keyring) and a typed IPC boundary to a React/Zustand/TanStack Query frontend. The git actor pattern — serializing all git2 operations through a single mpsc channel — is the single most important structural decision and must be made before writing any sync code.

The highest-risk areas are the git integration (credential callback loops, thread-safety, file watcher feedback loops) and the secrets layer (accidental commit of resolved variables, wrong secrets storage path). Both risks are well-documented with specific, proven mitigations. Security mistakes in these two areas have HIGH recovery cost; all others are medium-to-low. The stack choices are stable and well-matched: the one caveat is HeroUI v2 (not the v3 beta) and Tailwind v3 (not v4) must be used together — HeroUI v3/Tailwind v4 is still beta as of Q1 2026.

## Key Findings

### Recommended Stack

The core stack is Tauri 2.10.3 (Rust + WKWebView), React 19.2, TypeScript 5.x, and Vite 8 on the frontend; git2 0.20.4, reqwest (via tauri-plugin-http), and keyring (via tauri-plugin-secure-storage) on the backend. This is a well-validated combination with active maintenance across all libraries. tauri-specta 2.x eliminates manual type maintenance across the IPC bridge and is worth using despite its RC status — it is used in production templates.

Zustand 5 manages frontend state across five focused domain stores; TanStack Query 5 wraps all Tauri command calls for loading/error state. The critical version constraint is HeroUI v2 stable paired with Tailwind CSS v3 — do not use HeroUI v3 beta or upgrade Tailwind to v4 until HeroUI v3 reaches stable release. All authenticated GitHub API calls and HTTP execution run Rust-side via reqwest; the frontend never touches tokens.

**Core technologies:**
- Tauri 2.10.3: App shell — sub-10MB binary, system WKWebView, no Chromium bloat
- Rust (stable 1.78+): Backend logic, git, HTTP, secrets — required for git2 and IPC
- React 19.2 + TypeScript 5.x: Frontend — concurrent rendering, strict types via tauri-specta
- git2 0.20.4: Git operations — vendored libgit2 1.9.0, no system dependency required
- tauri-plugin-secure-storage: macOS Keychain — tokens and secrets, never touch the filesystem
- HeroUI v2 stable + Tailwind CSS v3: Component library — do NOT use v3 beta or Tailwind v4

### Expected Features

The v1 MVP must include all features needed to replace Postman for a team's daily REST API workflow. The file-based data model and GitHub OAuth are load-bearing for the core differentiator; everything else is table stakes that competitors already provide. The most important anti-feature decisions: no pre/post-request scripts (JS runtime is a maintenance trap), no real-time collaboration (contradicts the no-server architecture), and no OpenAPI import (scope explosion).

See `.planning/research/FEATURES.md` for the full prioritization matrix and competitor analysis.

**Must have (table stakes):**
- Send HTTP requests (all methods) with headers, params, body — core job
- Response viewer with syntax highlighting, status, timing, size — unusable without
- Collections and nested folders — organization is not optional
- Environment variables with secret/non-secret distinction — teams have multiple envs
- Variable substitution in URL, headers, params, body — envs are useless without this
- Bearer token authentication — every secured API needs it
- cURL import and export (with resolved vars) — daily handoff workflow
- Keyboard shortcuts for common actions — power users will not use a mouse-only tool
- Cmd+K fuzzy search — navigation degrades at scale without it
- Tab-based multi-request interface — multiple requests open simultaneously
- SSL/TLS verification toggle — local dev with self-signed certs is common

**Should have (competitive differentiators):**
- GitHub OAuth device flow + repo-as-workspace — the collaboration layer
- Invisible auto-sync (debounced commit+push, periodic pull, focus pull) — core value prop
- Local-only secrets layer (never committed to git) — security non-negotiable for teams
- No-account first launch — local-only mode before any GitHub login (60s to first request)
- File-based data model (per-request JSON files, git-diffable) — enables transparent sync
- Conflict notification with last-write-wins — sync trust requires honesty
- Offline support with sync queue — connectivity must not cause data loss
- Native Mac app feel and performance — beats Electron competitors on this alone
- Drag-and-drop request/folder reordering — daily organization workflow

**Defer (v2+):**
- Postman collection import — complex, lossy, high support burden
- OpenAPI import — scope explosion into spec editor territory
- Pre-request variable injection (non-scripting) — dynamic values without JS runtime
- Windows/Linux builds — macOS-first allows fast iteration; evaluate after PMF

### Architecture Approach

Dispatch follows a strict two-process Tauri architecture: a Rust core process handles all business logic (HTTP execution, git operations, file I/O, secrets, background sync), and a React WebView process handles all UI. The IPC bridge is the only communication channel. Business logic is never written in command handlers — commands stay thin (validate, delegate, return); actual logic lives in domain engines (`http/`, `git/`, `secrets.rs`) that are independently testable. The background sync loop runs as a long-lived task spawned in `lib.rs` setup, not as a command the frontend triggers. All git2 operations serialize through a git actor task (mpsc channel) to prevent concurrent access to the non-thread-safe C library.

See `.planning/research/ARCHITECTURE.md` for the full project structure, data flow diagrams, and pattern implementations.

**Major components:**
1. Tauri Commands (`src-tauri/src/commands/`) — thin IPC entry points, one module per domain
2. HTTP Engine (`http/execute.rs`) — reqwest-based request execution, returns structured response
3. Git Engine (`git/`) — git2 clone/sync/conflict, all calls via git actor for thread safety
4. Background Sync Loop (`background.rs`) — debounced commit+push, periodic pull, focus pull
5. Secrets Store (`secrets.rs`) — keyring crate, macOS Keychain only, never touches filesystem
6. AppState (`state.rs`) — shared mutable Rust state behind `Mutex<T>`, registered via `app.manage()`
7. IPC Service Layer (`src/api/`) — typed TypeScript wrappers around `invoke()`, one file per domain
8. Zustand Stores (`src/stores/`) — five focused domain stores, not one monolith
9. File-Per-Request Data Model — one JSON file per request, directories as folders, repo as workspace

### Critical Pitfalls

1. **git2 credential callback infinite loop** — Use `auth-git2` crate instead of hand-rolling credential callbacks; implement single-attempt callback that fails fast on retry. A naive callback that always returns a fresh credential hangs indefinitely with no UI feedback.

2. **Secrets leaking into git commits** — Secrets directory must be an absolute path under `~/Library/Application Support/`, never relative to the workspace root. Variable substitution resolves in memory only; resolved values never touch disk. Add a Rust-side guard that scans staged files before any `git2::Repository::commit()` call.

3. **Blocking the main thread with git2** — All git2 operations (clone, fetch, push, pull) must be wrapped in `tokio::task::spawn_blocking`. git2 is a synchronous C library; calling it from `async fn` without `spawn_blocking` freezes the UI.

4. **Sync race condition — concurrent push and pull** — Implement the git actor pattern before writing any sync code: a single Tokio task serializes all git2 operations through an `mpsc::Sender<GitOp>` channel. This also provides the offline queue foundation.

5. **File watcher feedback loop** — The file watcher must explicitly exclude `.git/` from its watch path. git2's own writes to `.git/FETCH_HEAD`, `.git/index`, and ref files will trigger debounce-commit, which triggers fetch, creating a GitHub API-hammering feedback loop.

6. **GitHub OAuth token expiry not handled** — Persist `access_token`, `refresh_token`, and `expires_at` together. Check expiry before every GitHub API call and git remote operation; silently refresh; re-trigger device flow only if the refresh token is also expired.

7. **Deep links don't work in `tauri dev`** — macOS only registers custom URI schemes for bundled `.app` binaries. Test OAuth deep links with `tauri build` output only. Implement a manual code-entry fallback for dev mode.

## Implications for Roadmap

Based on research, the build order is driven by hard data dependencies: the file model must exist before git, auth before sync, sync before the background loop. Eight layers map cleanly to phases.

### Phase 1: Project Foundation + IPC Skeleton
**Rationale:** Validates the entire toolchain before any feature work. The Tauri IPC pattern is the foundation everything else is built on; confirm it works before committing to the architecture.
**Delivers:** Scaffolded Tauri project, one working round-trip `ping` command, Vite HMR wiring, ESLint/Prettier/tauri-specta configured, HeroUI v2 + Tailwind v3 rendering correctly.
**Avoids:** Discovering toolchain incompatibilities (HeroUI v3 beta, tokio::spawn vs tauri::async_runtime) after significant feature work is done.
**Research flag:** Standard patterns — skip research-phase.

### Phase 2: Data Model + File I/O
**Rationale:** The file-per-request JSON schema is the single most load-bearing decision in the entire product. Git diff quality, sync correctness, and conflict resolution all depend on it. Define and lock before anything reads or writes it.
**Delivers:** Collection/folder/request JSON schema, Rust read/write commands, TypeScript api/ wrappers, collection tree rendering in React (no git yet).
**Addresses:** Collections, saved requests, folder nesting.
**Avoids:** Secrets-in-git pitfall — secrets storage path must be defined here as `~/Library/Application Support/`, not relative to workspace.
**Research flag:** Standard patterns — skip research-phase.

### Phase 3: HTTP Execution Engine
**Rationale:** This is the product's core job. A user can send a request and see a response before any auth or git feature exists. Proving this works early validates the user value.
**Delivers:** `send_request` command (all HTTP methods, headers, body, params), reqwest execution, structured response struct, response viewer in React with syntax highlighting, status/timing/size display.
**Addresses:** Send HTTP requests, response viewer, SSL toggle, redirect following.
**Avoids:** JS-side fetch for execution — all HTTP runs Rust-side via tauri-plugin-http.
**Research flag:** Standard patterns — skip research-phase.

### Phase 4: Environment Variables + Secrets Layer
**Rationale:** Immediately needed alongside HTTP — requests without variable support are severely limited for real APIs. The secrets layer must be locked down before git is wired (it cannot be retrofitted safely).
**Delivers:** Environment CRUD, variable substitution (frontend, memory-only resolution), secret variable storage via keyring (macOS Keychain), `envStore.ts`, env selector UI.
**Addresses:** Environment variables, variable substitution, local-only secrets layer.
**Avoids:** Secrets leaking into git commits (CRITICAL pitfall) — secret variables routed exclusively to keychain here, before any git push exists.
**Research flag:** Standard patterns — skip research-phase.

### Phase 5: GitHub OAuth + Account Layer
**Rationale:** Auth gates all sync features. Must be complete and correct before clone/push/pull are built. Token expiry handling must be implemented here, not deferred.
**Delivers:** GitHub device flow OAuth, token + refresh token stored with expiry in keyring, GitHub REST API calls (user info, repo list), auth state in `workspaceStore.ts`, login/logout UI.
**Addresses:** GitHub OAuth device flow, no-account first launch (local-only mode remains functional).
**Avoids:** Token expiry not handled (store `expires_at` and `refresh_token` from day one), deep links in `tauri dev` (test against `tauri build` only), using Stronghold (use secure-storage/keyring instead).
**Research flag:** Needs deeper research during planning — GitHub App vs. OAuth App token lifetimes, refresh token rotation behavior, device flow polling interval compliance.

### Phase 6: Git Sync Engine (Synchronous)
**Rationale:** git2 integration is complex. Build synchronous clone/commit/push/pull first; validate against real GitHub repos before introducing background async complexity. The git actor pattern must be designed here before any concurrent sync exists.
**Delivers:** Git actor (`mpsc` channel serializing all git2 ops), `git/clone.rs`, `git/sync.rs` (commit+push, pull), `git/conflict.rs` (last-write-wins + notification), `commands/workspace.rs`, workspace connect/disconnect UI.
**Addresses:** GitHub repo as workspace, manual sync, conflict notification.
**Avoids:** git2 credential callback loop (use `auth-git2` crate), blocking main thread (all git2 in `spawn_blocking`), sync race condition (git actor before any concurrent tasks), correct HTTPS credential format (`Cred::userpass_plaintext("x-access-token", &token)`), pre-configuring git author identity (avoids "Please tell me who you are" libgit2 error).
**Research flag:** Needs deeper research during planning — git2 actor pattern implementation, `auth-git2` integration with HTTPS tokens, conflict detection strategy for fast-forward vs. diverged.

### Phase 7: Background Sync Loop
**Rationale:** The background loop depends on the sync engine working correctly. Building it before Phase 6 is validated would layer async complexity on top of unproven synchronous operations.
**Delivers:** `background.rs` long-lived task (spawned in `lib.rs` setup hook via `tauri::async_runtime::spawn`), debounced commit+push (3-5s debounce), periodic pull (configurable interval), focus pull on app foreground, offline queue (accumulate local commits, push on reconnect), sync status events to frontend (`sync:status`, `sync:conflict`), sync indicator UI.
**Addresses:** Invisible auto-sync, offline support with sync queue, focus-triggered pull, conflict notification surfacing.
**Avoids:** File watcher feedback loop (exclude `.git/` explicitly), `tokio::spawn` panic in Tauri v2 (use `tauri::async_runtime::spawn` exclusively), debounce too short (3s minimum), git actor contention (all background ops go through Phase 6 actor).
**Research flag:** Needs deeper research during planning — offline queue persistence strategy (survive app restart), focus detection via Tauri window events, debounce implementation with batching multiple file changes into one commit.

### Phase 8: Polish + Power Features
**Rationale:** These are enhancers on a stable core. Drag-and-drop, cURL import/export, and Cmd+K search are high-value UX features that do not unblock any other functionality.
**Delivers:** cURL import (paste detection + parser), cURL export (resolved vars), Cmd+K fuzzy search overlay (fuse.js), drag-and-drop request/folder reordering, full keyboard shortcut layer, tab persistence, UX polish (git error → human-readable messages, sync status indicator, conflict toast, structured commit messages).
**Addresses:** cURL import/export, Cmd+K search, drag-and-drop, keyboard shortcuts.
**Research flag:** Standard patterns — skip research-phase.

### Phase Ordering Rationale

- **Data model before git:** File schema is the sync unit; git diffs at the file level. Changing the schema after git is wired requires migrating committed files.
- **Secrets before git push:** Secrets layer cannot be safely retrofitted after push is wired. A wrong path or a resolved-value serialization bug during Phase 4 is a test failure; the same bug after Phase 6 is a credentials leak.
- **Auth before clone/push:** git2 remote operations require a valid token. Device flow and token expiry must be production-ready before any remote git call is written.
- **Sync engine before background loop:** Concurrent async complexity layers on top of synchronous correctness. Validate against real repos first.
- **HTTP in Phase 3:** The core user value (send a request, see a response) should be demonstrable as early as possible — before git, before auth. This also creates a usable local-only mode for no-account first launch.

### Research Flags

Phases likely needing deeper `/gsd:research-phase` during planning:
- **Phase 5 (GitHub OAuth):** GitHub App vs. OAuth App differences for desktop apps, token lifetime behavior, refresh token rotation, device flow polling spec compliance
- **Phase 6 (Git Sync Engine):** git actor pattern implementation details, `auth-git2` + HTTPS token integration, conflict detection strategy (fast-forward detection, diverged branch handling)
- **Phase 7 (Background Sync Loop):** Offline queue persistence across app restarts, Tauri window focus event APIs, batching multiple file changes into single commits

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** create-tauri-app scaffolding is well-documented; tauri-specta setup has official examples
- **Phase 2 (Data Model):** File I/O + serde_json is standard Rust; schema design is a product decision, not a research problem
- **Phase 3 (HTTP Engine):** reqwest via tauri-plugin-http is well-documented with official examples
- **Phase 4 (Environments + Secrets):** keyring crate + tauri-plugin-secure-storage have clear documentation; variable substitution is a string-replacement algorithm
- **Phase 8 (Polish):** fuse.js, drag-and-drop (dnd-kit), cURL parsing are all well-documented libraries

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All core libraries verified against official docs and crates.io as of 2026-03-23. One caveat: HeroUI v2/Tailwind v3 version pinning must be enforced actively — the v3 beta exists and npm may resolve to it. |
| Features | HIGH | Based on direct analysis of 5+ active competitors plus developer community sentiment from 2025-2026. MVP scope is conservative and well-validated by market evidence (Insomnia account gate backlash, Bruno adoption). |
| Architecture | HIGH | Tauri v2 official documentation is authoritative and current. Patterns (thin commands, events vs. commands, `async_runtime::spawn`) verified against official docs and confirmed bug reports. |
| Pitfalls | HIGH | Most pitfalls verified against official issue trackers, official docs, or confirmed CVEs. git2 credential loop confirmed in git2-rs issue #347. macOS network entitlement pitfall confirmed in tauri#13878. |

**Overall confidence:** HIGH

### Gaps to Address

- **HeroUI v3 stability timeline:** HeroUI v3 + Tailwind v4 support is the obvious future upgrade path. Monitor `v3.heroui.com` release cadence. The current recommendation (v2 + Tailwind v3) is the correct conservative choice for v1.
- **Offline queue persistence strategy:** Research does not resolve whether offline-queued commits should be stored in a local git branch, a separate queue file, or in-memory only (survives connectivity loss but not app restart). This needs a decision during Phase 7 planning.
- **GitHub App vs. OAuth App for Dispatch:** The OAuth approach (device flow) is clear, but the account type (GitHub App with user-token vs. classic OAuth App) has implications for token expiry (GitHub App tokens expire in 8 hours; classic OAuth tokens do not expire by default). This must be confirmed during Phase 5 planning — it affects the entire token refresh implementation.
- **macOS notarization in CI:** Code signing requirements are documented but the CI/CD setup for notarization is not covered in this research. Needs attention before any distribution phase.

## Sources

### Primary (HIGH confidence)
- https://v2.tauri.app/ — Tauri 2.10.3 architecture, process model, state management, capabilities, plugins
- https://docs.rs/crate/git2/latest — git2 0.20.4, libgit2 1.9.0, vendored feature
- https://docs.rs/crate/tauri-plugin-http/latest — tauri-plugin-http 2.5.7, reqwest re-export
- https://v2.heroui.com/ — HeroUI v2 stable; v3 beta status confirmed
- https://github.com/tauri-apps/tauri/issues/13878 — macOS sandbox network entitlement requirement (production pitfall confirmed)
- https://github.com/tauri-apps/tauri/issues/10289 — tokio::spawn panic in Tauri v2 (confirmed in official repo)
- https://github.com/rust-lang/git2-rs/issues/347 — git2 credential callback infinite loop (confirmed)
- https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps — GitHub device flow spec
- https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens — token expiry and refresh

### Secondary (MEDIUM confidence)
- https://github.com/specta-rs/tauri-specta — tauri-specta v2 RC, production use confirmed in community templates
- https://crates.io/crates/auth-git2 — auth-git2 crate for credential callback safety
- https://sneakycrow.dev/blog/2024-05-12-running-async-tasks-in-tauri-v2 — long-running async tasks pattern
- https://dev.to/n3rd/how-to-reasonably-keep-your-tauri-commands-organized-in-rust-2gmo — command organization patterns
- https://mrlaude.com/articles/deep-linking-in-tauri-an-o-auth-use-case/ — deep linking OAuth in Tauri

### Secondary (MEDIUM confidence — competitor analysis)
- https://www.usebruno.com/ — Bruno file-based model and git integration prior art
- https://github.com/Kong/insomnia/discussions/6590 — Insomnia account gate backlash (developer sentiment)
- https://betterstack.com/community/comparisons/postman-alternative/ — feature comparison across competitors
- https://medium.com/@PlanB./goodbye-postman-why-devs-are-ditching-the-cloud-and-going-local-c13f88b43af2 — developer migration sentiment

---
*Research completed: 2026-03-23*
*Ready for roadmap: yes*
