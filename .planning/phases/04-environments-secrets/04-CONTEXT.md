# Phase 4: Environments & Secrets - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create environments with variables (including secrets), select an active environment, and have {{variable}} references in the request editor resolve to their values. Secret values are stored locally only and never committed to git. No auth, no sync — this phase adds the variable layer on top of the existing HTTP engine.

Requirements covered: ENV-01, ENV-02, ENV-03, ENV-04, ENV-05, ENV-06

</domain>

<decisions>
## Implementation Decisions

### Environment Manager UI
- **D-01:** Modal dialog for managing environments. Opened from TopBar environment dropdown ("Manage Environments..." link) or future Cmd+E shortcut (Phase 8).
- **D-02:** Modal layout: environment list on the left, variable editor on the right. Split-pane within the modal.
- **D-03:** Left panel: list of environments, click to select, right-click or hover icon for rename/delete. "+ New" button at bottom. Active environment marked with a dot or check.
- **D-04:** CRUD follows the inline pattern from Phase 2 — inline rename, delete confirmation modal for environments with variables.

### Variable Editor
- **D-05:** Key-value editor with three columns: key input, value input, and a secret toggle (lock icon or checkbox). Reuse KeyValueEditor pattern from Phase 3 but add the secret column.
- **D-06:** Secret variable values masked by default (•••••••) with an eye icon to toggle visibility. Matches password field UX.
- **D-07:** "+ Add variable" button at bottom of the variable list, same pattern as KeyValueEditor.

### Secret Storage
- **D-08:** Secrets stored as local JSON files at `~/Library/Application Support/dev.dispatch.app/secrets/<workspace-id>/<env-slug>.json`. Plain JSON, never committed to git. Matches SPECS.md file-based philosophy.
- **D-09:** NOT using macOS Keychain / tauri-plugin-secure-storage for secrets — local JSON files are simpler, debuggable, and portable. Keychain is reserved for the GitHub OAuth token only (Phase 5).
- **D-10:** Environment JSON files in the workspace (`environments/*.json`) store the schema with `"value": ""` for secret variables. Actual secret values only in the local secrets store.

### Variable Substitution Display
- **D-11:** {{variable}} references shown in distinct color (orange/amber) in URL input and other fields when resolved from active environment.
- **D-12:** Unresolved {{variable}} references shown in red/warning color with dotted underline in the field itself.
- **D-13:** Summary warning badge near the Send button showing count of unresolved variables (e.g., "⚠ 2 unresolved"). Two signals: inline color + summary count.
- **D-14:** Substitution applies to: URL, headers, query params, body, and auth token fields (ENV-04).

### Environment Selector (TopBar)
- **D-15:** TopBar dropdown lists all environments for the workspace. Selecting one makes it active immediately. "No Environment" option at top clears the active environment.
- **D-16:** "Manage Environments..." link at the bottom of the dropdown opens the management modal.
- **D-17:** Active environment persisted locally per workspace via tauri-plugin-store (not in dispatch.json). Each user has their own active environment. Never committed to git.

### Claude's Discretion
- Variable highlighting implementation approach (CSS overlay, contenteditable, or separate render layer)
- Environment modal sizing and responsiveness
- Variable editor row interaction details (focus management, tab order)
- How the "No Environment" state affects the unresolved variable indicator
- Secret file creation timing (on first secret vs on environment creation)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Model & Schema
- `SPECS.md` §Environment File — JSON schema for `environments/*.json` with variable entries and secret toggle
- `SPECS.md` §Local Secrets Store — Path pattern and file format for local secret storage

### Requirements
- `.planning/REQUIREMENTS.md` — ENV-01 through ENV-06 requirement details

### Prior Phase Context
- `.planning/phases/01-foundation/01-CONTEXT.md` — TopBar layout, theme (green primary)
- `.planning/phases/02-data-model/02-CONTEXT.md` — Workspace storage paths, slug conventions, inline rename pattern
- `.planning/phases/03-http-engine/03-CONTEXT.md` — KeyValueEditor pattern, request editor tabs, requestStore

### Project Context
- `.planning/PROJECT.md` — Core value, constraints, secrets path specification

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/http/KeyValueEditor.tsx` — Reusable key-value editor with toggle+delete rows. Can be extended or wrapped with a secret column for the variable editor.
- `src/components/layout/TopBar.tsx` — Existing "No Environment" dropdown placeholder. Will be wired to the environment store.
- `src/stores/collectionStore.ts` — Zustand store pattern for workspace-level data. Environment store should follow the same pattern.
- `src/stores/requestStore.ts` — Stores request draft state. Will need to integrate variable resolution before sending.
- `src-tauri/src/commands/collections.rs` — Thin Rust command pattern. Environment commands follow the same delegate pattern.
- `src-tauri/src/collections/io.rs` — File I/O patterns for reading/writing JSON. Environment I/O follows the same approach.

### Established Patterns
- Zustand for global UI state (create store, export hook)
- tauri-specta for typed IPC commands
- HeroUI v2 components with Tailwind v3
- Thin Rust commands delegating to logic modules
- File-based JSON storage in workspace directories

### Integration Points
- `TopBar.tsx` — Environment dropdown wired to environment store
- `RequestEditor.tsx` / `UrlBar.tsx` — Variable highlighting overlay
- `requestStore.ts` — Variable resolution before `sendRequest`
- Workspace directory structure — new `environments/` subdirectory
- Local app data — new `secrets/` directory alongside `workspaces/`

</code_context>

<specifics>
## Specific Ideas

- The environment modal should feel like VS Code's settings or Postman's environment manager — clean two-pane layout, quick to navigate
- Secret masking should match standard password field behavior — users expect the eye icon toggle
- Variable highlighting should be subtle but clear — orange for resolved, red for unresolved, not overwhelming
- The unresolved badge near Send gives users a quick "am I ready to send?" signal without scanning every field

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-environments-secrets*
*Context gathered: 2026-03-25*
