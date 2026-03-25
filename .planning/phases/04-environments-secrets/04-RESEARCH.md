# Phase 4: Environments & Secrets - Research

**Researched:** 2026-03-25
**Domain:** Environment variable management, local secrets storage, variable substitution in a Tauri/React desktop app
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Environment Manager UI**
- D-01: Modal dialog for managing environments. Opened from TopBar environment dropdown ("Manage Environments..." link) or future Cmd+E shortcut (Phase 8).
- D-02: Modal layout: environment list on the left, variable editor on the right. Split-pane within the modal.
- D-03: Left panel: list of environments, click to select, right-click or hover icon for rename/delete. "+ New" button at bottom. Active environment marked with a dot or check.
- D-04: CRUD follows the inline pattern from Phase 2 — inline rename, delete confirmation modal for environments with variables.

**Variable Editor**
- D-05: Key-value editor with three columns: key input, value input, and a secret toggle (lock icon or checkbox). Reuse KeyValueEditor pattern from Phase 3 but add the secret column.
- D-06: Secret variable values masked by default (•••••••) with an eye icon to toggle visibility. Matches password field UX.
- D-07: "+ Add variable" button at bottom of the variable list, same pattern as KeyValueEditor.

**Secret Storage**
- D-08: Secrets stored as local JSON files at `~/Library/Application Support/dev.dispatch.app/secrets/<workspace-id>/<env-slug>.json`. Plain JSON, never committed to git. Matches SPECS.md file-based philosophy.
- D-09: NOT using macOS Keychain / tauri-plugin-secure-storage for secrets — local JSON files are simpler, debuggable, and portable. Keychain is reserved for the GitHub OAuth token only (Phase 5).
- D-10: Environment JSON files in the workspace (`environments/*.json`) store the schema with `"value": ""` for secret variables. Actual secret values only in the local secrets store.

**Variable Substitution Display**
- D-11: {{variable}} references shown in distinct color (orange/amber) in URL input and other fields when resolved from active environment.
- D-12: Unresolved {{variable}} references shown in red/warning color with dotted underline in the field itself.
- D-13: Summary warning badge near the Send button showing count of unresolved variables (e.g., "2 unresolved"). Two signals: inline color + summary count.
- D-14: Substitution applies to: URL, headers, query params, body, and auth token fields (ENV-04).

**Environment Selector (TopBar)**
- D-15: TopBar dropdown lists all environments for the workspace. Selecting one makes it active immediately. "No Environment" option at top clears the active environment.
- D-16: "Manage Environments..." link at the bottom of the dropdown opens the management modal.
- D-17: Active environment persisted locally per workspace via tauri-plugin-store (not in dispatch.json). Each user has their own active environment. Never committed to git.

### Claude's Discretion
- Variable highlighting implementation approach (CSS overlay, contenteditable, or separate render layer)
- Environment modal sizing and responsiveness
- Variable editor row interaction details (focus management, tab order)
- How the "No Environment" state affects the unresolved variable indicator
- Secret file creation timing (on first secret vs on environment creation)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ENV-01 | User can create, edit, and delete environments for a workspace | Rust `environments/` I/O module (parallel to `collections/`); environment CRUD commands follow the same `commands/collections.rs` thin-delegate pattern |
| ENV-02 | User can select an active environment from the top bar (global to workspace) | `TopBar.tsx` already has the dropdown placeholder; `environmentStore` + `tauri-plugin-store` for per-workspace persistence |
| ENV-03 | User can add variables with a key-value editor and a "secret" toggle per variable | `KeyValueEditor.tsx` extended with a secret column; masked input using HeroUI `Input` with `type="password"` and eye toggle |
| ENV-04 | {{variable}} substitution works in URL, headers, query params, body, and auth token | Regex substitution in `sendRequest` inside `requestStore.ts` (or a new `resolveVariables` util); UrlBar overlay for visual indication |
| ENV-05 | Secret variable values are stored locally only and never committed to git | D-08/D-09/D-10 pattern: Rust secrets dir at `app_data_dir()/secrets/<workspace-id>/<env-slug>.json`; env file in workspace writes `"value": ""` for secrets |
| ENV-06 | User sees a visual indicator when a variable in a request cannot be resolved | Inline red/warning color (D-12) + unresolved count badge near Send (D-13); computed from active environment map vs. variables found in current request fields |
</phase_requirements>

