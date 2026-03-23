# Feature Research

**Domain:** HTTP client desktop app (REST API testing and collection management)
**Researched:** 2026-03-23
**Confidence:** HIGH — based on direct competitor analysis of Postman, Insomnia, Bruno, HTTPie Desktop, Paw, and Hoppscotch, plus developer community sentiment from 2025-2026.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Send HTTP requests (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS) | Core job of the tool — no alternatives | LOW | Custom method support expected too |
| Request headers editor | Every real API uses custom headers | LOW | Autocomplete for common headers (Content-Type, Authorization) is expected |
| Query parameters editor | URL encoding, key-value UI; URLs with raw params feel broken | LOW | Should handle encoding automatically |
| Request body editor | JSON bodies are 80%+ of real-world usage | MEDIUM | Syntax highlighting minimum; form-encoded also expected |
| Response viewer with syntax highlighting | Raw text responses are unusable | MEDIUM | Status code, timing, size must be visible at a glance |
| Environment variables | Dev/staging/prod switching; anyone with >1 environment needs this | MEDIUM | Scoped to workspace or collection; secret vs non-secret distinction increasingly expected |
| Variable substitution in URL, headers, body | Environment vars are useless without substitution | LOW | Must cover all fields — URL, headers, params, body |
| Collections (grouped requests) | Users don't want to re-enter requests; organization is core | MEDIUM | Folders/nesting expected |
| Saved requests | Same as collections — fire-and-forget is not enough | LOW | Persisted across sessions |
| cURL import | Devs get cURLs from docs, colleagues, browser DevTools — daily workflow | LOW | Paste detection or explicit import action |
| cURL export ("Copy as cURL") | Share requests with teammates or bug reports | LOW | Must resolve variable substitutions |
| Authentication helpers (Bearer token minimum) | Every secured API needs auth; typing raw headers is friction | LOW | Bearer token is MVP; Basic auth is commonly expected too |
| Keyboard shortcuts | Power users navigate without mouse | LOW | At minimum: send request, new request, switch tabs |
| Search across requests/collections | Once you have >20 requests, search is required | MEDIUM | Fuzzy match across name + URL minimum |
| Tab-based multi-request interface | Developers have multiple requests open simultaneously | MEDIUM | Session-persistent tabs |
| Response headers viewer | Debugging auth, caching, CORS all require response headers | LOW | Separate from body; collapsible |
| SSL/TLS verification toggle | Self-signed certs in local dev are common | LOW | Disable certificate verification option |
| Redirect following | APIs redirect; transparent handling expected | LOW | With option to see redirect chain |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not expected universally, but high-value and worth competing on.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Git-backed workspace sync | Teams share collections through repos without any git knowledge — invisible plumbing | HIGH | Dispatch's primary differentiator; no competitor does transparent auto-sync |
| No-account first launch | Users can send a request within 60 seconds, zero friction — vs Postman/Insomnia requiring login | LOW | Huge conversion advantage; Insomnia 8.0 broke this and lost significant user trust |
| Local-only secrets layer | API keys never leave the machine, never committed — enterprise and security-conscious teams love this | MEDIUM | Competitive with Bruno's local-first approach; better story than Postman cloud sync |
| File-based data model (human-readable, git-diffable) | Collections become first-class code assets — diffs, blame, PR reviews work | MEDIUM | Bruno pioneered this with .bru files; JSON is more universally parseable |
| Invisible auto-sync (debounced commit+push) | No "save" or "sync" button; teammates see changes without action | HIGH | Nothing in the market does this transparently; Bruno requires manual git ops |
| GitHub repo as workspace with access control | Repo permissions = team permissions; no separate user management | HIGH | Leverages existing GitHub org access controls |
| Offline support with sync queue | Changes made offline commit and push when connectivity returns | HIGH | Most cloud-sync tools (Postman, HTTPie) break offline; Bruno works offline but requires manual push |
| Focus-triggered pull on app foreground | Collection is always current when you switch back to the app | MEDIUM | Small UX detail with outsized effect on team trust in shared data |
| Cmd+K fuzzy search (global) | One-shortcut access to any request by name or URL | MEDIUM | HTTPie has search; Postman buries it; making this a primary navigation pattern is differentiating |
| Drag-and-drop request/folder reordering | Tactile organization without edit mode friction | MEDIUM | Expected by power users; poorly implemented in Postman |
| Conflict notification with last-write-wins | Simple, predictable — better than silent overwrites or forced merges | MEDIUM | Be honest when conflicts happen; don't hide them |
| Native Mac app (Tauri, system webview) | Faster, lower memory, respects macOS conventions vs Electron bloat | HIGH | Postman and Insomnia are slow Electron apps; native is a credibility and performance win |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good to add but actively harm focus, stability, or the product's core value proposition.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Pre/post-request scripts (JavaScript sandbox) | Postman users expect it for dynamic values and test assertions | Requires shipping a JS runtime (Deno/Node sandbox), massively expands attack surface and maintenance burden; leads to "script hell" in team collections | Use environment variables + variable substitution for 90% of dynamic needs |
| Built-in test assertions / test runner | Teams want to validate responses without separate tooling | Turns an HTTP client into a CI tool; scope creep that competes with Playwright, k6, pytest; maintenance trap | Keep response viewer excellent; don't build a test framework |
| Request chaining (extract response value → next request) | Teams want automated flows (login → get token → use token) | Deep complexity, requires execution engine, breaks the "fire a request" mental model | Out of scope for v1; revisit after core is solid |
| Real-time collaboration (live cursors, comments, activity feed) | Postman has it, looks impressive in demos | Requires WebSocket infrastructure, identity server, operational complexity that contradicts the "no server" architecture | Git is the collaboration layer — PR reviews, commit history, blame are better async tools |
| Response history / request log | "Show me what I sent last Tuesday" is a real need | Unbounded disk growth, privacy concern (stores credentials in history), complexity without clear retention policy | Git commit history is the log — every save is versioned |
| Mock server | Useful for frontend devs blocked on backend | Completely different problem domain; requires server process, ports, routing logic | Out of scope; recommend Mockoon or Wiremock for this use case |
| OpenAPI / Swagger import | Large teams want to bootstrap from spec | Seductive scope explosion — you end up building a spec editor; import is lossy and breeds support tickets | cURL import covers the most common handoff; revisit post-v1 |
| WebSocket / GraphQL / gRPC support | Developers work with these protocols | Each requires a completely different UI paradigm and protocol implementation; dilutes REST focus | REST HTTP only for v1; protocol support requires separate dedicated UIs |
| File upload in request body | Multipart forms are common in some APIs | Binary file handling in a file-based data model is a can of worms; git doesn't diff binaries | JSON bodies only for v1 |
| Windows/Linux support | More users | Tauri supports it, but macOS-first allows fast iteration; cross-platform adds QA surface | macOS only for v1; evaluate after product-market fit |
| Cloud sync (Dispatch-hosted) | Users who don't want GitHub | Requires running a server, auth infrastructure, billing — contradicts the no-server architecture | GitHub IS the sync layer; if users don't want git, this isn't the tool for them |
| AI-assisted request generation | HTTPie added it; looks modern | Risk of making the tool feel unfocused; LLM costs, API key management, privacy concerns with sending request data to third parties | Keep it focused on the core workflow; AI can come later as a polish feature |
| Postman collection import | Teams want to migrate collections | Postman format is complex and versioned; lossy import creates support burden | Offer cURL import; let teams recreate collections (painful but accurate) |

