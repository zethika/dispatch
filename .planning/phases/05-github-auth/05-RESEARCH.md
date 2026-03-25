# Phase 5: GitHub Auth - Research

**Researched:** 2026-03-25
**Domain:** GitHub OAuth Device Flow, tauri-plugin-secure-storage, git2 HTTPS clone, workspace metadata, toast notifications
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Login Flow UX**
- D-01: Login presented as a modal dialog. Triggered by "Connect GitHub" button in TopBar. Modal shows the device code in a large copyable field, a "Copy & Open GitHub" button that opens the browser, and a polling spinner ("Waiting for approval...") with a Cancel button.
- D-02: On successful auth, modal auto-dismisses and a success toast shows "Signed in as @username". TopBar updates to show avatar. No intermediate success screen.
- D-03: Logout via avatar dropdown in TopBar — small menu with username and "Sign out". App reverts to local-only mode. Connected workspaces stay on disk but can't sync until re-login.

**Repo Browser & Connect**
- D-04: Repo browser is a modal dialog with a search/filter input at top. Repos listed grouped by owner (personal repos first, then each org). Each row shows repo name, visibility icon (lock for private, globe for public), and a "Connect" button.
- D-05: During clone, the "Connect" button in the row becomes an inline progress spinner ("Cloning..."). Modal stays open. On success, row shows "Connected" and workspace appears in the sidebar behind the modal.
- D-06: Disconnect via confirmation dialog: "Disconnect [repo-name]? This removes the local copy. Your data is still on GitHub." Removes the local clone directory.

**Workspace Switcher**
- D-07: Workspace switcher is a dropdown at the top of the sidebar, above the collection tree. Shows current workspace name. Clicking opens a list of connected workspaces + "Connect repo" action (opens the repo browser modal).
- D-08: A permanent "Local" workspace entry is always in the switcher list. It's the default workspace before GitHub login and remains available after. Cannot be disconnected.
- D-09: Each workspace row in the dropdown shows the workspace name + a colored sync dot (green = synced, gray = local-only). Sync status details come in Phase 6-7.

**Auth State Transitions**
- D-10: Before login: TopBar shows "Connect GitHub" button. After login: button replaced by user's GitHub avatar (small circle). Clicking avatar opens dropdown with username and "Sign out".
- D-11: On GitHub token expiry or revocation (401 from API): non-blocking toast "GitHub session expired — Sign in again" with clickable action to open login modal. App stays functional in local-only mode.
- D-12: On app launch: read token from Keychain. If present, make lightweight GET /user call to verify validity. If valid, load user info + avatar into auth store. If expired/invalid, silently revert to local-only mode — no error on launch.

### Claude's Discretion
- GitHub App vs OAuth App configuration (affects token lifetime and refresh)
- Repo browser pagination strategy (for users with many repos)
- Clone target directory structure within app_data_dir
- Workspace metadata storage format (which workspaces are connected, their local paths)
- Sidebar header height and styling details
- Avatar loading/fallback when GitHub avatar URL is slow

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can log in via GitHub OAuth device flow (browser-based code entry) | GitHub device flow endpoints, polling protocol, tauri-plugin-secure-storage for token storage |
| AUTH-02 | User can list accessible GitHub repos (personal + org) after login | GET /user/repos + GET /user/orgs + GET /orgs/{org}/repos, pagination strategy |
| AUTH-03 | User can connect a GitHub repo as a workspace (clones locally) | git2 RepoBuilder with RemoteCallbacks, HTTPS token auth pattern, clone target directory |
| AUTH-04 | User can disconnect a workspace (removes local clone) | fs::remove_dir_all on clone path, workspace registry update |
| AUTH-05 | User can switch between connected workspaces via sidebar switcher | Workspace registry (JSON file), collectionStore.loadWorkspace(), environmentStore.loadEnvironments() reload |
</phase_requirements>

---

## Summary

Phase 5 integrates GitHub OAuth Device Flow authentication, GitHub API calls for repo listing, and git2-based HTTPS cloning to enable GitHub-backed workspaces. The core challenge is orchestrating three distinct systems: GitHub's OAuth protocol (polling-based, no redirects), the GitHub REST API for repo discovery, and git2 for local cloning with token authentication.

The locked decisions (D-01 through D-12) cover the full UX surface. The main decisions left to Claude's discretion are: (1) **OAuth App vs GitHub App** — OAuth Apps have non-expiring tokens (simpler for v1), GitHub Apps have 8-hour expiry with 6-month refresh tokens (more complex but more secure); (2) **workspace metadata format** — a single JSON registry file listing connected workspaces with their local paths, IDs, and GitHub metadata; (3) **pagination** — fetch all pages eagerly on modal open (acceptable for typical user with <500 repos).