---

## Summary

Phase 4 adds the environment and variable layer on top of the working HTTP engine from Phase 3. The core work splits into three orthogonal tracks: (1) Rust I/O for environment files and the local secrets store, (2) a new `environmentStore` (Zustand) wiring the TopBar dropdown to environment CRUD, and (3) variable substitution and visual highlighting in the request editor.

The architecture is an extension of patterns already established. The Rust side mirrors the `collections/` module — a new `environments/` module with `io.rs`, `types.rs`, and thin commands in `commands/environments.rs`. The secrets layer is a second Rust I/O concern that writes to `app_data_dir()/secrets/` (never inside any workspace directory). The frontend store (`environmentStore.ts`) follows `collectionStore.ts` verbatim in structure. Variable substitution runs in `requestStore.sendRequest()` just before the IPC call — a pure string transformation against the active environment map.

The most nuanced implementation area is variable highlighting in the URL bar. A plain `<Input>` cannot style substrings. The decision log leaves this to Claude's discretion. The standard approach for this constraint is a positioned overlay div that renders colored `<span>` tokens on top of a transparent `<input>`. This is the same technique used in the Phase 3 JSON viewer (colored spans), extended to an interactive input field.

**Primary recommendation:** Build in this order — Rust environment I/O, Rust secrets I/O, typed IPC commands, `environmentStore`, TopBar wiring, `VariableEditor` component, substitution in `sendRequest`, UrlBar variable overlay, unresolved badge.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | 5.x (^5.0.12 in package.json) | `environmentStore` global state | Already used for `collectionStore` and `requestStore`; same pattern, zero new dependencies |
| tauri-plugin-store | 2.x | Persist active environment selection per workspace | D-17 explicitly calls for this; lightweight key-value JSON file store; ships as part of Tauri plugins workspace |
| HeroUI @heroui/react | 2.7.11 (pinned) | Modal, Input, Button, Dropdown components | Already installed and pinned; `Modal`, `ModalContent`, `ModalHeader`, `ModalBody` handle the environment manager; `Input` with `type="password"` handles secret masking |
| Tailwind CSS | 3.x | Utility styling | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| serde / serde_json | 1.x | Serialize/deserialize environment JSON files | Already in Cargo.toml; used for both workspace env files and local secrets files |
| anyhow | 1.x | Error propagation in I/O functions | Already in Cargo.toml; used throughout `collections/io.rs` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain JSON secrets file (D-08) | tauri-plugin-secure-storage / macOS Keychain | Decision D-09 locks the choice: JSON file is simpler, debuggable, doesn't need Keychain entitlements in this phase |
| CSS overlay for URL highlighting | contenteditable div | Overlay avoids contenteditable's paste/IME/undo complexity while achieving the same visual result |
| Regex substitution in requestStore | Separate Rust-side substitution before HTTP | Keeping substitution in the frontend gives instant visual feedback without a round trip; resolved values are passed to Rust as plain strings |

### Installation

tauri-plugin-store is not yet in the project. It must be added:

```bash
# Cargo.toml [dependencies]
# tauri-plugin-store = "2"

# package.json (JS bindings)
npm install @tauri-apps/plugin-store
```

Capability permission required in `src-tauri/capabilities/default.json`:
```json
"store:default"
```

---

## Architecture Patterns

### Recommended Project Structure (additions for Phase 4)

```
src-tauri/src/
├── environments/          # NEW — mirrors collections/
│   ├── mod.rs             # pub mod io; pub mod types;
│   ├── types.rs           # EnvironmentFile, EnvironmentVariable, SecretStore
│   └── io.rs              # read/write environment files + secrets files
├── commands/
│   ├── environments.rs    # NEW — thin delegates (CRUD + secrets)
│   └── mod.rs             # add: pub mod environments;

src/
├── stores/
│   └── environmentStore.ts   # NEW — Zustand store for environments + active env
├── features/environments/    # NEW
│   ├── EnvironmentModal.tsx       # Two-pane modal (env list left, variable editor right)
│   ├── EnvironmentList.tsx        # Left pane: list with inline rename, delete
│   └── VariableEditor.tsx         # Right pane: key-value + secret toggle rows
├── features/http/
│   └── UrlBar.tsx            # MODIFY — add variable highlighting overlay
├── components/layout/
│   └── TopBar.tsx            # MODIFY — wire environment dropdown to store
├── api/
│   └── environments.ts       # NEW — typed invoke wrappers (mirrors api/collections.ts)
```

