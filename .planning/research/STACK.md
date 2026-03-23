# Stack Research

**Domain:** Native Mac desktop HTTP client with git-backed collaboration
**Researched:** 2026-03-23
**Confidence:** HIGH (core Tauri/Rust stack), MEDIUM (HeroUI — v3 beta caveat noted), HIGH (git2, reqwest)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Tauri | 2.10.3 | App shell (Rust backend + system WebView) | Current stable 2.x series, macOS WebKit is WKWebView (native), ships without bundling a browser — sub-10MB binaries. Actively releasing monthly patches. |
| Rust | stable (1.78+) | Backend logic, git ops, HTTP requests, secrets | Tauri's native language; required for git2, reqwest, and the IPC command layer. |
| React | 19.2 | Frontend UI tree | Latest stable. Concurrent rendering, Actions API. HeroUI and TanStack libraries all support v19. |
| TypeScript | 5.x | Typed frontend code | Standard for Tauri + React; tauri-specta generates TS types from Rust, making strict typing across the IPC bridge practical. |
| Vite | 8.x | Frontend build/dev server | Official Tauri recommendation for SPA frameworks. HMR to localhost:5173, fast cold starts, native ESM. |

### Backend Crates (Rust / Cargo)

| Crate | Version | Purpose | Why |
|-------|---------|---------|-----|
| git2 | 0.20.4 | Clone, commit, push, pull, branch operations | Official libgit2 Rust bindings. Vendored libgit2 1.9.0 — no system dependency to install. The constrained requirement (only git ops Dispatch needs) is an asset: no full `git` binary needed. |
| tauri-plugin-http | 2.5.7 | HTTP client (reqwest re-export) for GitHub API calls | Re-exports reqwest ^0.12. Use Rust-side for all GitHub API calls (token exchange, repo listing, user info) — keeps tokens out of WebView. Never use the JS-side fetch for authenticated GitHub requests. |
| reqwest | 0.12.x | HTTP (via tauri-plugin-http re-export) | Do not add separately; use `tauri_plugin_http::reqwest`. This avoids duplicate HTTP stacks. |
| keyring | 3.x (via tauri-plugin-secure-storage) | macOS Keychain storage for OAuth token and secrets | `tauri-plugin-secure-storage` wraps the `keyring-rs` crate. Uses native macOS Keychain — tokens survive app restarts, never touch the filesystem. Stronghold is being deprecated in Tauri v3; avoid it. |
| serde / serde_json | 1.x | JSON serialization for collection file model | Required for reading/writing the file-based JSON data model. Used everywhere. |
| tauri-specta | 2.x (RC) | Auto-generate TypeScript types from Rust commands | Eliminates manual type maintenance across the IPC bridge. All `#[tauri::command]` functions get TS wrappers with full autocomplete. Worth the RC status — production templates use it. |

### Frontend Libraries (npm)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @heroui/react | 2.x stable | Component library (buttons, inputs, modals, tables) | Stable v2 — use this, not v3 beta (see below). Built on Tailwind CSS v3 + React Aria. |
| tailwindcss | 3.x (for HeroUI v2) | Utility CSS | Required by HeroUI v2. v3, not v4 — HeroUI v3 (which uses v4) is still in beta. |
| zustand | 5.x | Global UI state | Collection tree, active request, environment selector, auth status. No provider boilerplate. Lightweight — perfect for Tauri where you control the whole window. |
| @tanstack/react-query | 5.x | Async state / Tauri command invocation caching | Wrap Tauri command calls in `useQuery`/`useMutation`. Provides loading states, error boundaries, and stale-while-revalidate without manual effect management. |
| @tauri-apps/api | 2.x | Core Tauri JS bindings | `invoke`, `event`, `window`, `path`, `shell`. The bridge to all Rust commands. |
| @tauri-apps/plugin-http | 2.x | JS-side fetch (for non-authenticated requests only) | Use only when the frontend legitimately needs to make unauthenticated HTTP calls. All GitHub API calls go through Rust. |
| fuse.js | 7.x | Fuzzy search (Cmd+K across requests/URLs/names) | Lightweight client-side fuzzy search. Fast enough for the data sizes Dispatch handles (hundreds to low thousands of requests). No server needed. |
| framer-motion | 11.x | Animation | Required peer dep for HeroUI v2. Keep at version compatible with HeroUI docs. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| create-tauri-app | Project scaffolding | `npm create tauri-app@latest` — choose React + TypeScript template. Gets Vite config, Rust workspace, and Tauri config correct from the start. |
| @tauri-apps/cli | Tauri dev/build CLI | `npm run tauri dev` and `npm run tauri build`. Pinned to match tauri crate version. |
| cargo-watch | Rust hot-reload in dev | Optional but useful when iterating on Rust commands without restarting the full Tauri process. |
| ESLint + typescript-eslint | TS linting | Standard. Use flat config format (eslint.config.js) — the old `.eslintrc` is deprecated in ESLint 9+. |
| Prettier | Code formatting | Keep consistent with Tailwind CSS class sorting plugin (`prettier-plugin-tailwindcss`). |

