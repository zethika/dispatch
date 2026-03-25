---
phase: 04-environments-secrets
plan: 03
subsystem: ui
tags: [react, zustand, tailwind, heroui, variables, environment, url-bar]

# Dependency graph
requires:
  - phase: 04-01
    provides: variables.ts utility (tokenize, substitute, countUnresolved), environmentStore with activeEnvVariables
provides:
  - Variable substitution in sendRequest before HTTP IPC call (URL, headers, queryParams, body, auth)
  - UrlBar CSS overlay highlighting resolved/unresolved {{variable}} tokens in URL input
  - Unresolved variable count badge near Send button
affects: [05-github-auth, 06-git-sync]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zustand out-of-component getState() pattern for non-hook contexts (sendRequest action)"
    - "CSS absolute overlay with pointer-events-none over HeroUI Input for rich text highlighting"
    - "text-transparent + caret-foreground on Input to make text invisible while preserving caret"

key-files:
  created: []
  modified:
    - src/stores/requestStore.ts
    - src/features/http/UrlBar.tsx
    - src/stores/environmentStore.ts

key-decisions:
  - "Unresolved badge placed in UrlBar (not RequestEditor): UrlBar already has Send button context and access to all request store fields"
  - "overlay div uses px-3 padding and text-sm to match HeroUI Input sm size internal padding"
  - "Removed invalid autoSave StoreOptions property from environmentStore plugin-store load() calls (pre-existing TS error)"

patterns-established:
  - "Variable substitution pattern: read vars from useEnvironmentStore.getState().activeEnvVariables inside Zustand action"
  - "Only substitute enabled entries (disabled headers/params are not sent)"
  - "countUnresolved scans all string fields: url, enabled header keys+values, enabled param keys+values, body.content, auth.token"

requirements-completed: [ENV-04, ENV-06]

# Metrics
duration: 15min
completed: 2026-03-25
---

# Phase 4 Plan 03: Variable Substitution and URL Highlighting Summary

**{{variable}} substitution wired into sendRequest for all fields, with orange/red CSS overlay highlighting and unresolved count badge in UrlBar**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-25T13:20:00Z
- **Completed:** 2026-03-25T13:35:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- sendRequest in requestStore now resolves {{variable}} references from active environment before the Tauri IPC call, applying to URL, enabled headers, enabled query params, body content, and auth token
- UrlBar shows a CSS highlight overlay: resolved variables render orange (text-warning), unresolved render red with dotted underline (text-danger decoration-dotted), using pointer-events-none transparent text overlay technique
- Unresolved variable count badge (Chip, color=warning) appears near Send button when any field contains an unresolved variable reference

## Task Commits

Each task was committed atomically:

1. **Task 1: Variable substitution in requestStore.sendRequest** - `0df57c0` (feat)
2. **Task 2: UrlBar variable highlighting overlay and unresolved badge** - `90d22f1` (feat)

**Plan metadata:** `(pending final commit)` (docs: complete plan)

## Files Created/Modified

- `src/stores/requestStore.ts` - Added substitute import, useEnvironmentStore import, variable resolution in sendRequest for all request fields
- `src/features/http/UrlBar.tsx` - Added tokenize/countUnresolved imports, activeEnvVariables subscription, highlight overlay div, unresolved count Chip badge
- `src/stores/environmentStore.ts` - Fixed pre-existing TS error: removed invalid `{ autoSave: true }` from plugin-store load() options

## Decisions Made

- Placed unresolved badge in UrlBar (not RequestEditor): UrlBar already renders the Send button and can access all requestStore fields directly, avoiding prop drilling through RequestEditor
- Used `px-3` padding on the overlay div to match HeroUI Input's sm size internal padding, ensuring text alignment between overlay and actual input
- Disabled entries (headers/params with `enabled: false`) are not substituted and passed through unchanged — matches the fact they are not sent

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing TypeScript error in environmentStore.ts**
- **Found during:** Task 1 verification (npx tsc --noEmit)
- **Issue:** `load('dispatch-prefs.json', { autoSave: true })` fails TS type check because StoreOptions requires `defaults` field — this was a pre-existing error not caused by plan changes
- **Fix:** Removed the options argument entirely since `autoSave: true` is the default behavior per plugin-store docs
- **Files modified:** src/stores/environmentStore.ts
- **Verification:** npx tsc --noEmit exits 0
- **Committed in:** 0df57c0 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 pre-existing bug)
**Impact on plan:** Required fix to meet acceptance criteria (tsc exits 0). No scope creep.

## Issues Encountered

None beyond the pre-existing TS error documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Environment variable substitution is fully wired end-to-end
- Phase 4 environment/secrets system is complete
- Ready for Phase 5 (GitHub OAuth) — auth token can reference environment variables if needed

## Known Stubs

None - all plan goals are fully wired. The substitution reads live from activeEnvVariables which is populated by the environment system built in Plan 01.

## Self-Check: PASSED

- FOUND: src/stores/requestStore.ts
- FOUND: src/features/http/UrlBar.tsx
- FOUND: .planning/phases/04-environments-secrets/04-03-SUMMARY.md
- FOUND commit: 0df57c0 (feat: variable substitution in sendRequest)
- FOUND commit: 90d22f1 (feat: UrlBar highlighting and unresolved badge)
- npx tsc --noEmit: PASS (0 errors)
- npm run test: PASS (32 tests, 4 test files)

---
*Phase: 04-environments-secrets*
*Completed: 2026-03-25*