The existing codebase is well-prepared: `TopBar.tsx` has the "Connect GitHub" placeholder button, `collectionStore.loadWorkspace()` is the workspace switch mechanism, and the thin-delegate command pattern (commands/ → module/logic.rs) is established. This phase adds three new Rust modules: `auth/`, `github/`, and `workspace/` (extending the existing collections workspace concept).

**Primary recommendation:** Use OAuth App (not GitHub App) for v1. Non-expiring tokens eliminate the refresh token complexity. The D-11 token-expired handler covers the rare case of manual token revocation. Add `tauri-plugin-secure-storage` for Keychain storage and `sonner` for toast notifications.

---

## Project Constraints (from CLAUDE.md)

| Directive | Constraint |
|-----------|------------|
| Token storage | Use `tauri-plugin-secure-storage` (macOS Keychain) — Stronghold is deprecated |
| GitHub API calls | Must be Rust-side via `tauri_plugin_http::reqwest` — never JS fetch with tokens |
| git2 async | All git2 operations must run in `tokio::task::spawn_blocking` — never from async fn |
| Tauri async | Use `tauri::async_runtime::spawn` exclusively — `tokio::spawn` panics in Tauri v2 |
| HeroUI | v2 stable only (`@heroui/react@2.7.11` pinned) — Tailwind v3 only |
| specta-typescript | Pin `0.0.9` (not 0.0.10) — resolves conflict with tauri-specta@rc.21 |
| HTTP stack | Do not add `reqwest` directly — use via `tauri_plugin_http::reqwest` |
| Auth flow | Device flow only (no localhost server, no deep links) — pure HTTP polling |

---

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| tauri-plugin-http | 2.5.7 | reqwest re-export for GitHub API calls | Already in Cargo.toml |
| git2 | 0.20.4 | Repo cloning (HTTPS with token) | NOT yet in Cargo.toml — must add |
| tauri-plugin-store | 2.x | Non-secret preferences (workspace registry) | Already in Cargo.toml |

### Must Add
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| tauri-plugin-secure-storage | 1.4.0 | macOS Keychain for OAuth token | Required by CLAUDE.md; not yet added |
| sonner | 2.0.7 | Toast notifications | First toast use in this phase (D-02, D-11); integrates cleanly with React 19 |

**Version verification (checked 2026-03-25):**
- `sonner`: 2.0.7 (latest stable)
- `react-hot-toast`: 2.6.0 (alternative, heavier)
- `tauri-plugin-secure-storage`: 1.4.0 (latest, confirmed at docs.rs)

**Installation:**
```bash
# Frontend
npm install sonner

# Rust - add to src-tauri/Cargo.toml
# tauri-plugin-secure-storage = "1"
# git2 = "0.20"

# Register plugin in lib.rs
# .plugin(tauri_plugin_secure_storage::init())
```

**Capabilities — must add to `src-tauri/capabilities/default.json`:**
```json
"secure-storage:default"
```
The `http:default` and `store:default` permissions are already present.

### Alternatives Considered
| Recommended | Alternative | Tradeoff |
|-------------|-------------|----------|
| sonner 2.x | react-hot-toast 2.x | react-hot-toast requires a `<Toaster>` provider and is heavier. Sonner has 7M+ weekly downloads, shadcn/ui default, minimal API |
| sonner 2.x | HeroUI built-in Toast | HeroUI v2 has no built-in Toast component — must use external |
| OAuth App | GitHub App | GitHub App tokens expire in 8 hours requiring refresh token flow. OAuth App tokens do not expire. For v1 simplicity, OAuth App is correct. D-11 covers the manual-revocation case. |
| git2 RepoBuilder | Running `git` CLI subprocess | git2 is embedded, no system git dep, no shell injection risk (CLAUDE.md constraint) |

---

## Architecture Patterns