### Pattern 1: Rust Environment I/O Module

The environment module mirrors `collections/` exactly. The workspace env directory is `<ws_dir>/environments/`. Each environment is `<env-slug>.json`. The local secrets directory is `app_data_dir()/secrets/<workspace-id>/` and each file is `<env-slug>.json`.

```rust
// src-tauri/src/environments/types.rs
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct EnvironmentFile {
    pub name: String,
    pub variables: Vec<EnvironmentVariable>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct EnvironmentVariable {
    pub key: String,
    pub value: String,  // always "" in committed file if secret == true
    pub secret: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct EnvironmentSummary {
    pub slug: String,
    pub name: String,
}
```

### Pattern 2: Secrets I/O (local only, never in workspace)

The secrets directory is completely separate from the workspace directory. It lives in `app_data_dir()` (same root as the `workspaces/` dir, not inside it). This ensures git never touches it.

```rust
// secrets path: app_data_dir()/secrets/<workspace_id>/<env_slug>.json
// Format: { "key1": "value1", "key2": "value2" }
// Type alias in Rust: HashMap<String, String>

pub fn secrets_dir(app_data: &Path, workspace_id: &str) -> PathBuf {
    app_data.join("secrets").join(workspace_id)
}

pub fn read_secrets(app_data: &Path, workspace_id: &str, env_slug: &str)
    -> anyhow::Result<HashMap<String, String>>

pub fn write_secrets(app_data: &Path, workspace_id: &str, env_slug: &str,
    secrets: &HashMap<String, String>) -> anyhow::Result<()>
```

### Pattern 3: Thin IPC Commands

```rust
// src-tauri/src/commands/environments.rs
// Follows commands/collections.rs pattern exactly

#[tauri::command]
#[specta::specta]
pub fn list_environments(workspace_id: String, app: tauri::AppHandle)
    -> Result<Vec<EnvironmentSummary>, String>

#[tauri::command]
#[specta::specta]
pub fn load_environment(workspace_id: String, env_slug: String, app: tauri::AppHandle)
    -> Result<EnvironmentFile, String>

#[tauri::command]
#[specta::specta]
pub fn save_environment(workspace_id: String, env_slug: String,
    env: EnvironmentFile, app: tauri::AppHandle) -> Result<(), String>

#[tauri::command]
#[specta::specta]
pub fn create_environment(workspace_id: String, name: String, app: tauri::AppHandle)
    -> Result<EnvironmentSummary, String>

#[tauri::command]
#[specta::specta]
pub fn delete_environment(workspace_id: String, env_slug: String, app: tauri::AppHandle)
    -> Result<(), String>

#[tauri::command]
#[specta::specta]
pub fn rename_environment(workspace_id: String, old_slug: String, new_name: String,
    app: tauri::AppHandle) -> Result<EnvironmentSummary, String>

// Secrets commands — separate to keep the concern isolated
#[tauri::command]
#[specta::specta]
pub fn load_secret_values(workspace_id: String, env_slug: String, app: tauri::AppHandle)
    -> Result<HashMap<String, String>, String>

#[tauri::command]
#[specta::specta]
pub fn save_secret_values(workspace_id: String, env_slug: String,
    secrets: HashMap<String, String>, app: tauri::AppHandle) -> Result<(), String>
```

Note: `HashMap<String, String>` serializes via specta/serde as a JSON object. This is supported by tauri-specta and produces a TypeScript `Record<string, string>` type.

### Pattern 4: environmentStore (Zustand)

