# Phase 6: Git Sync Engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 06-git-sync-engine
**Areas discussed:** Git actor design, Sync status indicator, Conflict resolution UX, Commit & push behavior

---

## Git Actor Design

### How should the git actor be structured?

| Option | Description | Selected |
|--------|-------------|----------|
| mpsc actor | Single long-lived task with mpsc channel. Sequential git ops. Oneshot reply channels. | ✓ |
| Mutex-guarded | Shared Mutex<GitState> for locking. Simpler but risks contention. | |
| Per-workspace actors | One actor per workspace. More parallel but more complex. | |

**User's choice:** mpsc actor
**Notes:** Aligns with STATE.md note about mpsc pattern

### Should the git actor be per-app or per-workspace?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-app singleton | One actor for the whole app. Simpler. Minimal contention. | ✓ |
| Per-workspace actor | Each workspace gets its own actor. Truly parallel. | |

**User's choice:** Per-app singleton
**Notes:** None

---

## Sync Status Indicator

### Where should the primary sync status indicator live?

| Option | Description | Selected |
|--------|-------------|----------|
| TopBar chip | Status chip with icon + text. Replaces "Local only" badge. | ✓ |
| Workspace dot only | Only workspace switcher dots change. No TopBar indicator. | |
| Sidebar footer | Status at bottom of sidebar. | |

**User's choice:** TopBar chip
**Notes:** None

### What states should the sync indicator show?

| Option | Description | Selected |
|--------|-------------|----------|
| 4 states | synced, syncing, conflict, error + "Local only" for non-GitHub | ✓ |
| 3 states | synced, syncing, conflict. No separate error state. | |
| 5 states with offline | Adds offline. More granular but offline comes in Phase 7. | |

**User's choice:** 4 states
**Notes:** None

### Should workspace switcher dots mirror sync status?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, mirror TopBar states | Each dot shows per-workspace sync state. | ✓ |
| Active workspace only | Only active dot changes. Others always gray. | |

**User's choice:** Yes, mirror TopBar states
**Notes:** None

---

## Conflict Resolution UX

### How should last-write-wins conflicts be resolved?

| Option | Description | Selected |
|--------|-------------|----------|
| Remote wins on pull | Remote version wins. Local discarded for conflicting files. Toast notification. | ✓ |
| Local wins, push force | Local always wins. Push overwrites remote. | |
| Show diff and ask user | Side-by-side comparison. Most correct but blocks sync. | |

**User's choice:** Remote wins on pull
**Notes:** None

### What should the conflict notification show?

| Option | Description | Selected |
|--------|-------------|----------|
| Toast with file list | Sonner toast showing affected file paths. Non-blocking. | ✓ |
| Persistent banner | Banner at top of editor until dismissed. | |
| Toast + sidebar indicator | Toast plus badge on affected items in tree. | |

**User's choice:** Toast with file list
**Notes:** None

---

## Commit & Push Behavior

### What should trigger a commit and push?

| Option | Description | Selected |
|--------|-------------|----------|
| Manual trigger only | Click sync chip. Auto-sync deferred to Phase 7. | ✓ |
| Debounced auto-sync | Auto commit+push after inactivity. Overlaps Phase 7. | |
| Save-triggered sync | Sync on every save. Could be too frequent. | |

**User's choice:** Manual trigger only
**Notes:** None

### What should be committed?

| Option | Description | Selected |
|--------|-------------|----------|
| All workspace changes | git add -A, commit all. Auto message "Dispatch sync". | ✓ |
| Changed files only | Only stage modified files since last sync. | |

**User's choice:** All workspace changes
**Notes:** None

---

## Claude's Discretion

- Git actor message enum design
- Error recovery for failed pushes
- "No changes" detection
- Sync store design
- Tauri events for real-time status
- Pull strategy (fetch+merge vs rebase)

## Deferred Ideas

None — discussion stayed within phase scope