### Recommended Project Structure (new modules)
```
src-tauri/src/
├── auth/
│   ├── mod.rs           # pub mod device_flow; pub mod token;
│   ├── device_flow.rs   # initiate_device_flow(), poll_for_token()
│   └── token.rs         # store_token(), load_token(), clear_token() — Keychain ops
├── github/
│   ├── mod.rs           # pub mod api;
│   └── api.rs           # get_user(), list_repos() — reqwest calls
├── workspace/
│   ├── mod.rs           # pub mod registry; pub mod clone_ops;
│   ├── registry.rs      # WorkspaceEntry, load_registry(), save_registry()
│   └── clone_ops.rs     # clone_repo(), remove_repo_clone()
└── commands/
    ├── auth.rs          # IPC commands: initiate_login, poll_login, cancel_login, logout, get_auth_state
    ├── github.rs        # IPC commands: list_repos (combined user+org)
    └── workspace.rs     # IPC commands: connect_workspace, disconnect_workspace, list_workspaces

src/
├── stores/
│   └── authStore.ts     # Zustand: { user, isLoggedIn, isLoading } + login/logout actions
├── features/
│   └── auth/
│       ├── LoginModal.tsx        # D-01: device code display + polling UI
│       └── RepoBrowserModal.tsx  # D-04/D-05: repo list + connect
└── components/layout/
    └── WorkspaceSwitcher.tsx     # D-07/D-08/D-09: sidebar dropdown
```

### Pattern 1: GitHub OAuth Device Flow (Rust)

**What:** Two-step HTTP polling flow. No redirect, no server, no deep links.
**When to use:** The only supported auth flow for Dispatch (per CLAUDE.md).

```rust
// Source: GitHub Docs + CLAUDE.md
// Step 1: POST https://github.com/login/device/code
// Body: client_id=CLIENT_ID&scope=repo
// Returns: device_code, user_code, verification_uri, expires_in=900, interval=5

// Step 2: Poll POST https://github.com/login/oauth/access_token
// Body: client_id=CLIENT_ID&device_code=DEVICE_CODE&grant_type=urn:ietf:params:oauth:grant-type:device_code
// Returns on success: access_token, token_type="bearer", scope
// Returns on pending: error="authorization_pending"
// Returns on rate limit: error="slow_down" (add 5s to interval)
// Returns on expiry: error="expired_token"
// Returns on cancel: error="access_denied"
```

**Polling state machine in Rust:**
- Spawn `tauri::async_runtime::spawn` for the polling loop
- Poll every `interval` seconds (start at 5s, add 5s on slow_down)
- On `authorization_pending`: sleep interval, retry
- On `slow_down`: increase interval by 5s, sleep, retry
- On `access_token`: store in Keychain, emit Tauri event to frontend
- On `expired_token` / `access_denied`: emit error event, stop polling
- Cancellation: frontend stores a cancel channel (or Tauri state flag)

### Pattern 2: Token Storage (tauri-plugin-secure-storage)

**What:** Store OAuth token in macOS Keychain via plugin API.
**Key names:** `github_token` (the OAuth access token).

```rust
// Source: docs.rs/tauri-plugin-secure-storage 1.4.0
use tauri_plugin_secure_storage::{SecureStorageExt, models::OptionsRequest};

// Store token
app_handle.secure_storage().set_item(
    app_handle.clone(),
    OptionsRequest {
        prefixed_key: Some("github_token".to_string()),
        data: Some(token),
        sync: None,
        keychain_access: None,
    },
)?;

// Load token
let response = app_handle.secure_storage().get_item(
    app_handle.clone(),
    OptionsRequest {
        prefixed_key: Some("github_token".to_string()),
        data: None,
        sync: None,
        keychain_access: None,
    },
)?;
let token: Option<String> = response.data;

// Remove token (logout)
app_handle.secure_storage().remove_item(
    app_handle.clone(),
    OptionsRequest {
        prefixed_key: Some("github_token".to_string()),
        data: None,
        sync: None,
        keychain_access: None,
    },
)?;
```

**Plugin registration in lib.rs:**
```rust
.plugin(tauri_plugin_secure_storage::init())
```

**Capability in default.json:**
```json
"secure-storage:default"
```

### Pattern 3: GitHub API Calls (reqwest via tauri-plugin-http)

**What:** All GitHub REST API calls go through Rust using the re-exported reqwest client.
**Why:** Tokens must never be passed to WebView (CLAUDE.md constraint).

```rust
// Source: CLAUDE.md + GitHub REST API docs
use tauri_plugin_http::reqwest;

// GET /user — verify token validity and get user info
let client = reqwest::Client::new();
let resp = client
    .get("https://api.github.com/user")
    .header("Authorization", format!("Bearer {}", token))
    .header("Accept", "application/vnd.github+json")
    .header("X-GitHub-Api-Version", "2022-11-28")
    .header("User-Agent", "Dispatch/0.1")
    .send()
    .await?;
// 401 = token invalid/expired

// GET /user/repos?per_page=100&page=N
// GET /user/orgs (then GET /orgs/{org}/repos?per_page=100&page=N for each org)
```

### Pattern 4: git2 HTTPS Clone with Token Auth