---

## Feature Dependencies

```
[GitHub OAuth Login]
    └──required by──> [GitHub Repo as Workspace]
                          └──required by──> [Auto-sync (commit/push/pull)]
                                                └──enables──> [Invisible team sharing]

[Environment Variables]
    └──required by──> [Variable Substitution in requests]
                          └──enables──> [Local-only secrets layer]

[Collections + Saved Requests]
    └──required by──> [Drag-and-drop reordering]
    └──required by──> [Cmd+K fuzzy search]
    └──required by──> [cURL import into collection]

[Send HTTP Request]
    └──required by──> [Response viewer]
    └──required by──> [cURL export (resolved)]

[File-based data model]
    └──required by──> [Git-backed sync]
    └──required by──> [Conflict detection/notification]
    └──required by──> [Offline queue]

[No-account first launch]
    └──conflicts with──> [GitHub OAuth required before anything works]
    (resolution: local-only mode works without GitHub; sync is opt-in)
```

### Dependency Notes

- **GitHub OAuth requires GitHub repo as workspace:** OAuth is only needed when connecting a workspace; the tool must be fully usable without it (local-only mode is first-class, not a fallback).
- **File-based data model required by git sync:** The reason sync is transparent is that each request is a file — git diffs at the file level. A database-backed model would require a custom sync protocol.
- **Variable substitution depends on environment variables:** Must build environments before substitution can be implemented. These are tightly coupled at the data layer.
- **Offline queue requires file-based model:** Changes are accumulated as file writes; push is deferred. A server-backed model would need a different conflict strategy.
- **No-account first launch conflicts with GitHub OAuth gate:** Resolve by making local-only mode fully functional — GitHub connection is an upgrade, not a prerequisite.