## Installation

```bash
# Scaffold the project
npm create tauri-app@latest dispatch -- --template react-ts

# Frontend: core UI
npm install @heroui/react framer-motion
npm install tailwindcss@3 autoprefixer postcss

# Frontend: state + async
npm install zustand @tanstack/react-query

# Frontend: Tauri APIs
npm install @tauri-apps/api @tauri-apps/plugin-http

# Frontend: search
npm install fuse.js

# Dev
npm install -D prettier eslint typescript-eslint prettier-plugin-tailwindcss

# Rust (Cargo.toml additions)
# [dependencies]
# git2 = "0.20"
# serde = { version = "1", features = ["derive"] }
# serde_json = "1"
# tauri-specta = { version = "2", features = ["derive", "typescript"] }
# specta-typescript = "0.0.7"
#
# [dependencies.tauri]
# version = "2"
# features = []
#
# Tauri plugins (via tauri CLI or manual Cargo.toml):
# tauri-plugin-http = "2"
# tauri-plugin-store = "2"        # for non-secret persistence
# tauri-plugin-secure-storage = "2"  # for OAuth token + API secrets
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| HeroUI v2 (stable) | HeroUI v3 (beta) | When v3 reaches stable release. v3 is Tailwind v4, no-provider, compound components — upgrade later. Do not start on beta for a production app. |
| HeroUI v2 | shadcn/ui | If you want copy-paste component ownership rather than a package dependency. shadcn requires more manual assembly but gives full control. HeroUI is faster to ship with. |
| zustand | Jotai | If state is very granular/atomic (per-request atoms). Zustand is simpler for tree-shaped state (collections > folders > requests). |
| zustand | Redux Toolkit | Only if you need time-travel debugging or a large team requires strict action discipline. Overkill for a single-developer desktop app. |
| TanStack Query | React Query + manual invoke | TanStack Query IS React Query (rebranded). Always use the package; never hand-roll Tauri command caching. |
| TanStack Router | React Router v7 | React Router works fine in Tauri (hash or memory mode). Use TanStack Router if you want file-based routing and full TypeScript inference. For Dispatch's simple route structure (onboarding, workspace, settings), React Router is sufficient and simpler. |
| git2 (Rust) | Running git CLI subprocess | git2 is embedded, no system git dependency, type-safe, no shell injection risk. Use git2 unless you hit a specific libgit2 limitation. |
| tauri-plugin-secure-storage | Stronghold | Stronghold is being deprecated in Tauri v3. keyring/secure-storage uses native OS credential stores (macOS Keychain) which is exactly correct. |
| tauri-plugin-http (Rust) | Fetch from JS frontend | Use Rust-side for all authenticated requests. GitHub tokens must never transit through the WebView layer. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| HeroUI v3 (`@heroui/react@beta`) | Still in beta as of Q1 2026. Tailwind v4 integration is unstable; compound component API is in flux. Shipping a production app on beta UI library is a rewrite risk. | HeroUI v2 (`@heroui/react` latest stable) |
| Stronghold plugin | Officially being deprecated in Tauri v3. Built around IOTA's secret engine, not OS native — the complexity doesn't pay off when macOS Keychain is right there. | `tauri-plugin-secure-storage` |
| Tauri v1 patterns | The IPC permission model changed completely in v2. Any tutorial or blog post targeting `tauri::command` without `capabilities/` JSON permission files is outdated. | Tauri v2 docs at v2.tauri.app |
| JS-side `fetch` for GitHub API | Puts authenticated tokens in the WebView context, visible to any injected JS. Violates the security model. | `tauri_plugin_http::reqwest` in Rust commands |
| gitoxide (gix) | Native Rust git implementation is promising but not feature-complete for all libgit2 operations. git2's vendored approach is more reliable today. | `git2` crate |
| Electron | 60-120MB bundle, ships Chromium, 300MB+ RAM idle. Dispatch's entire value prop includes not being Postman — don't recreate Postman's weight. | Tauri 2.x |
| Next.js as Tauri frontend | Next.js is SSR-first; Tauri runs a local WebView, not a server. You lose all SSR benefits and gain complexity. | Vite + React SPA |

## Stack Patterns by Variant

**For making HTTP requests from Dispatch (sending user's API requests):**
- Use Rust command invoked via Tauri IPC: `tauri_plugin_http::reqwest::Client`
- Why: Gives access to raw response bytes, status codes, headers — no CORS restriction, no browser fetch quirks
- The frontend sends the request config, Rust executes and serializes the response back

**For GitHub API calls (OAuth token exchange, repo listing, sync):**
- Always Rust-side via `tauri_plugin_http::reqwest`
- Store the resulting token immediately in `tauri-plugin-secure-storage` (macOS Keychain)
- Never pass raw tokens through IPC back to the frontend

**For local non-secret state persistence (last open workspace, window size, UI prefs):**
- Use `tauri-plugin-store` (JSON file in `app_data_dir()`)
- Not encrypted — only appropriate for non-sensitive preferences

**For secret persistence (GitHub token, API key secrets):**
- Use `tauri-plugin-secure-storage` (macOS Keychain via keyring-rs)
- Keys: `github_oauth_token`, `secret_{variable_name}_{workspace_id}`

**For the GitHub Device Flow specifically:**
- No external OAuth plugin needed — device flow is polling-based, not redirect-based
- Rust implementation: POST to `https://github.com/login/device/code`, poll `https://github.com/login/oauth/access_token` with `device_code` until approved or expired
- This is pure HTTP; `reqwest` handles it completely. No localhost server, no deep link handling required.

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| tauri 2.10.x | tauri-plugin-http 2.5.x | Both from plugins-workspace 2.x series; keep in sync |
| @heroui/react v2 | tailwindcss v3 | HeroUI v2 explicitly targets Tailwind v3; do not upgrade Tailwind to v4 until HeroUI v3 is stable |
| react 19.x | @tanstack/react-query 5.x | TQ v5 supports React 19 concurrent features |
| react 19.x | zustand 5.x | Zustand v5 uses `useSyncExternalStore` — fully React 18/19 compatible |
| git2 0.20.x | libgit2 1.9.0 | Vendored — no system install needed. If system libgit2 is present, it must be >= 1.9.0 or the vendor will be used. |
| tauri-specta 2.x (RC) | tauri 2.x | RC but widely used in production templates. Pin the version explicitly. |

