# Phase 5: GitHub Auth - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 05-github-auth
**Areas discussed:** Login flow UX, Repo browser & connect, Workspace switcher, Auth state transitions

---

## Login Flow UX

### Where should the device flow login experience happen?

| Option | Description | Selected |
|--------|-------------|----------|
| Modal dialog | Centered modal with device code, "Copy & Open GitHub" button, polling spinner. Consistent with env modal pattern. | ✓ |
| Dedicated screen | Replaces main content area with full login screen. Blocks request editor. | |
| Inline TopBar dropdown | Expands Connect GitHub button into dropdown panel. Compact but cramped. | |

**User's choice:** Modal dialog
**Notes:** None

### What should happen after successful login?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-dismiss + toast | Modal closes, success toast shows "Signed in as @username", TopBar updates with avatar. | ✓ |
| Success screen in modal | Modal shows success state with avatar, user clicks "Done". | |
| Transition to repo browser | Modal morphs into repo browser after login. | |

**User's choice:** Auto-dismiss + toast
**Notes:** None

### How should logout work?

| Option | Description | Selected |
|--------|-------------|----------|
| Settings/profile menu | Avatar in TopBar opens dropdown with "Sign out". App reverts to local-only. | ✓ |
| Confirmation modal | Confirmation dialog warning about sync implications before signing out. | |

**User's choice:** Settings/profile menu
**Notes:** None

---

## Repo Browser & Connect

### How should users browse and select repos to connect?

| Option | Description | Selected |
|--------|-------------|----------|
| Modal with search list | Searchable/filterable list grouped by owner. Each row: name, visibility, Connect button. | ✓ |
| Sidebar panel | Collapsible panel in sidebar. Limited screen space. | |
| TopBar dropdown | Workspace dropdown extends to show repos. Narrow for many repos. | |

**User's choice:** Modal with search list
**Notes:** None

### What should users see while a repo is being cloned?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline progress in modal | Connect button becomes spinner in row. Modal stays open. Row shows ✓ on success. | ✓ |
| Close modal + toast progress | Modal closes, persistent toast shows progress. | |
| Blocking progress modal | Separate progress modal replaces repo browser. | |

**User's choice:** Inline progress in modal
**Notes:** None

### How should disconnect work?

| Option | Description | Selected |
|--------|-------------|----------|
| Confirmation dialog | "Disconnect [repo-name]? This removes the local copy. Your data is still on GitHub." | ✓ |
| Instant disconnect + undo toast | Disconnect immediately with undo toast for ~5 seconds. | |

**User's choice:** Confirmation dialog
**Notes:** None

---

## Workspace Switcher

### Where should the workspace switcher live?

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar header | Dropdown at top of sidebar, above collection tree. Shows workspace name. | ✓ |
| TopBar dropdown | Replace Connect GitHub area in TopBar. | |
| Sidebar bottom | Workspace switcher at bottom of sidebar. | |

**User's choice:** Sidebar header
**Notes:** None

### How should the local-only workspace appear in the switcher?

| Option | Description | Selected |
|--------|-------------|----------|
| Always present as "Local" | Permanent entry, default before login, can't be disconnected. | ✓ |
| Hidden after GitHub connect | Disappears once user connects a repo. | |
| Create on demand | No local workspace by default, user creates explicitly. | |

**User's choice:** Always present as "Local"
**Notes:** None

### What info should each workspace row show in the dropdown?

| Option | Description | Selected |
|--------|-------------|----------|
| Name + sync dot | Workspace name with colored dot (green=synced, gray=local-only). | ✓ |
| Name + owner + visibility | Repo name, GitHub owner, public/private badge. | |
| Name only | Just the workspace name. | |

**User's choice:** Name + sync dot
**Notes:** None

---

## Auth State Transitions

### How should the TopBar change when the user is logged in?

| Option | Description | Selected |
|--------|-------------|----------|
| Avatar replaces button | Connect GitHub button replaced by user's avatar circle. Dropdown with username + Sign out. | ✓ |
| Username chip + avatar | Both avatar and @username as a chip. Takes more space. | |
| Subtle icon only | Small person icon, green/gray based on auth state. | |

**User's choice:** Avatar replaces button
**Notes:** None

### How should the app handle GitHub token expiry or revocation?

| Option | Description | Selected |
|--------|-------------|----------|
| Silent re-auth prompt | Non-blocking toast on 401: "GitHub session expired — Sign in again". App stays local-only. | ✓ |
| Auto-refresh token | Use refresh tokens to silently renew. More complex. | |
| Immediate modal on failure | Blocking login modal on token failure. | |

**User's choice:** Silent re-auth prompt
**Notes:** None

### Should the app check auth status on launch?

| Option | Description | Selected |
|--------|-------------|----------|
| Check token on startup | Read token from Keychain, verify with GET /user. If expired, silently revert to local-only. | ✓ |
| Trust stored token | Assume token is valid without checking. | |
| Skip until needed | Don't check until user triggers GitHub action. | |

**User's choice:** Check token on startup
**Notes:** None

---

## Claude's Discretion

- GitHub App vs OAuth App configuration
- Repo browser pagination strategy
- Clone target directory structure
- Workspace metadata storage format
- Sidebar header height and styling
- Avatar loading/fallback behavior

## Deferred Ideas

None — discussion stayed within phase scope
