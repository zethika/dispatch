# Phase 4: Environments & Secrets - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 04-environments-secrets
**Areas discussed:** Environment manager UI, Variable substitution display, Secret storage strategy, Environment selector behavior

---

## Environment Manager UI

### Management Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Modal dialog | Two-pane modal: env list left, variable editor right. Opened from TopBar. | ✓ |
| Sidebar panel | New section in sidebar below collections. | |
| Settings page | Dedicated settings view for environment management. | |

**User's choice:** Modal dialog
**Notes:** None

### Secret Value Display

| Option | Description | Selected |
|--------|-------------|----------|
| Masked with reveal toggle | •••••••• by default, eye icon to toggle. Standard password UX. | ✓ |
| Always hidden | Values never shown after entry. | |
| You decide | Claude's discretion. | |

**User's choice:** Masked with reveal toggle
**Notes:** None

### Environment CRUD Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Inline list with context actions | Click to select, right-click for rename/delete. "+ New" at bottom. | ✓ |
| Form-based with save button | Select, edit in form, explicit Save. | |
| You decide | Claude's discretion. | |

**User's choice:** Inline list with context actions
**Notes:** None

---

## Variable Substitution Display

### Variable Reference Appearance

| Option | Description | Selected |
|--------|-------------|----------|
| Colored inline text | Orange for resolved, red+dotted underline for unresolved. CSS color on delimiters. | ✓ |
| Chip/badge tokens | Inline chips with hover preview. Requires contenteditable. | |
| No visual treatment | Plain text, only warning icon for unresolved. | |

**User's choice:** Colored inline text
**Notes:** None

### Unresolved Variable Indicator

| Option | Description | Selected |
|--------|-------------|----------|
| Inline + summary badge | Red text in field + warning badge near Send showing count. | ✓ |
| Inline only | Just red coloring on text. | |
| You decide | Claude's discretion. | |

**User's choice:** Inline in field + summary badge
**Notes:** None

---

## Secret Storage Strategy

### Storage Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Local JSON files per SPECS.md | ~/Library/Application Support/.../secrets/. Plain JSON, never committed. | ✓ |
| macOS Keychain via secure-storage | Keychain entries per secret. Encrypted by OS. | |
| Hybrid approach | Local file encrypted with Keychain key. | |

**User's choice:** Local JSON files per SPECS.md
**Notes:** Keychain reserved for GitHub OAuth token only (Phase 5)

---

## Environment Selector Behavior

### Selector UX

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown with manage link | List environments, "No Environment" option, "Manage Environments..." link. | ✓ |
| Simple dropdown only | Just the list, no manage link. | |
| You decide | Claude's discretion. | |

**User's choice:** Dropdown with manage link
**Notes:** None

### Active Environment Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| In dispatch.json per workspace | Committed to git, teammates see last active. | |
| Local-only preference | tauri-plugin-store, never committed. Each user has own active env. | ✓ |
| You decide | Claude's discretion. | |

**User's choice:** Local-only preference
**Notes:** User explicitly chose local-only so each team member can have their own active environment

---

## Claude's Discretion

- Variable highlighting implementation approach
- Environment modal sizing and responsiveness
- Variable editor row interaction details
- "No Environment" state effect on unresolved indicator
- Secret file creation timing

## Deferred Ideas

None — discussion stayed within phase scope
