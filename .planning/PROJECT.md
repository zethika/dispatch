# Dispatch

## What This Is

Dispatch is a native Mac desktop app for making HTTP requests, organizing them in collections, and sharing them with teammates — backed by GitHub repos as the storage and collaboration layer. It replaces Postman for teams that want the fundamentals (grouped requests, environment variables, frictionless sharing) without the bloat, account restrictions, or pricing surprises.

## Core Value

Teams can share and collaborate on API request collections through git — without anyone needing to know git is involved. It just syncs.

## Requirements

### Validated

- [x] Manage environment variables with secret/non-secret distinction — Validated in Phase 4: Environments & Secrets
- [x] Variable substitution in URLs, headers, params, body, and auth — Validated in Phase 4: Environments & Secrets
- [x] Local-only secrets layer (never committed to git) — Validated in Phase 4: Environments & Secrets
- [x] GitHub OAuth device flow login — Validated in Phase 5: GitHub Auth
- [x] Connect GitHub repos as workspaces (clone, sync, disconnect) — Validated in Phase 5: GitHub Auth
- [x] Sync status indicator visible in the UI (synced/syncing/conflict) — Validated in Phase 6: Git Sync Engine
- [x] File-level last-write-wins conflict resolution with user notification — Validated in Phase 6: Git Sync Engine
- [x] Automatic background sync — debounced push after saves, periodic pull, focus-pull — Validated in Phase 7: Background Sync Loop
- [x] Offline detection and reconnection with queued push — Validated in Phase 7: Background Sync Loop
- [x] cURL import (paste detection + explicit import action) — Validated in Phase 8: Polish & Power Features
- [x] cURL export (copy as cURL with resolved variables) — Validated in Phase 8: Polish & Power Features
- [x] Fuzzy search across requests, URLs, and collection names (Cmd+K) — Validated in Phase 8: Polish & Power Features
- [x] Drag and drop reordering and moving of requests/folders — Validated in Phase 8: Polish & Power Features
- [x] Keyboard shortcuts for common actions — Validated in Phase 8: Polish & Power Features

### Active

- [ ] Send HTTP requests (GET, POST, PUT, DELETE) and view responses
- [ ] Organize requests into collections and nested folders
- ~~Manage environment variables with secret/non-secret distinction~~ → Validated
- ~~Variable substitution in URLs, headers, params, body, and auth~~ → Validated
- ~~GitHub OAuth device flow login~~ → Validated
- ~~Connect GitHub repos as workspaces (clone, sync, disconnect)~~ → Validated
- [ ] Auto-sync via git (debounced commit+push, periodic pull, focus pull)
- [ ] File-based data model (JSON files committed to repo)
- ~~Local-only secrets layer (never committed to git)~~ → Validated
- ~~Conflict resolution (last-write-wins at file level with notification)~~ → Validated
- [ ] Offline support (queue changes, push when connectivity returns)
- ~~cURL import (paste detection + explicit import action)~~ → Validated
- ~~cURL export (copy as cURL with resolved variables)~~ → Validated
- ~~Fuzzy search across requests, URLs, and collection names (Cmd+K)~~ → Validated
- ~~Drag and drop reordering and moving of requests/folders~~ → Validated
- ~~Keyboard shortcuts for common actions~~ → Validated

### Out of Scope

- Response history / logging — fire and forget for v1
- Pre/post-request scripts — no JS execution sandbox
- File upload support — JSON bodies only
- WebSocket / GraphQL / gRPC — HTTP REST only
- Auth flows beyond bearer token — no OAuth helpers, no basic auth UI
- Team features beyond git — no comments, no real-time cursors, no activity feed
- Windows/Linux builds — Mac only (Tauri supports them later)
- Test assertions — no built-in test runner
- Request chaining — no extracting response values to feed into next request
- Postman import — not in v1 (users can manually recreate)

## Context

- **Motivation**: Postman has become bloated, slow, and expensive. Free tier restrictions and forced cloud sync are friction points. Sharing collections requires everyone to have accounts.
- **Target users**: Development teams that work with REST APIs daily. Git-savvy enough to use GitHub, but git operations in Dispatch should be completely invisible — it's plumbing, not a feature.
- **V1 success**: The team can get off Postman and onto shared repos. A new user should be able to send a request within 60 seconds of first launch, before any GitHub setup.
- **Prior art**: Postman, Insomnia, HTTPie Desktop, Bruno (also file-based but not git-native in the same way)

## Constraints

- **Tech stack**: Tauri (Rust backend + system webview), React + TypeScript + HeroUI frontend, git2 crate for git operations
- **Platform**: macOS only for v1
- **Storage**: Local filesystem + GitHub repos — no server, no database
- **Auth**: GitHub OAuth device flow only
- **Sync**: Git-based, invisible to user — auto-sync with debounce, periodic pull, offline queue
- **Secrets**: Local-only, never committed — stored in ~/Library/Application Support/dev.dispatch.app/secrets/

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| GitHub repos as workspaces | Repo access controls who can read/write — no separate user management needed | ✓ Phase 5 — OAuth device flow + git2 clone via HTTPS |
| File-based JSON data model | Human-readable, git-diffable, version history for free | — Pending |
| Local-only secrets layer | API keys and tokens must never be committed to git | ✓ Phase 4 — secrets stored as local JSON at app_data_dir/secrets/, stripped before workspace write |
| Auto-sync with debounce | Users shouldn't think about saving or syncing — it just happens | — Pending |
| Last-write-wins conflicts | Simple, predictable — notify user rather than force manual merge | ✓ Phase 6 — remote wins on pull, conflict toast with file paths |
| HeroUI component library | Polished components out of the box, built on Tailwind | — Pending |
| No first-launch auth gate | Users should be able to send a request immediately without GitHub login | ✓ Phase 5 — Local workspace always available, GitHub login optional |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-30 after Phase 8 (Polish & Power Features) complete — drag-and-drop reordering, cURL import/export, Cmd+K fuzzy search, 9 global keyboard shortcuts with flash feedback, shortcut cheatsheet. This is the last phase of v1.0.*
