# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-23
**Phase:** 1-Foundation
**Areas discussed:** Panel layout, First-launch state, Theme / appearance, Top bar pre-login

---

## Panel Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed width (~260px) | Clean, predictable — like VS Code's default sidebar | ✓ |
| Resizable with drag handle | User can adjust width — more flexible but adds complexity | |
| Collapsible | Toggle open/closed with a button — maximizes editor space | |

**User's choice:** Fixed width (~260px)
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Vertical split (top/bottom) | Request editor on top, response below — like the spec mockup | ✓ |
| Horizontal split (left/right) | Request on left, response on right — side-by-side | |
| Tabbed (one at a time) | Switch between request editor and response — full width | |

**User's choice:** Vertical split (top/bottom)
**Notes:** Matches the spec mockup layout

---

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed 50/50 | Simple, predictable — both panels get equal space | |
| Resizable drag handle | User can drag the divider to favor editor or response | ✓ |
| You decide | Claude picks the best approach | |

**User's choice:** Resizable drag handle
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| 1024x600 | Comfortable for most laptops | |
| 900x500 | Smaller minimum — 13" MacBook Air | |
| You decide | Claude picks based on layout needs | ✓ |

**User's choice:** You decide
**Notes:** Claude's discretion

---

| Option | Description | Selected |
|--------|-------------|----------|
| Each panel scrolls independently | Own scrollbars per panel | |
| Response auto-scrolls to bottom | Jump to end after response | |
| You decide | Claude picks best UX | ✓ |

**User's choice:** You decide
**Notes:** Claude's discretion

---

## First-Launch State

| Option | Description | Selected |
|--------|-------------|----------|
| Blank request editor | Jump straight to a GET request ready to type a URL | ✓ |
| Welcome screen | Brief intro with 'New Request' and 'Connect GitHub' buttons | |
| Guided onboarding | Step-by-step walkthrough | |

**User's choice:** Blank request editor
**Notes:** Zero friction, supports 60-second goal

---

| Option | Description | Selected |
|--------|-------------|----------|
| Empty + hint text | 'No collections yet' with subtle prompt | ✓ |
| Quick-start buttons | Prominent 'New Collection' and 'Connect Repo' buttons | |
| You decide | Claude picks best empty state | |

**User's choice:** Empty + hint text
**Notes:** None

---

## Theme / Appearance

| Option | Description | Selected |
|--------|-------------|----------|
| Dark only | Simpler to build, strong identity | |
| Light only | Clean, accessible | |
| Both (system pref) | Follow macOS appearance setting | ✓ |
| Both (manual toggle) | User switches in settings | |

**User's choice:** Both (system pref)
**Notes:** Expected behavior on macOS

---

| Option | Description | Selected |
|--------|-------------|----------|
| Neutral/gray tones | Clean, professional — content is the star | |
| Accent color (brand) | Signature color for primary actions and identity | ✓ |
| You decide | Claude picks tasteful palette | |

**User's choice:** Accent color (brand)
**Notes:** User specified green as the accent color direction

---

## Top Bar Pre-Login

| Option | Description | Selected |
|--------|-------------|----------|
| "Local" workspace | Show default 'Local' workspace | |
| "Connect GitHub" button | Replace switcher with call-to-action | ✓ |
| Hidden until login | Don't show switcher at all | |

**User's choice:** "Connect GitHub" button
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| "No Environment" placeholder | Dropdown shows disabled option | ✓ |
| Hidden until created | Don't show selector until envs exist | |
| You decide | Claude picks best pre-env UX | |

**User's choice:** "No Environment" placeholder
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Hidden | No sync indicator until repo connected | |
| "Local only" badge | Shows changes are local, hints at sync | ✓ |
| You decide | Claude picks best approach | |

**User's choice:** "Local only" badge
**Notes:** None

---

## Claude's Discretion

- Minimum window size
- Scroll behavior (independent panel scrolling)

## Deferred Ideas

None
