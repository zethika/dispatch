# Phase 8: Polish & Power Features - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 08-polish-power-features
**Areas discussed:** Drag-and-drop behavior, cURL import/export UX, Cmd+K search experience, Keyboard shortcut system

---

## Drag-and-Drop Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Within-collection only | Reorder inside a single collection. Simpler. | |
| Within + cross-collection | Reorder within AND drag between collections. Full flexibility. | ✓ |
| You decide | Claude picks. | |

**User's choice:** Within + cross-collection

| Option | Description | Selected |
|--------|-------------|----------|
| Drop line indicator | Thin blue line between items (Finder/VS Code pattern). | ✓ |
| Ghost preview + drop line | Semi-transparent copy + drop line. | |
| Highlight target zone | Background color change on target. | |

**User's choice:** Drop line indicator

| Option | Description | Selected |
|--------|-------------|----------|
| Drop on folder = nest inside | Dropping on a folder moves item into it. | ✓ |
| Drop anywhere = reorder only | No nesting on drop. | |
| You decide | Claude picks. | |

**User's choice:** Drop on folder = nest inside

---

## cURL Import/Export UX

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-detect on paste | Auto-parse when pasting text starting with 'curl '. | |
| Explicit import action only | User clicks 'Import cURL' from menu. | |
| Both — auto-detect + menu | Auto-detect on paste + explicit menu action. | ✓ |

**User's choice:** Both — auto-detect + menu

| Option | Description | Selected |
|--------|-------------|----------|
| Resolved — variables replaced | Export with variables resolved from active environment. | ✓ |
| Raw — variables preserved | Export with {{variable}} placeholders intact. | |
| Both options via modifier | Default resolved, Option/Alt for raw. | |

**User's choice:** Resolved — variables replaced

| Option | Description | Selected |
|--------|-------------|----------|
| Into current request | Overwrites active request's fields. | ✓ |
| As new request | Creates new request in active collection. | |
| Ask user each time | Prompt each time. | |

**User's choice:** Into current request

---

## Cmd+K Search Experience

| Option | Description | Selected |
|--------|-------------|----------|
| Requests + collections | Search names, URLs, collection names. | ✓ |
| Everything | Requests, collections, URLs, headers, body, environments. | |
| Requests + URLs only | Focused on navigation targets. | |

**User's choice:** Requests + collections

| Option | Description | Selected |
|--------|-------------|----------|
| Grouped by collection | Results under collection headers. | ✓ |
| Flat ranked list | One list ranked by relevance. | |
| You decide | Claude picks. | |

**User's choice:** Grouped by collection

| Option | Description | Selected |
|--------|-------------|----------|
| Name + method + URL path | e.g. 'Get Users GET /api/v1/users' | |
| Name + full breadcrumb | e.g. 'Get Users — My API > Users > List' | ✓ |
| Name + method + breadcrumb | Both method and breadcrumb. | |

**User's choice:** Name + full breadcrumb

---

## Keyboard Shortcut System

| Option | Description | Selected |
|--------|-------------|----------|
| Disable most in text fields | Only Cmd+Enter and Cmd+K in inputs. | |
| All shortcuts always active | Fire regardless of focus. | ✓ |
| You decide | Claude picks. | |

**User's choice:** All shortcuts always active

| Option | Description | Selected |
|--------|-------------|----------|
| Cmd+/ opens cheatsheet modal | Standard pattern (Slack, GitHub). | ✓ |
| Tooltips only | Shortcuts in tooltips/menus. | |
| Both | Tooltips + Cmd+/ modal. | |

**User's choice:** Cmd+/ opens cheatsheet modal

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle flash on target | Brief highlight on affected element. | ✓ |
| No visual feedback | Action just happens. | |
| You decide | Claude picks per shortcut. | |

**User's choice:** Subtle flash on target

---

## Claude's Discretion

- DnD library choice
- cURL parser implementation
- Cmd+K modal styling and animation
- Flash animation timing and easing
- Shortcut registration architecture

## Deferred Ideas

None
