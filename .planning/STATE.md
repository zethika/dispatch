---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Phase complete — ready for verification
stopped_at: Completed 05-github-auth 05-03-PLAN.md
last_updated: "2026-03-25T14:08:10.463Z"
progress:
  total_phases: 8
  completed_phases: 5
  total_plans: 13
  completed_plans: 13
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-23)

**Core value:** Teams can share and collaborate on API request collections through git — without anyone needing to know git is involved.
**Current focus:** Phase 05 — github-auth

## Current Position

Phase: 05 (github-auth) — EXECUTING
Plan: 3 of 3

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: none yet
- Trend: -

*Updated after each plan completion*
| Phase 01-foundation P01 | 6 | 2 tasks | 19 files |
| Phase 01-foundation P02 | 35 | 2 tasks | 10 files |
| Phase 02-data-model P01 | 14 | 2 tasks | 16 files |
| Phase 03-http-engine P01 | 5 | 2 tasks | 9 files |
| Phase 03-http-engine P03 | 5 | 1 tasks | 3 files |
| Phase 03-http-engine P02 | 8 | 1 tasks | 5 files |
| Phase 03-http-engine P02 | 15 | 2 tasks | 5 files |
| Phase 03-http-engine P03 | 30 | 2 tasks | 4 files |
| Phase 04-environments-secrets P01 | 5 | 2 tasks | 14 files |
| Phase 04-environments-secrets P03 | 15 | 2 tasks | 3 files |
| Phase 04-environments-secrets P02 | 5 | 2 tasks | 6 files |
| Phase 05-github-auth P01 | 35 | 2 tasks | 16 files |
| Phase 05-github-auth P02 | 5 | 3 tasks | 9 files |
| Phase 05-github-auth P03 | 7 | 2 tasks | 7 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: Use HeroUI v2 stable + Tailwind CSS v3 — do NOT use v3 beta or Tailwind v4
- [Init]: git actor pattern (mpsc channel) must be designed in Phase 6 before any concurrent sync
- [Init]: Secrets path must be ~/Library/Application Support/ (absolute), never relative to workspace
- [Init]: All git2 operations must run in tokio::task::spawn_blocking — never call from async fn directly
- [Init]: Use tauri::async_runtime::spawn exclusively — tokio::spawn panics in Tauri v2
- [Phase 01-foundation]: Pin @heroui/react@2.7.11 — npm latest now resolves to v3.0.1 (Tailwind v4); v2 pin required for Tailwind v3 constraint
- [Phase 01-foundation]: specta-typescript@0.0.9 (not 0.0.10) to resolve version conflict with tauri-specta@rc.21 specta@rc.22 requirement
- [Phase 01-foundation]: Green primary color #17c964 (HeroUI success green repurposed as primary semantic slot per D-07); window 1280x800 default, 1024x640 minimum
- [Phase 01-foundation]: CSS grid for RightPanel split: gridTemplateRows avoids flex math complexity for resizable split panels
- [Phase 01-foundation]: data-tauri-drag-region on TopBar root: enables macOS window dragging without separate drag area overlay
- [Phase 01-foundation]: CSS grid for RightPanel split: gridTemplateRows avoids flex math complexity for resizable split panels
- [Phase 01-foundation]: data-tauri-drag-region on TopBar root: enables macOS window dragging without separate drag area overlay
- [Phase 01-foundation]: splitRatio clamped in store (not component): store is the single source of truth for bounded 0.2-0.8 range
- [Phase 02-data-model]: Collections module is pure Rust (no Tauri dependency) — testable with tempfile without Tauri runtime
- [Phase 02-data-model]: Commands are thin delegates: path resolution in commands/, all I/O logic in collections/io.rs
- [Phase 02-data-model]: tsconfig exclude bindings.ts — auto-generated file has unused imports when no events exist
- [Phase Phase 02-data-model]: Node ID built as collectionSlug/parentPath.join('/')/slug — matches store contextMenuNodeId convention
- [Phase Phase 02-data-model]: POST uses text-blue-500 not text-primary — primary is remapped to green (#17c964) in Phase 1 theme
- [Phase Phase 02-data-model]: RootContextMenu uses custom fixed div instead of HeroUI Dropdown — avoids trigger positioning complexity for empty-area right-click
- [Phase 03-http-engine]: tauri-plugin-http used for reqwest — avoids duplicate HTTP stacks vs adding reqwest directly
- [Phase 03-http-engine]: Content-Type auto-inject only when user has no case-insensitive content-type header (D-06 compliance)
- [Phase 03-http-engine]: activeRequestMeta in requestStore tracks loaded file coordinates for save operations
- [Phase 03-http-engine]: Post-process string tokens to 'key' type when followed by ':' — avoids look-ahead in main regex loop
- [Phase 03-http-engine]: Large response guard at 102400 bytes (100KB) skips JSON tokenizer to prevent UI freeze on big payloads
- [Phase 03-http-engine]: UrlBar reads directly from requestStore (not props) — component is a singleton and store is the source of truth
- [Phase 03-http-engine]: KeyValueEditor is purely props-driven — parent (RequestEditor) owns array and calls store setters
- [Phase 03-http-engine]: BodyEditor and AuthEditor call onChange(null) when value is empty — avoids storing empty stub objects
- [Phase 03-http-engine]: duration_ms typed as u32 (not u64) — specta forbids u64 (maps to BigInt, not supported in IPC bridge)
- [Phase Phase 04-environments-secrets]: Secret stripping on save: variables with secret=true have value='' written to disk (ENV-05/D-10)
- [Phase Phase 04-environments-secrets]: VAR_REGEX = /{{([a-zA-Z_][a-zA-Z0-9_]*)}}/g — identifier-only pattern rejects {{}} and {{ spaces }}
- [Phase Phase 04-environments-secrets]: delete_environment atomically deletes env file and secrets file (D-04)
- [Phase 04-environments-secrets]: Unresolved badge placed in UrlBar not RequestEditor: direct access to Send button context and all requestStore fields without prop drilling
- [Phase 04-environments-secrets]: Variable substitution reads vars via useEnvironmentStore.getState().activeEnvVariables inside Zustand action (non-hook pattern)
- [Phase 04-environments-secrets]: DropdownMenu items prop for dynamic environment list: HeroUI v2 DropdownMenu does not accept array-mapped JSX children in TypeScript — must use items prop with render function
- [Phase 04-environments-secrets]: VariableRow internal state holds both value and secretValue: allows bidirectional secret toggle without losing data
- [Phase 05-github-auth]: tauri-plugin-secure-storage API uses get_item/set_item/remove_item with OptionsRequest struct; models module private, types re-exported from crate root
- [Phase 05-github-auth]: reqwest .json() feature not enabled in tauri-plugin-http re-export — use .text() + serde_json::from_str for all JSON responses
- [Phase 05-github-auth]: git2 vendored-libgit2 feature enabled — no system libgit2 required on user machines
- [Phase 05-github-auth]: API wrappers use invoke directly — bindings.ts not regenerated until tauri dev; matches existing project pattern
- [Phase 05-github-auth]: authStore manages loginModalOpen so any component can trigger login modal (D-11 session expiry)
- [Phase 05-github-auth]: workspaceStore.addWorkspace for immediate sidebar update after clone — no full reload needed
- [Phase 05-github-auth]: WorkspaceEntry imported from api/workspace.ts not bindings.ts — bindings.ts is gitignored, api/workspace is stable source of truth
- [Phase 05-github-auth]: loginModalOpen in authStore (not local TopBar state): enables D-11 session expiry toast action to open login modal from anywhere

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 5: GitHub App vs. OAuth App token lifetime decision needed during planning (affects token refresh implementation)
- Phase 6: git actor implementation pattern and auth-git2 + HTTPS token integration needs deeper research during planning
- Phase 7: Offline queue persistence strategy (survive app restart) unresolved — needs decision during planning

## Session Continuity

Last session: 2026-03-25T14:08:10.461Z
Stopped at: Completed 05-github-auth 05-03-PLAN.md
Resume file: None