**What:** Clone a GitHub repo locally using the OAuth token as password.
**When to use:** AUTH-03 — user connects a repo as a workspace.

```rust
// Source: docs.rs/git2 RemoteCallbacks
// MUST run in spawn_blocking — git2 is synchronous, not async-safe (CLAUDE.md)
use git2::{RepoBuilder, FetchOptions, RemoteCallbacks, Cred};
use tauri::async_runtime;

// In async command — delegate to spawn_blocking:
async_runtime::spawn_blocking(move || {
    let token = token.clone();
    let mut callbacks = RemoteCallbacks::new();
    callbacks.credentials(move |_url, _username, _allowed| {
        // GitHub HTTPS: username is "x-oauth-basic" or "oauth2", password is the token
        Cred::userpass_plaintext("oauth2", &token)
    });
    callbacks.transfer_progress(|stats| {
        // Optional: emit Tauri event for progress UI
        let _ = tx.send(stats.received_objects());
        true
    });

    let mut fetch_opts = FetchOptions::new();
    fetch_opts.remote_callbacks(callbacks);

    let mut builder = RepoBuilder::new();
    builder.fetch_options(fetch_opts);

    builder.clone(&clone_url, &local_path)
}).await??;
```

### Pattern 5: Workspace Registry

**What:** JSON file tracking connected GitHub-backed workspaces (separate from the local workspace).
**Storage:** `tauri-plugin-store` (non-secret, already used for environment preferences).
**Key:** `"connected_workspaces"` in `dispatch-prefs.json`.

**Recommended structure:**
```typescript
// WorkspaceEntry stored in registry
interface WorkspaceEntry {
  id: string;              // UUID (matches workspaceId used by collections/environments)
  name: string;            // repo full_name e.g. "owner/repo-name"
  display_name: string;    // repo name only e.g. "repo-name"
  github_repo_full_name: string;  // "owner/repo-name"
  clone_url: string;       // HTTPS clone URL
  local_path: string;      // absolute path: app_data_dir/workspaces/{id}
  is_local: boolean;       // true only for the permanent "local" workspace
}
```

The permanent "Local" workspace is stored in the registry with `is_local: true` and is never removable. It was created by `ensure_default_workspace()` in Phase 1 — the registry must reconcile with its existing UUID.

### Pattern 6: Frontend Auth Store (Zustand)

```typescript
// src/stores/authStore.ts
interface AuthState {
  user: GitHubUser | null;    // { login, avatar_url, name }
  isLoggedIn: boolean;
  isLoading: boolean;         // startup token validation in progress

  checkAuth: () => Promise<void>;    // D-12: called on app startup
  login: (userCode: string, deviceCode: string) => Promise<void>;
  logout: () => Promise<void>;
}
```

**Startup flow (D-12):** `App.tsx` calls `authStore.checkAuth()` on mount. Rust command `get_auth_state` reads Keychain → calls GET /user → returns `{ user, is_valid }`. If valid: store user info. If invalid: silently reverts, clears stale token from Keychain.

### Pattern 7: Toast Notifications (sonner)

**What:** Non-blocking feedback for login success (D-02), token expiry (D-11), connect success.
**Setup:** One `<Toaster>` component in `App.tsx`. Call `toast()` from anywhere.

```typescript
// App.tsx — add once
import { Toaster } from 'sonner';
// ... in JSX:
<Toaster position="bottom-right" />

// Usage in components or stores
import { toast } from 'sonner';
toast.success(`Signed in as @${username}`);  // D-02
toast.error('GitHub session expired — Sign in again', {
  action: { label: 'Sign in', onClick: openLoginModal },  // D-11
});
```

### Anti-Patterns to Avoid
- **Polling in sync Rust without spawn_blocking:** Device flow polling uses reqwest async — must be in `tauri::async_runtime::spawn`. But git2 clone must be in `spawn_blocking`. Do not mix.
- **Passing token through IPC to frontend:** `get_auth_state` returns `{ user }` struct (login, avatar_url) — never the token itself.
- **Storing token in tauri-plugin-store:** That file is unencrypted JSON in app_data_dir. Token goes in `tauri-plugin-secure-storage` (Keychain) only.
- **Cloning synchronously in async command:** git2's `RepoBuilder::clone` blocks the thread. Always wrap in `spawn_blocking`.
- **Paginating repos lazily (on scroll):** GitHub API pagination with per_page=100 is straightforward. Fetch all pages on modal open — a user with 200 repos makes 2 requests; performance is fine.
- **Using tokio::spawn:** CLAUDE.md prohibits this in Tauri v2. Use `tauri::async_runtime::spawn` exclusively.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast state + component | sonner | Accessibility (ARIA live regions), stacking, auto-dismiss timers, action buttons all handled |
| Keychain access | Direct keyring-rs calls | tauri-plugin-secure-storage | Plugin handles entitlements, platform differences, and is the CLAUDE.md-prescribed approach |
| Avatar image caching | Custom fetch + blob URL | Native `<img src={avatar_url}>` with `onError` fallback | GitHub avatar CDN is reliable; fallback to initials via CSS on error is sufficient |
| Org repo pagination | GraphQL or custom cursor | REST GET /orgs/{org}/repos?per_page=100 loop | Per-page=100 with Link header pagination is standard and simple |

