# Dispatch

## What This Is

Dispatch is a native Mac desktop app for making HTTP requests, organizing them in collections, and sharing them with teammates — backed by GitHub repos as the storage and collaboration layer. It replaces Postman for teams that want the fundamentals (grouped requests, environment variables, frictionless sharing) without the bloat, account restrictions, or pricing surprises.

## Core Value

Teams can share and collaborate on API request collections through git — without anyone needing to know git is involved. It just syncs.

## Current State

**v1.0 shipped 2026-03-30** — 8 phases, 21 plans, ~11,000 LOC (TypeScript + Rust).

All v1 requirements delivered: HTTP client with full request editor, file-per-request JSON data model, environment variables with local-only secrets, GitHub OAuth + workspace connect, automatic background git sync with offline queue, drag-and-drop, cURL import/export, Cmd+K search, and 9 keyboard shortcuts.

## Requirements

### Validated — v1.0

- [x] Send HTTP requests (GET, POST, PUT, DELETE) and view responses — v1.0
- [x] Organize requests into collections and nested folders — v1.0
- [x] Manage environment variables with secret/non-secret distinction — v1.0
- [x] Variable substitution in URLs, headers, params, body, and auth — v1.0
- [x] Local-only secrets layer (never committed to git) — v1.0
- [x] GitHub OAuth device flow login — v1.0
- [x] Connect GitHub repos as workspaces (clone, sync, disconnect) — v1.0
- [x] Auto-sync via git (debounced commit+push, periodic pull, focus pull) — v1.0
- [x] File-based data model (JSON files committed to repo) — v1.0
- [x] Sync status indicator visible in the UI — v1.0
- [x] File-level last-write-wins conflict resolution with user notification — v1.0
- [x] Offline detection and reconnection with queued push — v1.0
- [x] cURL import (paste detection + explicit import action) — v1.0
- [x] cURL export (copy as cURL with resolved variables) — v1.0
- [x] Fuzzy search across requests, URLs, and collection names (Cmd+K) — v1.0
- [x] Drag and drop reordering and moving of requests/folders — v1.0
- [x] Keyboard shortcuts for common actions — v1.0

### Active

(None — next milestone requirements TBD via `/gsd:new-milestone`)

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
- **Shipped v1.0**: ~11,000 LOC across TypeScript and Rust. Tech stack: Tauri 2.x, React 19, HeroUI v2, Zustand, TanStack Query, git2, reqwest. 72 tests passing.

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
| File-based JSON data model | Human-readable, git-diffable, version history for free | ✓ Phase 2 — file-per-request with collection/folder manifests |
| Local-only secrets layer | API keys and tokens must never be committed to git | ✓ Phase 4 — secrets stored as local JSON at app_data_dir/secrets/ |
| Auto-sync with debounce | Users shouldn't think about saving or syncing — it just happens | ✓ Phase 7 — 2s debounce push, 30s periodic pull, focus-pull |
| Last-write-wins conflicts | Simple, predictable — notify user rather than force manual merge | ✓ Phase 6 — remote wins on pull, conflict toast with file paths |
| HeroUI component library | Polished components out of the box, built on Tailwind | ✓ v1.0 — HeroUI v2 with Tailwind v3, consistent UI |
| No first-launch auth gate | Users should be able to send a request immediately without GitHub login | ✓ Phase 5 — Local workspace always available, GitHub login optional |
| @dnd-kit for drag-and-drop | Lightweight, composable, works with existing tree structure | ✓ Phase 8 — useSortable on each node, PointerSensor with 8px threshold |
| Fuse.js for fuzzy search | Client-side, fast enough for hundreds of requests, no server needed | ✓ Phase 8 — weighted keys (name 0.5, url 0.3, collection 0.2) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone:**
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-30 after v1.0 milestone complete*