## macOS-Specific Notes

**App Sandbox (production builds):** macOS sandboxed builds require the `com.apple.security.network.client` entitlement for outbound network connections. Without it, all HTTP calls (including reqwest) are blocked in production builds even when dev works fine. Add to `src-tauri/entitlements.plist`:

```xml
<key>com.apple.security.network.client</key>
<true/>
```

**Keychain access in sandboxed apps:** `tauri-plugin-secure-storage` handles the Keychain entitlement automatically. If you add raw `keyring` without the plugin, you must also add `com.apple.security.keychain-access-groups` entitlements manually.

**Code signing is required** for Keychain access in production (even outside App Store). The `tauri build` flow handles signing if `APPLE_CERTIFICATE` env vars are set.

## Sources

- https://v2.tauri.app/ — Tauri 2.10.3 confirmed current (2026-03-04 release)
- https://docs.rs/crate/tauri/latest — Tauri crate docs
- https://docs.rs/crate/git2/latest — git2 0.20.4, libgit2 1.9.0 requirement confirmed
- https://docs.rs/crate/tauri-plugin-http/latest — tauri-plugin-http 2.5.7 confirmed
- https://v2.heroui.com/ — HeroUI v2 stable; v3 beta confirmed at v3.heroui.com
- https://github.com/heroui-inc/heroui/discussions/5837 — HeroUI v3 beta status
- https://github.com/specta-rs/tauri-specta — tauri-specta v2 RC, production use confirmed
- https://tanstack.com/query/v5/docs/framework/react/overview — TanStack Query v5 React docs
- https://github.com/pmndrs/zustand — Zustand v5 stable
- https://react.dev/versions — React 19.2 stable (October 2025)
- https://vite.dev/releases — Vite 8 current
- https://crates.io/crates/tauri-plugin-secure-storage — active as of July 2025
- https://github.com/tauri-apps/tauri/issues/13878 — macOS sandbox network entitlement requirement (production pitfall)
- https://github.com/tauri-apps/tauri-docs/issues/3171 — entitlement documentation gap confirmed

---
*Stack research for: Native Mac HTTP client desktop app (Dispatch)*
*Researched: 2026-03-23*
