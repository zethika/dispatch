# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-23)

**Core value:** Teams can share and collaborate on API request collections through git — without anyone needing to know git is involved.
**Current focus:** Phase 1 — Foundation

## Current Position

Phase: 1 of 8 (Foundation)
Plan: 0 of ? in current phase
Status: Ready to plan
Last activity: 2026-03-23 — Roadmap created, 53 requirements mapped across 8 phases

Progress: [░░░░░░░░░░] 0%

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

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: Use HeroUI v2 stable + Tailwind CSS v3 — do NOT use v3 beta or Tailwind v4
- [Init]: git actor pattern (mpsc channel) must be designed in Phase 6 before any concurrent sync
- [Init]: Secrets path must be ~/Library/Application Support/ (absolute), never relative to workspace
- [Init]: All git2 operations must run in tokio::task::spawn_blocking — never call from async fn directly
- [Init]: Use tauri::async_runtime::spawn exclusively — tokio::spawn panics in Tauri v2

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 5: GitHub App vs. OAuth App token lifetime decision needed during planning (affects token refresh implementation)
- Phase 6: git actor implementation pattern and auth-git2 + HTTPS token integration needs deeper research during planning
- Phase 7: Offline queue persistence strategy (survive app restart) unresolved — needs decision during planning

## Session Continuity

Last session: 2026-03-23
Stopped at: Roadmap created — ready to plan Phase 1
Resume file: None
