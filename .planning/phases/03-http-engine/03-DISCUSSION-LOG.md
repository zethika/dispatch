# Phase 3: HTTP Engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 03-http-engine
**Areas discussed:** Request editor layout, Response display, Loading & error states, Send button & Cmd+Enter

---

## Request Editor Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Tab strip | Horizontal tabs: Params, Headers, Body, Auth. One visible at a time. Familiar from Postman/Insomnia. | ✓ |
| Stacked sections | All sections visible, collapsible accordions. More vertical space usage. | |
| Minimal tabs | Only Params/Headers tabs. Body auto-appears for POST/PUT. Auth as icon toggle. | |

**User's choice:** Tab strip
**Notes:** None

### Key-Value Editor Rows

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle + delete per row | Checkbox to enable/disable, X to delete. Disabled rows grayed out but visible. | ✓ |
| Delete only, no toggle | Rows either exist or don't. No enable/disable concept. | |
| You decide | Claude's discretion. | |

**User's choice:** Toggle + delete per row
**Notes:** None

### Body Tab Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Always visible | Body tab always in tab strip regardless of HTTP method. | ✓ |
| Method-conditional | Body tab only for POST/PUT. | |

**User's choice:** Always visible
**Notes:** None

### Body Editor Level

| Option | Description | Selected |
|--------|-------------|----------|
| Plain textarea with highlighting | Styled textarea with JSON syntax highlighting. Lightweight, low dependency. | ✓ |
| CodeMirror / Monaco editor | Full code editor with line numbers, bracket matching. ~200KB+ dependency. | |
| You decide | Claude's discretion. | |

**User's choice:** Plain textarea with highlighting
**Notes:** None

---

## Response Display

### Response Panel Organization

| Option | Description | Selected |
|--------|-------------|----------|
| Status bar + tabbed body/headers | Top bar with status code, time, size. Below: Body and Headers tabs. | ✓ |
| Inline status + scrollable body | Status inline, body and headers stacked vertically, headers collapsed. | |

**User's choice:** Status bar + tabbed body/headers
**Notes:** None

### JSON Syntax Highlighting

| Option | Description | Selected |
|--------|-------------|----------|
| CSS-based token coloring | Parse JSON, render colored spans. Lightweight, no dependencies. | ✓ |
| Prism.js / highlight.js | Dedicated syntax highlighting library. ~30KB. | |
| You decide | Claude's discretion. | |

**User's choice:** CSS-based token coloring
**Notes:** None

### Response Controls

| Option | Description | Selected |
|--------|-------------|----------|
| Copy button + always pretty-printed | JSON always formatted. Copy button copies raw JSON. | ✓ |
| Copy + raw/pretty toggle | Toggle between formatted and minified views. | |
| You decide | Claude's discretion. | |

**User's choice:** Copy button + always pretty-printed
**Notes:** None

---

## Loading & Error States

### Loading State

| Option | Description | Selected |
|--------|-------------|----------|
| Spinner in response panel | Centered spinner with "Sending request..." text. Send button disabled. | ✓ |
| Progress bar under URL | Thin animated bar under URL input. More subtle. | |
| Skeleton placeholder | Shimmer of response layout. May be misleading for slow requests. | |

**User's choice:** Spinner in response panel
**Notes:** None

### Error Display

| Option | Description | Selected |
|--------|-------------|----------|
| Error in response panel | Red status area with error type and raw error message. Error IS the response. | ✓ |
| Toast notification + empty panel | Toast alert, response panel unchanged. | |
| You decide | Claude's discretion. | |

**User's choice:** Error in response panel
**Notes:** None

---

## Send Button & Cmd+Enter

### Send Button Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Right side of URL bar | Inline with method dropdown and URL input. Always visible. | ✓ |
| Below the tab content area | At bottom of request editor panel. | |
| You decide | Claude's discretion. | |

**User's choice:** Right side of URL bar
**Notes:** None

### Cmd+Enter Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Implement now | Cmd+Enter in Phase 3. KEY-01 marked done early. | |
| Wait for Phase 8 | Defer all keyboard shortcuts. Send button only for now. | ✓ |

**User's choice:** Wait for Phase 8
**Notes:** None

---

## Claude's Discretion

- Tab styling approach (underline vs pill vs flat)
- Key-value editor empty row behavior and focus management
- JSON body textarea sizing and resize handles
- Response status code text format
- Spinner animation style
- Copy button placement and feedback

## Deferred Ideas

None — discussion stayed within phase scope