---

## MVP Definition

### Launch With (v1)

Minimum needed to replace Postman for a team's daily REST API workflow.

- [ ] Send HTTP requests (GET, POST, PUT, DELETE, PATCH) with headers, params, body — core job
- [ ] Response viewer with syntax highlighting, status, timing, size — unusable without this
- [ ] Collections and nested folders for organizing requests — team workflows require organization
- [ ] Saved requests that persist across sessions — fire-and-forget is a demo, not a tool
- [ ] Environment variables with secret/non-secret distinction — no team ships to one environment
- [ ] Variable substitution in URL, headers, params, body — environments are useless without this
- [ ] Bearer token authentication — every secured API needs it
- [ ] cURL import (paste detection + explicit action) — daily handoff from docs/DevTools/colleagues
- [ ] cURL export (copy as cURL with resolved vars) — daily handoff to colleagues/bug reports
- [ ] GitHub OAuth device flow login — required for workspace sync
- [ ] GitHub repo as workspace (clone, connect, disconnect) — the collaboration layer
- [ ] Auto-sync (debounced commit+push, periodic pull, focus pull) — invisible sync is the value prop
- [ ] Local-only secrets (never committed to git) — security non-negotiable for team adoption
- [ ] Conflict notification (last-write-wins with user alert) — sync trust requires honesty about conflicts
- [ ] Offline support with sync queue — connectivity issues must not cause data loss
- [ ] Cmd+K fuzzy search across requests/URLs — navigation degrades badly without it at scale
- [ ] Drag-and-drop reordering/moving — organization friction is daily pain
- [ ] Keyboard shortcuts for common actions — power users will not use a mouse-only tool
- [ ] No-account first launch (local-only mode works before GitHub login) — 60-second to first request

### Add After Validation (v1.x)

Add once core workflow is proven with real teams.

- [ ] Basic auth support — some internal APIs still use it; low-complexity addition
- [ ] Response search / filter — useful when dealing with large JSON payloads
- [ ] SSL certificate verification toggle — needed for local dev with self-signed certs
- [ ] Request history (recent requests) — not persisted log, just session-recent
- [ ] Code snippet generation (curl, Python, JS fetch) — common workflow for sharing with frontend devs
- [ ] Collection-level default headers/auth — DRY principle; reduces per-request setup
- [ ] Multiple workspaces (switch between repos) — teams with multiple projects need this

### Future Consideration (v2+)

Defer until product-market fit is established and team capacity allows.

- [ ] Postman collection import — complex, lossy, high support burden; validate demand first
- [ ] OpenAPI import (bootstrap from spec) — different product surface; wait for clear user signal
- [ ] Pre-request variable injection (non-scripting) — dynamic values without a JS runtime
- [ ] Response time / size history chart — useful monitoring, not core workflow
- [ ] Windows/Linux builds — Tauri supports it; macOS-first allows fast iteration

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Send HTTP requests + response viewer | HIGH | LOW | P1 |
| Collections + saved requests | HIGH | MEDIUM | P1 |
| Environment variables + substitution | HIGH | MEDIUM | P1 |
| No-account first launch (local mode) | HIGH | LOW | P1 |
| GitHub OAuth + repo-as-workspace | HIGH | HIGH | P1 |
| Auto-sync (commit/push/pull) | HIGH | HIGH | P1 |
| Local-only secrets layer | HIGH | MEDIUM | P1 |
| cURL import/export | HIGH | LOW | P1 |
| Bearer token auth | HIGH | LOW | P1 |
| Offline sync queue | MEDIUM | HIGH | P1 |
| Cmd+K fuzzy search | HIGH | MEDIUM | P1 |
| Drag-and-drop reordering | MEDIUM | MEDIUM | P1 |
| Keyboard shortcuts | MEDIUM | LOW | P1 |
| Conflict notification | MEDIUM | MEDIUM | P1 |
| Basic auth support | MEDIUM | LOW | P2 |
| SSL toggle | MEDIUM | LOW | P2 |
| Code snippet generation | MEDIUM | MEDIUM | P2 |
| Collection-level default auth/headers | MEDIUM | MEDIUM | P2 |
| Multiple workspaces | MEDIUM | MEDIUM | P2 |
| Response search/filter | LOW | MEDIUM | P2 |
| Postman collection import | MEDIUM | HIGH | P3 |
| OpenAPI import | LOW | HIGH | P3 |
| Test assertions / test runner | LOW | HIGH | P3 — likely never |
| Pre/post-request scripts | LOW | HIGH | P3 — likely never |
| Mock server | LOW | HIGH | P3 — likely never |
| AI request generation | LOW | HIGH | P3 |
| Real-time collaboration | LOW | HIGH | P3 — never |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration or never