**Key insight:** The device flow is pure HTTP polling — no OAuth callback server, no deep links, no special Tauri window management. All complexity is in correct poll interval management and the token-not-in-webview constraint.

---

## Common Pitfalls

### Pitfall 1: git2 Blocking the Async Runtime
**What goes wrong:** Calling `RepoBuilder::clone()` directly in an async Tauri command blocks the tokio executor thread, causing the entire app to freeze.
**Why it happens:** git2 wraps libgit2 which is synchronous I/O. It has no async interface.
**How to avoid:** Wrap ALL git2 operations in `tauri::async_runtime::spawn_blocking(|| { ... }).await?`.
**Warning signs:** App UI becomes unresponsive during clone; no progress events fire.

### Pitfall 2: Token in IPC Response
**What goes wrong:** Returning the raw GitHub token from a Rust command to the frontend exposes it in WebView memory and developer tools.
**Why it happens:** Convenience — frontend wants to make API calls.
**How to avoid:** Commands return `GitHubUser { login, avatar_url, name }` only. All authenticated API calls happen Rust-side. Frontend invokes Rust commands; Rust uses the stored token.
**Warning signs:** Any TS type definition containing `token`, `access_token`, or `auth` string fields.

### Pitfall 3: missing-entitlement Error on macOS for Keychain
**What goes wrong:** App crashes or silently fails to read/write Keychain with access denied error.
**Why it happens:** macOS sandboxed apps require the `keychain-access-groups` entitlement for non-default keychain access.
**How to avoid:** `tauri-plugin-secure-storage` handles this automatically via the plugin's entitlement configuration when using `init()`. Verify `"secure-storage:default"` is in capabilities JSON.
**Warning signs:** `Error: No matching keyring` or `Error: -25300` (errSecItemNotFound on first run in sandbox).

### Pitfall 4: Poll Interval Drift on slow_down Error
**What goes wrong:** When GitHub returns `slow_down`, the interval must permanently increase by 5s for subsequent polls (not just one poll). If the increase is reset each iteration, GitHub will keep returning `slow_down`.
**Why it happens:** Misreading the spec — `slow_down` means "your rate is too high, slow down permanently for this session."
**How to avoid:** Track `current_interval` as mutable state in the polling loop. On `slow_down`, increment and keep the higher value.
**Warning signs:** Repeated `slow_down` errors in logs; login flow never completes.

### Pitfall 5: Workspace Registry Not Initialized with "Local" Workspace
**What goes wrong:** The workspace switcher shows an empty list on first launch because the registry doesn't know about the local workspace created in Phase 1.
**Why it happens:** Phase 1's `ensure_default_workspace()` creates the workspace directory but predates the registry concept.
**How to avoid:** The `list_workspaces` command must check: if registry is empty or missing the local workspace, bootstrap it from the existing default workspace (`ensure_default_workspace` already returns the UUID). The permanent "Local" entry is always synthesized even without registry data.
**Warning signs:** Sidebar shows no workspaces on fresh install; workspace switcher is empty.

### Pitfall 6: Clone Directory Collision
**What goes wrong:** Two workspaces with the same repo name (but different owners) map to the same local directory.
**Why it happens:** Using `repo_name` as the directory name instead of the workspace UUID.
**How to avoid:** Clone into `app_data_dir/workspaces/{workspace_uuid}/` — the UUID is generated at connect time. The path is stored in the registry entry. This matches the existing `workspace_dir(&app, &workspace_id)` pattern in commands/environments.rs.
**Warning signs:** Second clone of same-named repo fails with "destination path already exists."

