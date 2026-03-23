# Phase 1: Foundation - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Tauri project scaffolding with working IPC between Rust backend and React frontend, HeroUI v2 component library integration, and the three-panel app shell layout with top bar. This phase delivers a launchable app with correct layout — no HTTP, no git, no data persistence.

</domain>

<decisions>
## Implementation Decisions

### Panel Layout
- **D-01:** Fixed sidebar width (~260px), not resizable or collapsible
- **D-02:** Vertical split for right panel — request editor on top, response viewer on bottom (per spec mockup)
- **D-03:** Resizable drag handle between request editor and response viewer panels — user can adjust the split ratio

### First-Launch State
- **D-04:** First launch shows a blank request editor immediately — GET method selected, URL input focused, ready to type. Zero friction, supports the 60-second-to-first-request goal.
- **D-05:** Empty sidebar shows "No collections yet" hint text with subtle prompt to create a collection or connect a repo

### Theme / Appearance
- **D-06:** Support both dark and light mode, following macOS system preference (via `prefers-color-scheme`)
- **D-07:** Green accent color for primary actions and brand identity. Neutral/gray tones for chrome. Content is the star.

### Top Bar Pre-Login State
- **D-08:** Workspace switcher shows a "Connect GitHub" button before login — clear call-to-action
- **D-09:** Environment selector shows "No Environment" placeholder dropdown before any environments exist
- **D-10:** Sync status shows a "Local only" badge before GitHub login — hints at sync capability without being noisy

### Claude's Discretion
- Minimum window size — pick based on layout needs (suggested ~1024x600 range)
- Scroll behavior — each panel scrolls independently, Claude decides details

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specs
- `SPECS.md` — Full v1 specification including data model, UI layout reference, feature list, and architectural decisions
- `.planning/PROJECT.md` — Project context, core value, constraints, key decisions

### Research
- `.planning/research/STACK.md` — Technology recommendations (Tauri 2.10.3, HeroUI v2, Tailwind v3, tauri-plugin-secure-storage)
- `.planning/research/ARCHITECTURE.md` — Tauri IPC patterns, two-process model, project structure recommendations
- `.planning/research/PITFALLS.md` — macOS entitlements pitfall (com.apple.security.network.client), Tauri v2 async runtime requirements

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None yet — this phase establishes the patterns

### Integration Points
- This phase creates the foundation that all subsequent phases build on
- IPC command pattern established here will be used by HTTP engine (Phase 3), git sync (Phase 6), etc.
- Layout shell defined here must accommodate future panels: request editor tabs (Phase 3), env selector behavior (Phase 4), workspace switcher (Phase 5), sync indicator (Phase 6-7)

</code_context>

<specifics>
## Specific Ideas

- Green accent color direction — not a specific hex, explore HeroUI's green palette or a custom green that works in both light and dark modes
- The "Connect GitHub" button in the workspace area and "Local only" badge together communicate that the app works standalone but has more to offer
- The blank request editor on first launch should feel like opening a fresh browser tab — immediate, no ceremony

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-23*