---

## Competitor Feature Analysis

| Feature | Postman | Insomnia | Bruno | HTTPie Desktop | Dispatch |
|---------|---------|----------|-------|----------------|----------|
| Send HTTP requests | Yes | Yes | Yes | Yes | Yes |
| Collections + folders | Yes | Yes | Yes | Yes | Yes |
| Environment variables | Yes | Yes | Yes | Yes | Yes |
| Variable substitution | Yes | Yes | Yes | Yes | Yes |
| cURL import/export | Yes | Yes | Yes | Yes | Yes |
| Auth (Bearer, Basic, OAuth) | Yes — full suite | Yes — full suite | Yes — full suite | Bearer, Basic, API key | Bearer only (v1) |
| No account required | No — login required | No — login required since v8 | Yes — fully local | No — cloud account for sync | Yes — local-only mode |
| File-based data model | No — proprietary cloud | No — proprietary cloud | Yes — .bru files | No — proprietary | Yes — JSON files |
| Git-backed sync | No (Git Sync is paid add-on) | Plugin (limited) | Yes — manual git ops | No | Yes — transparent auto-sync |
| Invisible auto-sync | No | No | No — manual commit/push | Cloud sync only | Yes — core differentiator |
| Local-only secrets | No | No | Yes | Local envs only | Yes |
| Offline support | Partial (no sync) | Partial (no sync) | Yes | Partial | Yes — with queue |
| Code generation | Yes — many languages | Yes | Yes | Yes | v1.x |
| Pre/post-request scripts | Yes — JavaScript | Yes — JavaScript | Yes — JavaScript | No | No |
| GraphQL support | Yes | Yes | Yes | Yes | No |
| WebSocket support | Yes | Yes | No | No | No |
| Native performance | No — Electron | No — Electron | No — Electron | No — Electron | Yes — Tauri |
| macOS-native feel | No | No | No | No | Yes |
| Response test assertions | Yes | Yes | Yes | No | No |
| Mock server | Yes | No | No | No | No |
| AI assistance | Postbot (AI) | No | No | Yes | No |

---

## Sources

- [Bruno — Git-Native API Client](https://www.usebruno.com/) — product page, feature claims
- [Bruno Docs: Git Integration Overview](https://docs.usebruno.com/git-integration/overview) — free vs paid git features
- [Bruno: Git-Friendly API Client (In The Pocket)](https://www.inthepocket.com/blog/bruno-the-lean-and-git-friendly-api-client-weve-been-waiting-for) — practitioner perspective
- [HTTPie Desktop Docs](https://httpie.io/docs/desktop) — feature enumeration
- [HTTPie Desktop GitHub](https://github.com/httpie/desktop) — v2025.2.0 release verified
- [Best 6 Free Postman Alternatives 2026 (Better Stack)](https://betterstack.com/community/comparisons/postman-alternative/) — feature comparison
- [Insomnia account requirement discussion](https://github.com/Kong/insomnia/discussions/6590) — community backlash over account gate
- [Goodbye Postman (Medium)](https://medium.com/@PlanB./goodbye-postman-why-devs-are-ditching-the-cloud-and-going-local-c13f88b43af2) — developer sentiment on cloud-forced sync
- [Postman Code Generators Docs](https://learning.postman.com/docs/sending-requests/create-requests/generate-code-snippets) — official code generation feature
- [Postman Mock Server Docs](https://learning.postman.com/docs/design-apis/mock-apis/set-up-mock-servers) — mock server capabilities
- [Top Postman Alternatives 2025 (TestFully)](https://testfully.io/blog/top-5-postman-alternatives/) — market overview

---
*Feature research for: HTTP client desktop app (REST API testing and collection management)*
*Researched: 2026-03-23*