### Pitfall 7: OAuth App Registration (Client ID)
**What goes wrong:** Hardcoding the client ID in source code leads to credential exposure if the repo is ever made public.
**Why it happens:** Device flow doesn't use a client secret, so developers treat client_id as non-sensitive.
**How to avoid:** The client ID itself is semi-public (it's sent in the OAuth request and visible in network logs), BUT it should still be injected at build time via environment variable rather than hardcoded. Use `env!("GITHUB_CLIENT_ID")` in Rust (read from `$GITHUB_CLIENT_ID` at compile time via build script or Cargo env). For dev builds, store in `.env` (gitignored).
**Warning signs:** `client_id` literal in committed Rust source.

---

## Code Examples

Verified patterns from official sources:

### Device Flow Step 1: Request Device Code
```rust
// Source: GitHub Docs — https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow
#[derive(Deserialize)]
struct DeviceCodeResponse {
    device_code: String,
    user_code: String,
    verification_uri: String,
    expires_in: u32,
    interval: u64,
}

let resp = client
    .post("https://github.com/login/device/code")
    .header("Accept", "application/json")
    .form(&[("client_id", &client_id), ("scope", &"repo".to_string())])
    .send()
    .await?
    .json::<DeviceCodeResponse>()
    .await?;
// Send user_code + verification_uri to frontend modal (D-01)
```

### Device Flow Step 2: Poll for Token
```rust
// Source: GitHub Docs device flow
#[derive(Deserialize)]
#[serde(untagged)]
enum PollResponse {
    Success { access_token: String, token_type: String, scope: String },
    Error { error: String },
}

let mut interval = device_code_resp.interval; // starts at 5
loop {
    tokio::time::sleep(Duration::from_secs(interval)).await;
    let resp = client
        .post("https://github.com/login/oauth/access_token")
        .header("Accept", "application/json")
        .form(&[
            ("client_id", &client_id),
            ("device_code", &device_code),
            ("grant_type", &"urn:ietf:params:oauth:grant-type:device_code".to_string()),
        ])
        .send()
        .await?
        .json::<PollResponse>()
        .await?;

    match resp {
        PollResponse::Success { access_token, .. } => {
            // store in Keychain, return user info
            break;
        }
        PollResponse::Error { error } if error == "authorization_pending" => continue,
        PollResponse::Error { error } if error == "slow_down" => { interval += 5; continue; }
        PollResponse::Error { error } if error == "expired_token" => return Err(...),
        PollResponse::Error { error } if error == "access_denied" => return Err(...),
        _ => return Err(...),
    }
}
```

### GitHub API: Verify Token and Get User
```rust
// Source: GitHub REST API docs — GET /user
#[derive(Serialize, Deserialize, Type)]
pub struct GitHubUser {
    pub login: String,
    pub avatar_url: String,
    pub name: Option<String>,
    pub id: u64,
}

async fn get_github_user(token: &str) -> Result<GitHubUser, reqwest::Error> {
    reqwest::Client::new()
        .get("https://api.github.com/user")
        .header("Authorization", format!("Bearer {}", token))
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .header("User-Agent", "Dispatch/0.1")
        .send()
        .await?
        .json::<GitHubUser>()
        .await
}
// 401 response = token invalid — do NOT return error to frontend, silently revert (D-12)
```

### GitHub API: List Repos (user + orgs)
```rust
// Source: GitHub REST API docs
// Step 1: GET /user/repos?per_page=100&page=N (affiliation=owner,collaborator,organization_member)
// Step 2: GET /user/orgs — returns orgs list
// Step 3: GET /orgs/{org.login}/repos?per_page=100&page=N for each org

#[derive(Serialize, Deserialize, Type)]
pub struct RepoInfo {
    pub id: u64,
    pub name: String,
    pub full_name: String,          // "owner/repo"
    pub clone_url: String,          // HTTPS clone URL
    pub private: bool,
    pub owner: RepoOwner,
}

#[derive(Serialize, Deserialize, Type)]
pub struct RepoOwner {
    pub login: String,
}

// Paginate until empty page
async fn fetch_all_repos(token: &str) -> anyhow::Result<Vec<RepoInfo>> {
    let mut repos = Vec::new();
    let mut page = 1u32;
    loop {
        let page_repos = client
            .get("https://api.github.com/user/repos")
            .query(&[("per_page", "100"), ("page", &page.to_string()),
                     ("affiliation", "owner,collaborator,organization_member")])
            // ... auth headers
            .send().await?.json::<Vec<RepoInfo>>().await?;
        if page_repos.is_empty() { break; }
        repos.extend(page_repos);
        page += 1;
    }
    Ok(repos)
}
```

### git2 HTTPS Clone with Token
```rust
// Source: git2 RemoteCallbacks docs + CLAUDE.md pattern
// WARNING: Must be in spawn_blocking — git2 is synchronous
use git2::{RepoBuilder, FetchOptions, RemoteCallbacks, Cred};

pub fn clone_repo(clone_url: &str, local_path: &Path, token: &str) -> Result<(), git2::Error> {
    let token = token.to_string();
    let mut callbacks = RemoteCallbacks::new();
    callbacks.credentials(move |_url, _username, _allowed| {
        Cred::userpass_plaintext("oauth2", &token)
    });

    let mut fetch_opts = FetchOptions::new();
    fetch_opts.remote_callbacks(callbacks);

    let mut builder = RepoBuilder::new();
    builder.fetch_options(fetch_opts);
    builder.clone(clone_url, local_path)?;
    Ok(())
}

// Called from async Tauri command:
// tauri::async_runtime::spawn_blocking(move || clone_repo(&url, &path, &token)).await??
```

### Workspace Registry (tauri-plugin-store)
```rust
// Workspace registry stored in dispatch-prefs.json under key "connected_workspaces"
// Load via store plugin in Rust command, or JS-side via @tauri-apps/plugin-store
// Registration on connect:
#[derive(Serialize, Deserialize, Type, Clone)]
pub struct WorkspaceEntry {
    pub id: String,
    pub display_name: String,
    pub github_repo_full_name: Option<String>,  // None for local workspace
    pub clone_url: Option<String>,
    pub local_path: String,
    pub is_local: bool,
}
```

### Toast Setup (sonner)
```tsx
// App.tsx — add Toaster once
import { Toaster } from 'sonner';

// In JSX tree:
<Toaster position="bottom-right" richColors />

// In components or store actions:
import { toast } from 'sonner';
toast.success(`Signed in as @${username}`);
toast.error('GitHub session expired', {
  action: { label: 'Sign in again', onClick: () => setLoginOpen(true) },
  duration: Infinity,  // stays until dismissed for auth errors
});
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| OAuth redirect flow (localhost server) | Device flow (pure polling) | No localhost server, no deep links, works headless |
| Stronghold (Tauri) | tauri-plugin-secure-storage (Keychain) | Native OS storage, Stronghold deprecated in Tauri v3 |
| GitHub App (8h tokens + refresh) | OAuth App (non-expiring tokens) | Simpler for v1; D-11 covers manual revocation |

**Deprecated:**
- `tauri-plugin-stronghold`: Deprecated in Tauri v3. Never use.
- Device flow with client_secret: Not required (and not supported) for device flow OAuth Apps.

---

## Open Questions

1. **GitHub OAuth App Client ID provisioning**
   - What we know: Client ID must not be hardcoded in source. Device flow only needs `client_id` (no secret).
   - What's unclear: How to inject at build time for dev vs production. Does the plan need a Wave 0 task to set up a GitHub OAuth App and provide the `GITHUB_CLIENT_ID` env var?
   - Recommendation: Plan Wave 0 must include task: "Create GitHub OAuth App in GitHub settings, set `GITHUB_CLIENT_ID` in `.env` (gitignored), add `env!("GITHUB_CLIENT_ID")` read in Rust." Production build can embed via CI secret.

2. **Workspace switcher current workspace on switch**
   - What we know: `collectionStore.loadWorkspace(id)` and `environmentStore.loadEnvironments(id)` both need to be called on workspace switch.
   - What's unclear: Whether `requestStore` active request should be cleared or preserved per-workspace. The context file notes it "May need to clear/reload."
   - Recommendation: Clear `activeRequestId` in requestStore on workspace switch (set to null). Each workspace has different collections so the ID is meaningless cross-workspace.

3. **tauri-plugin-secure-storage capability permission string**
   - What we know: The plugin needs a capability entry and uses `SecureStorageExt` trait.
   - What's unclear: Exact capability identifier string (is it `"secure-storage:default"` or `"secure-storage:allow-*"`?).
   - Recommendation: Use `"secure-storage:default"` (matches the plugin name "secure-storage" in init()). Verify during Wave 0 when adding the plugin — the schema will validate it.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend build | Yes | v24.3.0 | — |
| Rust (cargo) | Backend build | Assumed yes (existing project builds) | 1.78+ | — |
| git2 crate | AUTH-03 clone | Not yet in Cargo.toml | 0.20.4 (to add) | — |
| tauri-plugin-secure-storage | AUTH-01 token storage | Not yet in Cargo.toml | 1.4.0 (to add) | — |
| sonner (npm) | D-02, D-11 toasts | Not in package.json | 2.0.7 (to add) | — |
| GitHub OAuth App | AUTH-01 device flow | Not yet registered | — | Must create before implementing |

**Missing dependencies with no fallback:**
- GitHub OAuth App: Must be registered in GitHub settings before any auth code can run. Plan Wave 0 must include this step.

**Missing dependencies with fallback:**
- None — all missing deps are addable within the phase.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | LoginModal renders with device code fields and polling states | unit | `npm test -- src/features/auth/LoginModal.test.tsx` | ❌ Wave 0 |
| AUTH-01 | TopBar shows "Connect GitHub" when logged out, avatar when logged in | unit | `npm test -- src/components/layout/TopBar.test.tsx` | ✅ (needs extension) |
| AUTH-02 | RepoBrowserModal renders repo list grouped by owner | unit | `npm test -- src/features/auth/RepoBrowserModal.test.tsx` | ❌ Wave 0 |
| AUTH-03 | WorkspaceSwitcher shows connected workspaces + "Connect repo" action | unit | `npm test -- src/components/layout/WorkspaceSwitcher.test.tsx` | ❌ Wave 0 |
| AUTH-04 | Disconnect confirmation dialog renders and calls disconnect command | unit | `npm test -- src/features/auth/RepoBrowserModal.test.tsx` | ❌ Wave 0 |
| AUTH-05 | Workspace switch calls loadWorkspace + loadEnvironments with new ID | unit | `npm test -- src/stores/authStore.test.ts` | ❌ Wave 0 |
| AUTH-01 | Rust: device_flow::initiate returns device_code + user_code | Rust unit | `cargo test -p dispatch -- auth` | ❌ Wave 0 |
| AUTH-01 | Rust: token::store_token and load_token round-trip (mocked keychain) | Rust unit | `cargo test -p dispatch -- auth::token` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/features/auth/LoginModal.test.tsx` — covers AUTH-01 modal states
- [ ] `src/features/auth/RepoBrowserModal.test.tsx` — covers AUTH-02, AUTH-03, AUTH-04
- [ ] `src/components/layout/WorkspaceSwitcher.test.tsx` — covers AUTH-05 switcher
- [ ] `src/stores/authStore.test.ts` — covers auth store state transitions
- [ ] `src-tauri/src/auth/device_flow.rs` test module — covers Rust auth logic
- [ ] Extend `TopBar.test.tsx` to cover logged-in avatar state (AUTH-01 D-10)
- [ ] Install sonner: `npm install sonner`
- [ ] Add to Cargo.toml: `tauri-plugin-secure-storage = "1"`, `git2 = "0.20"`
- [ ] Register GitHub OAuth App (manual step — cannot be automated)

---

## Sources

### Primary (HIGH confidence)
- GitHub Docs: Device Flow — https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow
- GitHub Docs: GET /user — https://docs.github.com/en/rest/users/users#get-the-authenticated-user
- GitHub Docs: GET /user/repos — https://docs.github.com/en/rest/repos/repos#list-repositories-for-the-authenticated-user
- GitHub Docs: GET /user/orgs — https://docs.github.com/en/rest/orgs/orgs#list-organizations-for-the-authenticated-user
- GitHub Docs: OAuth scopes — https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps
- GitHub Docs: Refresh tokens (GitHub Apps only) — https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens
- docs.rs tauri-plugin-secure-storage 1.4.0 — SecureStorageExt, set_item/get_item/remove_item
- docs.rs git2 RemoteCallbacks — credentials callback, transfer_progress callback
- CLAUDE.md project constraints — all stack decisions

### Secondary (MEDIUM confidence)
- sonner GitHub — https://github.com/emilkowalski/sonner (2.0.7 current, React 19 compatible, 7M+ weekly downloads)
- OAuth App vs GitHub App token comparison — multiple GitHub Docs pages cross-referenced

### Tertiary (LOW confidence)
- tauri-plugin-secure-storage capability identifier string (`"secure-storage:default"`) — inferred from plugin name in init(); needs verification during Wave 0 build

---

## Metadata

**Confidence breakdown:**
- GitHub Device Flow: HIGH — verified directly against GitHub official docs
- GitHub REST API endpoints: HIGH — verified directly against GitHub official docs
- tauri-plugin-secure-storage API: MEDIUM-HIGH — source code analyzed via docs.rs; exact method signatures confirmed from source; capability string LOW (inferred)
- git2 HTTPS clone pattern: MEDIUM-HIGH — from RemoteCallbacks docs; `userpass_plaintext` for HTTPS token is standard pattern
- sonner toast library: HIGH — version confirmed via npm registry, React 19 peer dep verified
- Workspace registry design: MEDIUM — Claude's discretion area, pattern follows existing tauri-plugin-store usage

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable APIs; GitHub REST API versioned and stable)
