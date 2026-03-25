# Dispatch

## What This Is

Dispatch is a native Mac desktop app for making HTTP requests, organizing them in collections, and sharing them with teammates — backed by GitHub repos as the storage and collaboration layer. It replaces Postman for teams that want the fundamentals (grouped requests, environment variables, frictionless sharing) without the bloat, account restrictions, or pricing surprises.

## Core Value

Teams can share and collaborate on API request collections through git — without anyone needing to know git is involved. It just syncs.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Send HTTP requests (GET, POST, PUT, DELETE) and view responses
- [ ] Organize requests into collections and nested folders
- [ ] Manage environment variables with secret/non-secret distinction
- [ ] Variable substitution in URLs, headers, params, body, and auth
- [ ] GitHub OAuth device flow login
- [ ] Connect GitHub repos as workspaces (clone, sync, disconnect)
- [ ] Auto-sync via git (debounced commit+push, periodic pull, focus pull)
- [ ] File-based data model (JSON files committed to repo)
- [ ] Local-only secrets layer (never committed to git)
- [ ] Conflict resolution (last-write-wins at file level with notification)
- [ ] Offline support (queue changes, push when connectivity returns)
- [ ] cURL import (paste detection + explicit import action)
- [ ] cURL export (copy as cURL with resolved variables)
- [ ] Fuzzy search across requests, URLs, and collection names (Cmd+K)
- [ ] Drag and drop reordering and moving of requests/folders
- [ ] Keyboard shortcuts for common actions

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
| GitHub repos as workspaces | Repo access controls who can read/write — no separate user management needed | — Pending |
| File-based JSON data model | Human-readable, git-diffable, version history for free | — Pending |
| Local-only secrets layer | API keys and tokens must never be committed to git | — Pending |
| Auto-sync with debounce | Users shouldn't think about saving or syncing — it just happens | — Pending |
| Last-write-wins conflicts | Simple, predictable — notify user rather than force manual merge | — Pending |
| HeroUI component library | Polished components out of the box, built on Tailwind | — Pending |
| No first-launch auth gate | Users should be able to send a request immediately without GitHub login | — Pending |

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
*Last updated: 2026-03-25 after Phase 3 (HTTP Engine) complete — Rust HTTP executor, request editor with tabs, response viewer with JSON highlighting, full send/receive flow*
