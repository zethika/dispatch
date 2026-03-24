# Phase 2: Data Model - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 02-data-model
**Areas discussed:** Collection tree interaction, Workspace storage location, Slug generation & naming, Request defaults & templates

---

## Collection Tree Interaction

### Tree Item Display

| Option | Description | Selected |
|--------|-------------|----------|
| Method badge + name | Colored HTTP method badge (GET/POST/PUT/DELETE) to the left of request name | ✓ |
| Name only (minimal) | Just the request name, no method indicator | |
| Method + name + URL preview | Method badge, name, and truncated URL beneath | |

**User's choice:** Method badge + name
**Notes:** Color coding: GET=green, POST=blue, PUT=orange, DELETE=red

### Tree Actions

| Option | Description | Selected |
|--------|-------------|----------|
| Right-click context menu | Standard desktop context menu with New Request, New Folder, Rename, Duplicate, Delete | ✓ |
| Inline icon buttons | Hover to reveal small icon buttons on the right side | |
| Both context menu + hover icons | Hover icons for common actions, full context menu for everything | |

**User's choice:** Right-click context menu
**Notes:** None

### Rename UX

| Option | Description | Selected |
|--------|-------------|----------|
| Inline text edit | Name becomes editable text field in the tree. Enter to confirm, Escape to cancel. | ✓ |
| Modal dialog | Opens a small modal/popover with text input | |

**User's choice:** Inline text edit
**Notes:** Matches Finder/VS Code pattern

### Delete Confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| Confirmation modal | Small modal asking to confirm, mentions child count for collections | ✓ |
| Instant delete (no confirm) | Delete immediately, rely on git history as undo | |

**User's choice:** Confirmation modal
**Notes:** For collections/folders with children, modal states how many items will be deleted

---

## Workspace Storage Location

### Storage Location

| Option | Description | Selected |
|--------|-------------|----------|
| App data directory | ~/Library/Application Support/dev.dispatch.app/workspaces/<id>/ | ✓ |
| User-chosen folder | Let user pick a folder | |
| Fixed ~/Dispatch folder | Predictable location in home directory | |

**User's choice:** App data directory
**Notes:** Invisible to user, managed by the app

### First Launch Workspace

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-create scratch workspace | "My Workspace" pre-created on first launch | ✓ |
| Empty state — user creates first | No workspace until user creates one | |

**User's choice:** Auto-create scratch workspace
**Notes:** Supports the 60-second-to-first-request goal

### Scratch Workspace Fate (After GitHub Connect)

| Option | Description | Selected |
|--------|-------------|----------|
| Keep both | Scratch workspace stays, GitHub repo becomes second workspace | ✓ |
| Offer to migrate | Prompt to move local requests to new repo | |
| Auto-replace | GitHub repo replaces scratch workspace | |

**User's choice:** Keep both
**Notes:** None

---

## Slug Generation & Naming

### Rename Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Rename file on disk | File/folder renames to match new display name | ✓ |
| Keep original slug forever | File stays with original slug, display name stored in JSON | |

**User's choice:** Rename file on disk
**Notes:** Git tracks renames natively

### Collision Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Append number suffix | get-users.json, get-users-2.json, get-users-3.json | ✓ |
| Force unique names | Block creation with error message | |
| Append UUID fragment | get-users-a7f3.json | |

**User's choice:** Append number suffix
**Notes:** Display name stays the same for both; only filename gets suffix

---

## Request Defaults & Templates

### New Request Defaults

| Option | Description | Selected |
|--------|-------------|----------|
| "New Request" + GET + empty URL | Minimal defaults, URL focused | ✓ |
| Sequential numbering | "Request 1", "Request 2", etc. | |
| Prompt for name first | Ask for name before creating | |

**User's choice:** "New Request" + GET + empty URL
**Notes:** Matches first-launch blank editor from Phase 1. Collision: "New Request (2)", "(3)", etc.

### New Collection Defaults

| Option | Description | Selected |
|--------|-------------|----------|
| "New Collection" + empty | Created immediately, name highlighted for inline rename | ✓ |
| Prompt for name first | Ask for name before creating | |
| Auto-name + rename inline | Creates and immediately enters inline rename mode | |

**User's choice:** "New Collection" + empty
**Notes:** Created on disk immediately

### Duplicate Naming

| Option | Description | Selected |
|--------|-------------|----------|
| "Original Name (copy)" | Clear lineage, placed after original | ✓ |
| "Copy of Original Name" | More explicit but pushes meaningful part right | |

**User's choice:** "Original Name (copy)"
**Notes:** Slug derived from copy name (e.g., get-users-copy.json)

---

## Claude's Discretion

- Slug max length and character handling details
- Exact slugify implementation
- Tree expand/collapse animation timing
- Collection tree scroll behavior

## Deferred Ideas

None — discussion stayed within phase scope
