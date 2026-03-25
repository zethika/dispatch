# Phase 5: GitHub Auth - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can log in with GitHub via OAuth device flow, browse their accessible repos (personal + org), connect a repo as a workspace (clones locally), disconnect a workspace (removes local clone), and switch between connected workspaces via a sidebar switcher. Auth state is production-ready with token validation on startup and graceful expiry handling. The app continues to function in local-only mode without GitHub login.

Requirements covered: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05

</domain>

<decisions>
## Implementation Decisions

### Login Flow UX
- **D-01:** Login presented as a modal dialog. Triggered by "Connect GitHub" button in TopBar. Modal shows the device code in a large copyable field, a "Copy & Open GitHub" button that opens the browser, and a polling spinner ("Waiting for approval...") with a Cancel button.
- **D-02:** On successful auth, modal auto-dismisses and a success toast shows "Signed in as @username". TopBar updates to show avatar. No intermediate success screen.
- **D-03:** Logout via avatar dropdown in TopBar — small menu with username and "Sign out". App reverts to local-only mode. Connected workspaces stay on disk but can't sync until re-login.

### Repo Browser & Connect
- **D-04:** Repo browser is a modal dialog with a search/filter input at top. Repos listed grouped by owner (personal repos first, then each org). Each row shows repo name, visibility icon (lock for private, globe for public), and a "Connect" button.
- **D-05:** During clone, the "Connect" button in the row becomes an inline progress spinner ("Cloning..."). Modal stays open. On success, row shows "✓ Connected" and workspace appears in the sidebar behind the modal.
- **D-06:** Disconnect via confirmation dialog: "Disconnect [repo-name]? This removes the local copy. Your data is still on GitHub." Removes the local clone directory.

### Workspace Switcher
- **D-07:** Workspace switcher is a dropdown at the top of the sidebar, above the collection tree. Shows current workspace name. Clicking opens a list of connected workspaces + "Connect repo" action (opens the repo browser modal).
- **D-08:** A permanent "Local" workspace entry is always in the switcher list. It's the default workspace before GitHub login and remains available after. Cannot be disconnected.
- **D-09:** Each workspace row in the dropdown shows the workspace name + a colored sync dot (green = synced, gray = local-only). Sync status details come in Phase 6-7.

### Auth State Transitions
- **D-10:** Before login: TopBar shows "Connect GitHub" button. After login: button replaced by user's GitHub avatar (small circle). Clicking avatar opens dropdown with username and "Sign out".
- **D-11:** On GitHub token expiry or revocation (401 from API): non-blocking toast "GitHub session expired — Sign in again" with clickable action to open login modal. App stays functional in local-only mode.
- **D-12:** On app launch: read token from Keychain. If present, make lightweight GET /user call to verify validity. If valid, load user info + avatar into auth store. If expired/invalid, silently revert to local-only mode — no error on launch.

### Claude's Discretion
- GitHub App vs OAuth App configuration (affects token lifetime and refresh)
- Repo browser pagination strategy (for users with many repos)
- Clone target directory structure within app_data_dir
- Workspace metadata storage format (which workspaces are connected, their local paths)
- Sidebar header height and styling details
- Avatar loading/fallback when GitHub avatar URL is slow

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specs
- `SPECS.md` — Full v1 specification including workspace connect/disconnect, GitHub device flow, workspace structure
- `.planning/PROJECT.md` — Core value, constraints (GitHub OAuth device flow only, no auth gate at launch)

### Requirements
- `.planning/REQUIREMENTS.md` — AUTH-01 through AUTH-05 requirement details

### Prior Phase Context
- `.planning/phases/01-foundation/01-CONTEXT.md` — TopBar layout ("Connect GitHub" button D-08, "Local only" badge D-10), theme (green primary D-07)
- `.planning/phases/04-environments-secrets/04-CONTEXT.md` — Keychain reserved for OAuth token only (D-09), collectionStore.workspaceId drives workspace-scoped loading

### Technology
- `CLAUDE.md` §Technology Stack — tauri-plugin-secure-storage for Keychain, tauri-plugin-http for reqwest, device flow is pure HTTP polling

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/layout/TopBar.tsx` — Already has "Connect GitHub" button placeholder (line 43-45). Will be wired to auth store and login modal.
- `src/stores/collectionStore.ts` — Has `workspaceId` and `loadWorkspace()`. Workspace switching will call `loadWorkspace()` with the new workspace ID.
- `src/stores/environmentStore.ts` — Loads environments by workspaceId. Workspace switch must trigger environment reload.
- `src/features/environments/EnvironmentModal.tsx` — Two-pane modal pattern. Repo browser modal follows similar HeroUI Modal structure.
- `src-tauri/src/commands/` — Thin delegate pattern for Rust commands. Auth and workspace commands follow the same pattern.

### Established Patterns
- Zustand for global UI state (`create` store, export hook)
- tauri-specta for typed IPC commands (all Rust commands auto-generate TS bindings)
- HeroUI v2 Modal for dialogs (used by EnvironmentModal, delete confirmation)
- Thin Rust commands delegating to logic modules (commands/ → module/logic.rs)
- Toast notifications not yet established — this phase introduces them

### Integration Points
- `TopBar.tsx` — "Connect GitHub" button → login modal trigger; avatar dropdown post-login
- `Sidebar.tsx` — Needs workspace switcher header above CollectionTree
- `collectionStore.ts` — `loadWorkspace()` called on workspace switch
- `environmentStore.ts` — `loadEnvironments()` called on workspace switch
- `requestStore.ts` — May need to clear/reload active request on workspace switch
- `Cargo.toml` — Needs `tauri-plugin-secure-storage`, `git2` crate additions
- `lib.rs` / `main.rs` — New auth and workspace command registrations

</code_context>

<specifics>
## Specific Ideas

- The login modal should feel like GitHub's own device flow page — clean, focused, numbered steps
- The "Copy & Open GitHub" button combining both actions reduces friction to a single click
- Workspace switcher in the sidebar header mirrors VS Code's workspace concept — familiar to developers
- The permanent "Local" workspace ensures the app always has a usable state, reinforcing the "no auth gate" principle
- Sync dots in the workspace list are placeholder-ready for Phase 6-7 — gray dot for local-only is accurate now and becomes meaningful later

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-github-auth*
*Context gathered: 2026-03-25*