```typescript
// src/stores/environmentStore.ts
interface EnvironmentStore {
  environments: EnvironmentSummary[];       // loaded list
  activeEnvSlug: string | null;             // persisted via tauri-plugin-store
  activeEnvVariables: Record<string, string>; // merged: file values + secret values

  loadEnvironments: (workspaceId: string) => Promise<void>;
  setActiveEnvironment: (workspaceId: string, slug: string | null) => Promise<void>;
  createEnvironment: (workspaceId: string, name: string) => Promise<void>;
  deleteEnvironment: (workspaceId: string, slug: string) => Promise<void>;
  renameEnvironment: (workspaceId: string, oldSlug: string, newName: string) => Promise<void>;
  // Called by EnvironmentModal when user saves variable edits
  saveEnvironmentVariables: (
    workspaceId: string,
    slug: string,
    variables: EnvironmentVariable[],
    secrets: Record<string, string>
  ) => Promise<void>;
}
```

`activeEnvVariables` is the resolved map used everywhere for substitution. It is re-computed whenever `setActiveEnvironment` is called or when `saveEnvironmentVariables` completes — reading both the public values and the secrets, then merging into a flat `Record<string, string>`. Public values and secret values for the same key are merged with secret values taking precedence (matching Postman's behavior).

### Pattern 5: Variable Substitution in requestStore

Substitution happens in `sendRequest()` just before calling `httpApi.sendRequest`. The active environment map is read directly from `environmentStore.getState().activeEnvVariables`.

```typescript
// In requestStore.ts sendRequest()
import { useEnvironmentStore } from './environmentStore';

const substitute = (s: string, vars: Record<string, string>) =>
  s.replace(/\{\{([^}]+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);

sendRequest: async () => {
  const { method, url, headers, queryParams, body, auth } = get();
  const vars = useEnvironmentStore.getState().activeEnvVariables;

  const resolvedUrl = substitute(url, vars);
  const resolvedHeaders = headers.map(h =>
    h.enabled ? { ...h, key: substitute(h.key, vars), value: substitute(h.value, vars) } : h
  );
  // ... same for queryParams, body.content, auth.token
  set({ response: { status: 'loading' } });
  const data = await httpApi.sendRequest({
    method, url: resolvedUrl, headers: resolvedHeaders, ...
  });
}
```

Unresolved variables remain as `{{key}}` literal text in the resolved string. The HTTP executor receives the literal text — which will likely cause a request failure, but that is acceptable behavior (the badge warns the user beforehand).

### Pattern 6: URL Bar Variable Highlighting (Claude's Discretion Area)

The standard technique for inline highlighting in a plain `<input>` is a "backdrop" pattern: a sibling `<div>` with identical font, padding, and sizing is positioned behind (or over with `pointer-events: none`) the transparent input. The div renders tokenized spans of the input value. This avoids contenteditable complexity.

```tsx
// Conceptual structure for UrlBar
<div className="relative flex-1">
  {/* Highlight layer — behind input, pointer-events: none */}
  <div
    aria-hidden="true"
    className="absolute inset-0 flex items-center px-3 text-sm pointer-events-none overflow-hidden whitespace-pre"
  >
    {tokenizeUrl(url, activeEnvVariables).map((token, i) =>
      token.type === 'variable' ? (
        <span key={i} className={token.resolved ? 'text-warning' : 'text-danger underline decoration-dotted'}>
          {token.text}
        </span>
      ) : (
        <span key={i} className="text-transparent">{token.text}</span>
      )
    )}
  </div>
  {/* Actual input — transparent text so highlight layer shows through */}
  <Input value={url} onChange={...} className="bg-transparent caret-foreground text-transparent" />
</div>
```

The `tokenizeUrl` function splits the URL string on `{{...}}` pattern: literal text gets `type: 'literal'`, variable tokens get `type: 'variable'` with `resolved: boolean` based on lookup in `activeEnvVariables`. Only the variable tokens get colored spans; literal text tokens use `text-transparent` so only the highlight layer colors are visible while the caret from the real input remains.

**Limitation:** HeroUI `<Input>` wraps a native `<input>` in a styled container with its own padding classes. The overlay div must replicate HeroUI's exact interior padding values (`px-3 py-2` for `size="sm"` bordered variant). These values should be verified against the rendered DOM during implementation — treat them as an implementation detail, not a locked value.

### Pattern 7: Unresolved Variable Badge

The badge is computed from the active request fields (URL, headers, query params, body content, auth token) by extracting all `{{var}}` tokens and checking which ones are absent from `activeEnvVariables`.

```typescript
// utils/variables.ts
export const extractVariables = (s: string): string[] =>
  [...s.matchAll(/\{\{([^}]+)\}\}/g)].map(m => m[1]);

export const countUnresolved = (
  fields: string[],
  vars: Record<string, string>
): number => {
  const all = fields.flatMap(extractVariables);
  return new Set(all.filter(k => !(k in vars))).size;
};
```

The `UrlBar` (or `RequestEditor`) computes this count from the current draft fields in `requestStore` and `environmentStore.activeEnvVariables`, rendering a small `<Chip>` or badge near the Send button when `count > 0`.

### Anti-Patterns to Avoid

- **Storing secrets in the workspace directory:** Any file inside the workspace is committed by the Phase 7 sync engine. Secrets must go to `app_data_dir()/secrets/` — a completely separate tree.
- **Clearing saved secrets on environment delete without confirmation:** The delete flow should explicitly call `delete_secret_values` for the environment slug, and this should be documented in the command. Orphaned secret files are harmless but wasteful.
- **Running substitution in Rust (on the IPC layer):** Substitution in the frontend keeps the variable map in one place and gives instant visual feedback. Rust receives already-resolved strings.
- **Using contenteditable for the URL input:** Contenteditable breaks paste events, IME input, browser spellcheck, and accessibility. The overlay/backdrop pattern achieves the same visual result without those tradeoffs.
- **Loading full environment variable values into the environments list:** `list_environments` should return only `EnvironmentSummary` (slug + name), not full variable data. Full data is loaded lazily when the user opens a specific environment in the modal.
- **Re-loading the environment variable map on every render:** `activeEnvVariables` should be a computed snapshot stored in the Zustand store, updated only when the active environment changes or variables are saved. Components read from the snapshot — no per-render IPC calls.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Active environment persistence | Custom JSON file for `activeEnvSlug` | `tauri-plugin-store` | Store handles atomic writes, read-on-startup, and workspace-keyed state. No custom persistence code needed. |
| Secret field masking | Custom password input | HeroUI `<Input type="password">` with eye icon | HeroUI's input already handles masking, visibility toggle, and accessible labeling. |
| Modal dialog | Custom overlay/backdrop/focus trap | HeroUI `<Modal>` | HeroUI Modal handles focus trap, Escape key, scroll lock, and accessibility. Non-trivial to hand-roll correctly. |
| Inline rename | Custom double-click handler | Phase 2 pattern (inline text input swap) | Already established in `collectionStore`; copy the pattern. |
| Slug generation | Custom slugify | Existing `collections/slugify.rs` | Same function, same rules. Use it directly in the environments module. |

**Key insight:** Every new UI primitive in this phase has a HeroUI equivalent already in the project. The only novel implementation is the URL variable highlight overlay — that IS hand-rolled because no component library provides it, but it uses the standard backdrop pattern.

---

## Common Pitfalls

### Pitfall 1: tauri-plugin-store Not Yet Added to the Project

**What goes wrong:** `commands/environments.rs` references `tauri_plugin_store::StoreExt` but the crate is not in `Cargo.toml` and the plugin is not registered in `lib.rs`. IPC calls panic silently at runtime.

**Why it happens:** `tauri-plugin-store` is mentioned in `CLAUDE.md` and `STATE.md` but has not been added to the project yet (it is not in the current `Cargo.toml`).

**How to avoid:** Wave 0 of the plan must add `tauri-plugin-store = "2"` to `Cargo.toml`, add `@tauri-apps/plugin-store` to `package.json`, register `.plugin(tauri_plugin_store::Builder::default().build())` in `lib.rs`, and add `"store:default"` to `capabilities/default.json`.

**Warning signs:** Build succeeds but `store:set` IPC calls return capability errors.

### Pitfall 2: Secret File Path Drift from SPECS.md

**What goes wrong:** Secrets are written to a path that differs from the canonical path in SPECS.md, causing orphaned files when Phase 5+ code looks in the canonical location.

**Why it happens:** Multiple places define the path (D-08, SPECS.md §Local Secrets Store, the Rust function). If they diverge, secrets are silently lost.

**How to avoid:** Define a single `secrets_dir` function in `environments/io.rs` that is the only place the path is computed. All commands call this function. The canonical path is: `app_data_dir()/secrets/<workspace-id>/<env-slug>.json`.

**Warning signs:** Secret values show as empty after app restart.

### Pitfall 3: HeroUI Input Backdrop Pixel Mismatch

**What goes wrong:** The variable highlight overlay layer is 1–2px misaligned with the actual input text, making colored variable tokens appear slightly offset.

**Why it happens:** HeroUI `<Input>` applies its own internal padding via nested divs. The overlay must match the exact inner padding of the rendered input element, not the component's `className` prop padding.

**How to avoid:** During implementation, inspect the rendered HeroUI input DOM to find the actual inner element's padding values. If HeroUI Input size="sm" variant="bordered" renders the text at `paddingLeft: 12px`, the overlay div must also have `paddingLeft: 12px`. Use browser devtools or a snapshot test.

**Warning signs:** Colored spans don't align with the typed characters in the input.

### Pitfall 4: Active Environment Not Cleared on Workspace Switch

**What goes wrong:** User switches workspace, but `environmentStore.activeEnvSlug` and `activeEnvVariables` still hold the previous workspace's values. Variables from workspace A resolve in workspace B.

**Why it happens:** `collectionStore.loadWorkspace` does not call `environmentStore.loadEnvironments`. There is currently no cross-store coordination.

**How to avoid:** When `collectionStore.loadWorkspace` is called, also call `environmentStore.loadEnvironments(workspaceId)`. Either wire this in `App.tsx` (where `loadWorkspace` is called) or have `environmentStore.loadEnvironments` clear state before loading.

**Warning signs:** After switching workspaces, TopBar shows an environment name from the previous workspace.

### Pitfall 5: Saving Secret Values Overwrites Entire File

**What goes wrong:** When the user edits only one secret variable, the write operation discards secrets for other variables because only the edited variable's value is sent.

**Why it happens:** A naive `save_secret_values` call that sends only the currently-displayed secret fields loses any variables whose secret value the user didn't re-enter (the modal may show `•••` masked values that are not sent back as actual values).

**How to avoid:** The VariableEditor must track two separate state pieces: (1) the `EnvironmentVariable[]` from the environment file (including public values), and (2) a `Record<string, string>` for secret values loaded from the secrets file. When saving, both are sent. The modal's secret inputs should load existing secret values from the Rust secrets file when the environment is first opened — so the user sees masked values that represent real data and edits are not inadvertently blank.

**Warning signs:** Existing secrets for unchanged variables become empty after the modal is saved.

### Pitfall 6: Variable Regex Edge Cases

**What goes wrong:** The `{{var}}` regex matches things like `{{}}` (empty key) or `{{ with spaces }}`, producing keys that cannot match any variable.

**Why it happens:** Simple `\{\{([^}]+)\}\}` matches any non-`}` content, including spaces and empty strings.

**How to avoid:** Use `\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}` to match only valid identifier-style variable names. This aligns with what Postman supports and avoids false positives. Document this constraint.

**Warning signs:** Variables with spaces in their names cannot be resolved; highlight overlay triggers on `{{}}` literals.

---

## Code Examples

### Environment File Write (Rust)

```rust
// Source: mirrors collections/io.rs write_manifest pattern
pub fn save_environment(
    ws_dir: &Path,
    env_slug: &str,
    env: &EnvironmentFile,
) -> anyhow::Result<()> {
    let env_path = ws_dir.join("environments").join(format!("{}.json", env_slug));
    // Strip secret values before writing to workspace file (ENV-05)
    let sanitized = EnvironmentFile {
        name: env.name.clone(),
        variables: env.variables.iter().map(|v| {
            if v.secret {
                EnvironmentVariable { value: String::new(), ..v.clone() }
            } else {
                v.clone()
            }
        }).collect(),
    };
    write_manifest(&env_path, &sanitized)
}
```

### tauri-plugin-store Usage for Active Environment

```typescript
// src/stores/environmentStore.ts
import { load } from '@tauri-apps/plugin-store';

const getStore = async () => load('dispatch-prefs.json', { autoSave: true });

// Persist active env per workspace
const persistActiveEnv = async (workspaceId: string, slug: string | null) => {
  const store = await getStore();
  await store.set(`activeEnv:${workspaceId}`, slug);
};

const loadActiveEnv = async (workspaceId: string): Promise<string | null> => {
  const store = await getStore();
  return (await store.get<string | null>(`activeEnv:${workspaceId}`)) ?? null;
};
```

### Variable Tokenizer

```typescript
// src/utils/variables.ts
export type VariableToken =
  | { type: 'literal'; text: string }
  | { type: 'variable'; text: string; key: string; resolved: boolean };

export function tokenize(
  input: string,
  vars: Record<string, string>
): VariableToken[] {
  const tokens: VariableToken[] = [];
  const regex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
  let last = 0;
  for (const m of input.matchAll(regex)) {
    if (m.index > last) {
      tokens.push({ type: 'literal', text: input.slice(last, m.index) });
    }
    tokens.push({
      type: 'variable',
      text: m[0],
      key: m[1],
      resolved: m[1] in vars,
    });
    last = m.index + m[0].length;
  }
  if (last < input.length) {
    tokens.push({ type: 'literal', text: input.slice(last) });
  }
  return tokens;
}
```

---

## Runtime State Inventory

This is not a rename/refactor phase. No runtime state migration required.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| tauri-plugin-store | D-17: active env persistence | NOT in Cargo.toml yet | — | None — must be added in Wave 0 |
| @tauri-apps/plugin-store | D-17: JS bindings for store | NOT in package.json yet | — | None — must be added in Wave 0 |
| Vitest + jsdom + @testing-library/react | Phase tests | Present | vitest 4.1.1, jsdom 25 | — |

**Missing dependencies with no fallback:**
- `tauri-plugin-store` (Rust) and `@tauri-apps/plugin-store` (npm) — required for D-17 active environment persistence. Must be installed before implementing `environmentStore`.

**Missing dependencies with fallback:**
- None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 + @testing-library/react 16 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` |

All 9 existing tests pass. Test files are in `src/**/*.test.tsx`.

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENV-01 | Environment CRUD (create/edit/delete) | unit | `npm run test -- --reporter=verbose` | No — Wave 0 |
| ENV-02 | Active env selector in TopBar renders environments | unit | `npm run test` | No — Wave 0 |
| ENV-03 | VariableEditor renders key/value/secret columns, secret toggle masks value | unit | `npm run test` | No — Wave 0 |
| ENV-04 | Variable substitution in sendRequest resolves {{var}} to env value | unit | `npm run test` | No — Wave 0 |
| ENV-05 | save_environment writes `"value": ""` for secret variables | unit (Rust) | `cargo test -p dispatch --lib` | No — Wave 0 |
| ENV-06 | Unresolved variable count badge shows correct count | unit | `npm run test` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/features/environments/VariableEditor.test.tsx` — ENV-03: renders three columns, secret toggle shows/hides value
- [ ] `src/features/environments/EnvironmentModal.test.tsx` — ENV-01: create/rename/delete environment actions
- [ ] `src/components/layout/TopBar.test.tsx` (extend existing) — ENV-02: dropdown lists environments, "Manage Environments..." item present
- [ ] `src/utils/variables.test.ts` — ENV-04, ENV-06: tokenize, countUnresolved, substitute functions
- [ ] `src-tauri/src/environments/` (Rust unit tests in io.rs) — ENV-01, ENV-05: file written with empty secret values
- [ ] Add `tauri-plugin-store` to Cargo.toml and `@tauri-apps/plugin-store` to package.json

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| contenteditable for inline rich text input | CSS backdrop overlay on `<input>` | Stable pattern, no change | Use the overlay — contenteditable is not appropriate for URL inputs |
| Stronghold for secrets | tauri-plugin-secure-storage (Keychain) or plain file | Tauri v3 deprecation | D-09 already accounts for this: plain JSON file for this phase, Keychain reserved for OAuth |
| tauri-plugin-store v1 API (old `Store` constructor) | v2 API (`load(path, options)` from `@tauri-apps/plugin-store`) | tauri-plugin-store 2.x | Use v2 API; v1 patterns from old blog posts won't work |

**Deprecated/outdated:**
- `new Store('file.json')` (tauri-plugin-store v1): replaced by `load('file.json', options)` in v2.

---

## Open Questions

1. **tauri-plugin-store: `autoSave` vs manual `.save()` calls**
   - What we know: The v2 API supports `autoSave: true` which flushes after each `set()`.
   - What's unclear: Whether `autoSave` adds observable latency on macOS (disk write per env switch).
   - Recommendation: Use `autoSave: true` — the data is tiny (one string per workspace) and the convenience outweighs theoretical write latency. Change to manual `.save()` only if profiling shows a problem.

2. **Delete environment with secrets: cleanup responsibility**
   - What we know: D-04 says delete confirmation modal for environments with variables. The Rust command must also delete the secrets file for that environment.
   - What's unclear: Whether a single Rust command `delete_environment` should atomically delete both the workspace JSON and the secrets JSON, or whether the frontend calls two commands.
   - Recommendation: Single Rust command `delete_environment` deletes both files atomically. This prevents orphaned secret files and keeps the invariant: one Rust call, one logical operation.

3. **VariableEditor: load secret values in the modal**
   - What we know: When user opens the modal, they should see masked `•••` placeholders for secret values they previously saved (not empty fields).
   - What's unclear: Whether to call `load_secret_values` when the user clicks on an environment in the list, or when the modal first opens.
   - Recommendation: Call `load_secret_values` when the user selects an environment in the left pane. Keep the loaded secrets in local component state (not the global store) — they are transient edit state, not app state.

---

## Project Constraints (from CLAUDE.md)

- **HeroUI v2.7.11 pinned** — do not upgrade; npm latest resolves to v3 (Tailwind v4). Use `@heroui/react@2.7.11`.
- **Tailwind CSS v3** — required by HeroUI v2. Do not use v4 patterns.
- **tauri-plugin-http via Rust only for authenticated requests** — not applicable this phase (no GitHub API calls), but the constraint remains active.
- **tauri::async_runtime::spawn exclusively** — do not use `tokio::spawn` directly in any new async Tauri code.
- **git2 ops in spawn_blocking** — not applicable this phase (no git ops).
- **Secrets path:** `~/Library/Application Support/dev.dispatch.app/secrets/` — absolute, never relative to workspace. Enforced by SPECS.md and D-08.
- **specta-typescript@0.0.9** (not 0.0.10) — pinned in Cargo.toml; do not upgrade when adding new dependencies.
- **tauri-specta@2.0.0-rc.21 + specta@2.0.0-rc.22** — pinned versions; new Rust types added to environments module must derive `#[derive(Type)]` to register with tauri-specta.
- **Duration as u32** — any new Rust types passed over IPC must not use `u64` (specta maps to BigInt, unsupported in IPC bridge).
- **POST uses `text-blue-500` not `text-primary`** — primary is remapped to green; method colors already handled in UrlBar.tsx, no change needed.

---

## Sources

### Primary (HIGH confidence)
- Project codebase (read directly) — `KeyValueEditor.tsx`, `requestStore.ts`, `collectionStore.ts`, `collections/io.rs`, `collections/types.rs`, `commands/collections.rs`, `lib.rs`, `TopBar.tsx`, `UrlBar.tsx`, `Cargo.toml`, `package.json` — established patterns verified from source
- `SPECS.md` — canonical data model for environment file schema and secrets store path (HIGH)
- `04-CONTEXT.md` — all locked decisions (HIGH)

### Secondary (MEDIUM confidence)
- `STATE.md` — accumulated decisions, pinned versions, established patterns (HIGH — project-generated)
- `CLAUDE.md` — tech stack constraints and version pins (HIGH — project-defined)
- tauri-plugin-store v2 API pattern (MEDIUM — based on v2 release series API; implementation detail of `load()` call should be verified against installed package version during Wave 0)

### Tertiary (LOW confidence)
- None — all claims in this document are grounded in the project codebase or canonical project docs.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project except tauri-plugin-store (known addition from STATE.md)
- Architecture: HIGH — mirrors patterns already implemented in Phases 1-3; no new architectural paradigms
- Pitfalls: HIGH — derived from actual codebase reading (e.g., tauri-plugin-store absent from Cargo.toml confirmed by direct inspection)
- Variable highlighting pattern: MEDIUM — standard technique, verified conceptually, exact pixel values require runtime verification during implementation

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable project; no fast-moving external dependencies introduced)
