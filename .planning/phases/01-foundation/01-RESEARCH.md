# Phase 1: Foundation - Research

**Researched:** 2026-03-23
**Domain:** Tauri 2.x scaffolding, React/HeroUI app shell, IPC round-trip, three-panel layout
**Confidence:** HIGH (all stack decisions verified against npm registry and cargo search as of research date)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Panel Layout**
- D-01: Fixed sidebar width (~260px), not resizable or collapsible
- D-02: Vertical split for right panel — request editor on top, response viewer on bottom
- D-03: Resizable drag handle between request editor and response viewer panels

**First-Launch State**
- D-04: First launch shows a blank request editor immediately — GET method selected, URL input focused, ready to type
- D-05: Empty sidebar shows "No collections yet" hint text with subtle prompt to create a collection or connect a repo

**Theme / Appearance**
- D-06: Support both dark and light mode, following macOS system preference (via `prefers-color-scheme`)
- D-07: Green accent color for primary actions and brand identity. Neutral/gray tones for chrome.

**Top Bar Pre-Login State**
- D-08: Workspace switcher shows a "Connect GitHub" button before login
- D-09: Environment selector shows "No Environment" placeholder dropdown before any environments exist
- D-10: Sync status shows a "Local only" badge before GitHub login

### Claude's Discretion
- Minimum window size (suggested ~1024x600 range)
- Scroll behavior — each panel scrolls independently, Claude decides details

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| APP-01 | User can send a request within 60 seconds of first launch, before any GitHub login | Blank request editor on first launch (D-04), no auth gate — pure frontend shell with no Rust business logic needed yet |
| APP-02 | App uses a three-panel layout: sidebar (tree), request editor (top-right), response viewer (bottom-right) | Three-panel CSS layout with fixed sidebar (D-01) + vertical split (D-02) + resizable handle (D-03) |
| APP-03 | Top bar shows workspace switcher, environment selector, and sync status | Top bar component using HeroUI Dropdown + placeholder states (D-08, D-09, D-10) |
</phase_requirements>

---

## Summary

Phase 1 establishes the Tauri project from scratch on a greenfield repo. The working directory contains only `CLAUDE.md` and `SPECS.md` — no scaffold exists yet. The deliverables are: a running Tauri 2.x app with a three-panel layout shell (sidebar + request editor + response viewer + top bar), a verified IPC ping round-trip from React to Rust, and HeroUI components rendering correctly with Tailwind CSS.

**Critical finding since prior stack research (2026-03-23):** HeroUI v3 has shipped as stable (`latest` tag on npm now points to `3.0.1`). However, HeroUI v3 requires `react >= 19.0.0` and `tailwindcss >= 4.0.0` as peer dependencies. The locked project decision is to use "HeroUI v2 stable + Tailwind CSS v3." That decision remains valid — but **`@heroui/react@2.8.0` and later silently require Tailwind v4** via their `@heroui/theme` dependency. The last HeroUI v2 version compatible with Tailwind v3 is **`@heroui/react@2.7.11`** (published 2026-03-21, uses `@heroui/theme@2.4.17` which requires `tailwindcss >= 3.4.0`). Install `@heroui/react@2.7.11` explicitly — do not install `@heroui/react@latest` or it will resolve to v3.0.1.

**Primary recommendation:** Scaffold with `npm create tauri-app@latest`, install `@heroui/react@2.7.11` + `tailwindcss@3`, build the three-panel shell as pure React layout (no Rust logic yet except the ping command), and verify HMR works before closing the phase.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tauri | 2.10.3 | App shell (Rust backend + WKWebView) | Current stable. Verified via `cargo search tauri` 2026-03-23. |
| Rust | stable 1.91.1 | Backend runtime (aarch64-apple-darwin) | Installed and verified. This is the machine's active toolchain. |
| React | 19.2.4 | Frontend UI tree | Latest stable. Verified via `npm show react@latest`. |
| TypeScript | 5.x | Type-safe frontend | Bundled by create-tauri-app react-ts template. |
| Vite | 8.0.2 | Dev server + build | Verified via `npm show vite@latest`. Official Tauri recommendation. |

### Frontend Libraries

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| @heroui/react | **2.7.11** (pin exactly) | Component library | Last v2 with Tailwind v3 compatibility. Do NOT use `latest` (resolves to v3.0.1). |
| tailwindcss | 3.4.19 (v3 family) | Utility CSS | Required by HeroUI v2 via @heroui/theme. Pin to `tailwindcss@3`. |
| framer-motion | >= 11.5.6 | Animation (HeroUI peer dep) | HeroUI 2.7.11 accepts `>=11.5.6 || >=12.0.0-alpha.1`. Use `framer-motion@latest` (12.x). |
| zustand | 5.0.12 | Global UI state | Phase 1 uses it for UI state (active panel, window size). Verified via npm. |
| @tanstack/react-query | 5.95.0 | Async command state | Not heavily used in Phase 1 but set up for future phases. |
| @tauri-apps/api | 2.10.1 | Core Tauri JS bindings | `invoke`, `event` — used for ping command verification. |

### Backend Crates (Phase 1 subset)

| Crate | Version | Purpose | Notes |
|-------|---------|---------|-------|
| tauri | 2.10.3 | App shell | Scaffolded automatically. |
| serde / serde_json | 1.x | Command serialization | Required by any typed IPC command. Add in Phase 1. |
| tauri-specta | 2.0.0-rc.21 | TS type generation from Rust | Add now — establishes the typed IPC pattern for all later phases. Verified via `cargo search`. |
| specta-typescript | 0.0.10 | specta TS export target | Companion to tauri-specta. Verified via `cargo search`. |

### Development Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| @tauri-apps/cli | 2.10.1 | Tauri dev/build commands | Already installed via npx (`npx @tauri-apps/cli`). |
| create-tauri-app | 4.6.2 | Project scaffolding | Verified via npm. Use `npm create tauri-app@latest`. |
| vitest | 4.1.0 | Frontend unit tests | Verified via npm. Pairs with Vite 8. |
| ESLint 9 + typescript-eslint | Latest | Linting | Use flat config `eslint.config.js` — `.eslintrc` is deprecated in ESLint 9. |
| prettier + prettier-plugin-tailwindcss | Latest | Formatting + class sorting | Tailwind class order enforced at format time. |

### Version Compatibility Matrix

| Package | Compatible With | Verified |
|---------|-----------------|---------|
| @heroui/react@2.7.11 | tailwindcss@3.4.x | YES — uses @heroui/theme@2.4.17 (requires `>=3.4.0`) |
| @heroui/react@2.8.0+ | tailwindcss@4.x only | INCOMPATIBLE with tailwind v3 (uses theme@2.4.18+) |
| @heroui/react@3.0.1 | tailwindcss@4.x, react@19 | HeroUI v3 stable — NOT for this project (different API) |
| tauri 2.10.3 | tauri-specta 2.x RC | Both verified current via cargo search |
| react 19.2.4 | zustand 5.x, @tanstack/react-query 5.x | Both support React 19 |

### Installation Commands

```bash
# From the parent directory of the dispatch repo
npm create tauri-app@latest dispatch -- --template react-ts

cd dispatch

# Frontend: UI — pin HeroUI v2, use tailwind v3
npm install @heroui/react@2.7.11 framer-motion
npm install -D tailwindcss@3 autoprefixer postcss

# Frontend: state + async
npm install zustand @tanstack/react-query

# Frontend: Tauri APIs
npm install @tauri-apps/api

# Dev tooling
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/user-event
npm install -D prettier eslint typescript-eslint prettier-plugin-tailwindcss

# Rust dependencies to add to src-tauri/Cargo.toml
# serde = { version = "1", features = ["derive"] }
# serde_json = "1"
# tauri-specta = { version = "2", features = ["derive", "typescript"] }
# specta-typescript = "0.0.10"
```

---

## Architecture Patterns

### Recommended Project Structure (Phase 1 scope)

```
dispatch/
├── src/
│   ├── main.tsx                    # React entry — mounts <App /> into #root
│   ├── App.tsx                     # Root layout: TopBar + Sidebar + RightPanel
│   ├── components/
│   │   └── layout/
│   │       ├── TopBar.tsx          # Workspace switcher + env selector + sync badge
│   │       ├── Sidebar.tsx         # Fixed 260px panel, "No collections yet" hint
│   │       ├── RightPanel.tsx      # Vertical split container with drag handle
│   │       ├── RequestEditor.tsx   # Top-right: GET method + URL input (placeholder)
│   │       └── ResponseViewer.tsx  # Bottom-right: empty state placeholder
│   ├── stores/
│   │   └── uiStore.ts             # Panel split ratio (persisted in memory for now)
│   └── api/
│       └── system.ts              # invoke('ping') wrapper — IPC round-trip test
│
└── src-tauri/
    ├── tauri.conf.json             # App identifier, window size, capabilities
    ├── capabilities/
    │   └── default.json            # Tauri v2 required: declare allowed commands
    └── src/
        ├── main.rs                 # Desktop entry — calls lib::run()
        ├── lib.rs                  # Builder: register commands, manage state
        └── commands/
            └── mod.rs              # ping command for IPC validation
```

### Pattern 1: Tauri v2 Command Registration

**What:** Every Rust function callable from the frontend must be declared in `capabilities/default.json` AND registered in the builder. Both are required in Tauri v2 — missing either causes a silent failure (invoke rejects with permission error).

**Example:**
```rust
// src-tauri/src/commands/mod.rs
#[tauri::command]
pub fn ping() -> String {
    "pong".to_string()
}

// src-tauri/src/lib.rs
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![commands::ping])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```json
// src-tauri/capabilities/default.json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capability",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:allow-start-dragging"
  ]
}
```

```typescript
// src/api/system.ts
import { invoke } from '@tauri-apps/api/core';

export async function ping(): Promise<string> {
  return invoke<string>('ping');
}
```

### Pattern 2: HeroUI v2 Provider Setup

**What:** HeroUI v2 requires wrapping the app in `<HeroUIProvider>`. Without it, components render but theme tokens are not applied — colors and spacing look wrong.

**Example:**
```tsx
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HeroUIProvider } from '@heroui/react';
import App from './App';
import './index.css'; // must import tailwind directives

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HeroUIProvider>
      <App />
    </HeroUIProvider>
  </React.StrictMode>
);
```

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Pattern 3: Tailwind v3 + HeroUI v2 Config

**What:** HeroUI v2 extends the Tailwind config. The `tailwind.config.js` must include HeroUI's plugin and content paths, or the HeroUI component styles will not be emitted in the build output.

**Example:**
```javascript
// tailwind.config.js
import { heroui } from '@heroui/react';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',   // HeroUI uses class-based dark mode
  theme: {
    extend: {},
  },
  plugins: [heroui()],
};
```

**Important:** HeroUI v2 uses `darkMode: 'class'` — a class on `<html>` element toggles dark mode. This is different from `darkMode: 'media'`. To respect system preference (D-06), apply or remove the `dark` class on `<html>` by reading `prefers-color-scheme` via a media query listener in `main.tsx`.

### Pattern 4: System Dark Mode Detection

**What:** D-06 requires following macOS system preference. In React, this requires detecting the OS-level `prefers-color-scheme` and applying the `dark` class to `<html>`.

**Example:**
```tsx
// src/main.tsx — add before render
const applyTheme = () => {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', isDark);
};

applyTheme();
window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', applyTheme);
```

### Pattern 5: Resizable Panel Split (D-03)

**What:** The drag handle between request editor and response viewer allows the user to adjust the split ratio. Implement with a draggable divider that updates a CSS variable or state value controlling the top panel's flex-basis.

**Approach:** Pure CSS + mouse event handler — no library needed for Phase 1. Zustand stores the ratio. CSS `grid-template-rows` or flex with explicit heights.

```tsx
// RightPanel.tsx sketch
const [splitRatio, setSplitRatio] = useState(0.5); // 50/50 default
// On mouse drag: update splitRatio
// Apply: style={{ gridTemplateRows: `${splitRatio * 100}% 4px 1fr` }}
```

**Do not hand-roll a complex drag library.** For Phase 1, a simple mouse event approach is sufficient. Phase 2+ can upgrade to `react-resizable-panels` if needed.

### Anti-Patterns to Avoid

- **Missing `capabilities/default.json` entry:** Tauri v2 denies all invoke() calls not explicitly permitted. Unlike v1, there is no auto-allow. The error message in the browser console is `IPC call not permitted` — easy to confuse with a code error.
- **Installing `@heroui/react@latest`:** Resolves to v3.0.1 (Tailwind v4 + React 19 required API changes). Pin to `@heroui/react@2.7.11`.
- **Using `darkMode: 'media'` in tailwind config:** HeroUI v2 requires `darkMode: 'class'`. Media mode won't apply HeroUI dark tokens correctly.
- **Calling `tokio::spawn()` in Tauri v2:** Panics with "no reactor running." Use `tauri::async_runtime::spawn()` exclusively. Phase 1's ping command is sync so this is not yet triggered — but the pattern must be established correctly in `lib.rs` for all future phases.
- **Putting `main.rs` logic in `lib.rs`:** `main.rs` for desktop is a one-liner calling `lib::run()`. All builder setup belongs in `lib.rs` so it can be shared with mobile targets and tests.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Typed IPC commands | Manual JSON `.d.ts` files | tauri-specta | Auto-generates TS types from `#[tauri::command]` — eliminates stringly-typed invoke() calls |
| HeroUI Tailwind integration | Custom CSS component tokens | `heroui()` Tailwind plugin | HeroUI's plugin emits all design tokens; custom duplication creates drift |
| Dark mode toggle | Custom CSS variables + toggle logic | HeroUI dark class strategy + system preference listener | HeroUI handles all component dark variants; just apply the `dark` class |
| Window drag region | Custom titlebar drag logic | `data-tauri-drag-region` attribute | Tauri's built-in drag region — no JS event handler needed |

**Key insight:** Phase 1 is scaffolding + layout. The most expensive mistake is getting stuck in configuration. Use `create-tauri-app` for correct initial config, then layer in HeroUI and the layout — do not attempt to write a `tauri.conf.json` from scratch.

---

## Common Pitfalls

### Pitfall 1: HeroUI v2 Version Drift

**What goes wrong:** Installing `@heroui/react` without a version pin resolves to v3.0.1 (stable as of 2026-03-21). v3 has a breaking API change (no `<HeroUIProvider>` wrapper needed), requires Tailwind v4 syntax, and requires `react@>=19.0.0` strictly. The app will compile but HeroUI components will render unstyled or throw runtime errors.

**Why it happens:** The npm `latest` tag now points to v3.0.1. The STACK.md research assumed v3 was still beta — it graduated to stable after the research was written.

**How to avoid:** Pin `@heroui/react@2.7.11` in `package.json`. Also pin `tailwindcss@3` (use `"tailwindcss": "^3.4.19"`). Do not run `npm update` without reviewing HeroUI version drift.

**Warning signs:** `Cannot find module '@heroui/react' exported 'HeroUIProvider'`, unstyled components rendering, peer dep warnings about tailwindcss version.

### Pitfall 2: Tauri v2 Capabilities Not Configured

**What goes wrong:** `invoke('ping')` in the frontend throws `IPC call not permitted` or returns a generic error. The Rust command compiles fine. The issue is that Tauri v2 requires explicit command permissions in `capabilities/default.json`.

**Why it happens:** Every v1-era tutorial and template omits capabilities because v1 allowed all commands by default. Tauri v2 changed this completely. The scaffolded template from `create-tauri-app` includes a starter `capabilities/default.json` — but adding new commands requires manually adding permission entries.

**How to avoid:** After registering a new `#[tauri::command]` in the handler, always add its permission to `capabilities/default.json`. The format is `"core:allow-{command-name}"` for built-in capabilities or the custom command must be listed under `permissions`.

**Warning signs:** `invoke()` returns an error promise instead of the expected value; no Rust-side panic or log message.

### Pitfall 3: Tailwind Content Paths Missing HeroUI

**What goes wrong:** HeroUI components render in the correct layout but all styling is stripped in production builds (and sometimes in dev if Vite's Tailwind integration isn't watching the right paths). Buttons appear as unstyled divs.

**Why it happens:** Tailwind v3 purges unused classes. HeroUI components live in `node_modules/@heroui/theme/dist/` — outside the default `src/**` content glob. Tailwind doesn't see those class names and strips them.

**How to avoid:** Include `./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}` in the `content` array of `tailwind.config.js`. This is documented in HeroUI v2 setup docs.

**Warning signs:** Components look correct in Storybook or when Tailwind is configured globally, but the running app shows unstyled HeroUI components.

### Pitfall 4: `tauri dev` HMR Not Working for Rust Changes

**What goes wrong:** Frontend HMR (React component changes) works fine. Rust source changes require a full restart — this is expected. But developers expect Rust changes to hot-reload like frontend changes do.

**Why it happens:** Tauri's `tauri dev` watches `src/` for frontend changes (Vite HMR) and rebuilds Rust on Rust source changes — but Rust compilation takes 5-30 seconds and the full app restarts. This is not a bug; it's the expected behavior.

**How to avoid:** The success criterion for Phase 1 is that *frontend* HMR works (React component changes reflect without full reload). Rust changes requiring a restart is correct. Optionally install `cargo-watch` for faster Rust iteration in isolated testing.

**Warning signs:** No — this is expected behavior. Document it so the verifier doesn't fail the phase on it.

### Pitfall 5: Window Size Too Small for Three-Panel Layout

**What goes wrong:** At small window sizes, the three-panel layout collapses — sidebar clips the request editor, or HeroUI Dropdown components overflow the viewport. This makes the app unusable on 13" MacBook Airs at default window size.

**Why it happens:** No minimum window size is set in `tauri.conf.json`. The WebView renders the full layout at whatever size the OS gives it.

**How to avoid:** Set `minWidth` and `minHeight` in `tauri.conf.json` `windows` config. Based on the layout (260px sidebar + request editor min ~500px + padding), a minimum of **1024 × 640** is appropriate for Claude's discretion decision. Set `width: 1280`, `height: 800` as the default launch size.

```json
// src-tauri/tauri.conf.json (windows section)
"windows": [{
  "label": "main",
  "title": "Dispatch",
  "width": 1280,
  "height": 800,
  "minWidth": 1024,
  "minHeight": 640,
  "decorations": false,
  "titleBarStyle": "Overlay"
}]
```

Note: `titleBarStyle: "Overlay"` (macOS traffic light buttons) requires `decorations: false` and a `data-tauri-drag-region` element in the React layout for window dragging.

---

## Code Examples

### Ping command (Rust)

```rust
// Source: https://v2.tauri.app/develop/calling-rust/
// src-tauri/src/commands/mod.rs
#[tauri::command]
pub fn ping() -> String {
    "pong".to_string()
}
```

### HeroUI v2 provider setup

```tsx
// src/main.tsx
import { HeroUIProvider } from '@heroui/react';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HeroUIProvider>
      <main className="h-screen w-screen">
        <App />
      </main>
    </HeroUIProvider>
  </React.StrictMode>
);
```

### Three-panel layout skeleton

```tsx
// src/App.tsx
export default function App() {
  return (
    <div className="flex flex-col h-screen w-screen bg-background text-foreground overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <RightPanel />
      </div>
    </div>
  );
}
```

### tauri-specta setup for typed IPC (establish in Phase 1)

```rust
// src-tauri/src/lib.rs
use tauri_specta::{collect_commands, Builder};
use specta_typescript::Typescript;

pub fn run() {
    let specta_builder = Builder::<tauri::Wry>::new()
        .commands(collect_commands![commands::ping])
        .export(Typescript::default(), "../src/bindings.ts")
        .expect("Failed to export TS bindings");

    tauri::Builder::default()
        .invoke_handler(specta_builder.invoke_handler())
        .setup(move |app| {
            specta_builder.mount_events(app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HeroUI v3 = beta (avoid) | HeroUI v3 = stable (latest) | 2026-03 | CRITICAL: must pin to `@heroui/react@2.7.11` for Tailwind v3 compat |
| tauri v1: all commands allowed | tauri v2: explicit capabilities JSON | 2023 (Tauri 2.0) | Must declare commands in capabilities/default.json |
| Tailwind v3 everywhere | Tailwind v4 for new projects | 2025 | HeroUI v2 still requires v3; do not upgrade to v4 |
| tauri-specta RC status | tauri-specta 2.0.0-rc.21 (production-ready) | ongoing | Pin version; use it from Phase 1 to establish typed IPC pattern |

---

## Environment Availability

| Dependency | Required By | Available | Version | Notes |
|------------|------------|-----------|---------|-------|
| Rust (stable) | Tauri backend | YES | 1.91.1 (aarch64-apple-darwin) | Active default toolchain |
| Node.js | npm / Vite / create-tauri-app | YES | v24.3.0 | Via nvm |
| npm | Package management | YES | 11.4.2 | |
| Xcode CLT | macOS builds (clang, SDK) | YES | 17.0.0 (clang-1700.0.13.5) | SDK at `/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk` |
| @tauri-apps/cli | `npm run tauri dev` | YES | 2.10.1 | Available via npx |
| create-tauri-app | Project scaffolding | YES | 4.6.2 | Available via npm create |

**Missing dependencies with no fallback:** None — all required tools are available.

**Note:** No existing `src/` or `src-tauri/` directory exists in the repo. Phase 1 creates the project from scratch using `npm create tauri-app@latest`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | `vitest.config.ts` — Wave 0 task |
| Quick run command | `npm run test` |
| Full suite command | `npm run test -- --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| APP-01 | App renders without auth gate — blank request editor present | unit | `npm run test -- src/components/layout/RequestEditor.test.tsx` | Wave 0 |
| APP-02 | Three-panel layout renders: sidebar + request editor + response viewer | unit | `npm run test -- src/App.test.tsx` | Wave 0 |
| APP-03 | Top bar renders workspace switcher + env selector + sync badge | unit | `npm run test -- src/components/layout/TopBar.test.tsx` | Wave 0 |
| IPC ping | `invoke('ping')` returns `'pong'` | manual/smoke | `npm run tauri dev` + browser console | N/A |
| HMR | Frontend change reflects without full reload | manual | Edit a component in dev mode | N/A |

**IPC ping and HMR are manual verification only** — they require a running Tauri process and cannot be automated in vitest without a full Tauri test harness (not needed for Phase 1).

### Sampling Rate

- **Per task commit:** `npm run test -- --run` (fast, headless)
- **Per wave merge:** `npm run test -- --run` (full suite)
- **Phase gate:** All tests green + manual IPC ping confirmed + manual HMR confirmed before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` — vitest configuration with jsdom environment
- [ ] `src/App.test.tsx` — three-panel layout structure test (REQ APP-02)
- [ ] `src/components/layout/TopBar.test.tsx` — top bar elements test (REQ APP-03)
- [ ] `src/components/layout/RequestEditor.test.tsx` — blank editor on launch test (REQ APP-01)
- [ ] `src/test/setup.ts` — @testing-library/jest-dom matchers setup

---

## Open Questions

1. **tauri-specta export path during dev**
   - What we know: tauri-specta exports TypeScript bindings to a file path specified at build time. In `tauri dev` mode the export runs on every Rust rebuild.
   - What's unclear: Whether the export to `../src/bindings.ts` works correctly from the Tauri dev context or if it needs a conditional (dev vs. production).
   - Recommendation: Export unconditionally in dev; add a `.gitignore` entry for `src/bindings.ts` since it's generated. Verify the file updates on Rust rebuild during dev.

2. **Window traffic light buttons with `decorations: false`**
   - What we know: `titleBarStyle: "Overlay"` + `decorations: false` gives macOS-native traffic light buttons floating over the custom top bar.
   - What's unclear: Exact padding needed in `TopBar.tsx` to avoid the traffic lights overlapping the workspace switcher button.
   - Recommendation: Reserve ~80px left padding in the top bar for traffic lights. Can be tuned during implementation.

---

## Sources

### Primary (HIGH confidence)

- `cargo search tauri` — Tauri 2.10.3 confirmed current (2026-03-23)
- `npm show @heroui/react dist-tags` — confirmed v3.0.1 is now `latest` (researched 2026-03-23)
- `npm show @heroui/theme@2.4.17 peerDependencies` — confirmed `tailwindcss >= 3.4.0` (last v2 Tailwind v3 compatible theme)
- `npm show @heroui/theme@2.4.18 peerDependencies` — confirmed `tailwindcss >= 4.0.0` starts here
- `npm show @heroui/react@2.7.11 dependencies` — confirmed uses `@heroui/theme@2.4.17`
- `npm show @heroui/react@2.8.0 dependencies` — confirmed uses `@heroui/theme@2.4.18` (Tailwind v4 boundary)
- `cargo search tauri-specta` — 2.0.0-rc.21 confirmed current
- `cargo search specta-typescript` — 0.0.10 confirmed current
- `rustup show` — Rust 1.91.1 stable aarch64-apple-darwin confirmed
- `node --version` / `npm --version` — Node 24.3.0 / npm 11.4.2 confirmed
- `npx @tauri-apps/cli --version` — 2.10.1 confirmed
- https://v2.tauri.app/develop/calling-rust/ — Tauri v2 IPC command pattern
- https://v2.tauri.app/security/capabilities/ — Tauri v2 capabilities permission system

### Secondary (MEDIUM confidence)

- `.planning/research/STACK.md` — prior stack research (note: HeroUI v3 stable status is a new finding)
- `.planning/research/ARCHITECTURE.md` — IPC patterns, project structure
- `.planning/research/PITFALLS.md` — Tauri v2 anti-patterns

### Tertiary (LOW confidence)

- None for Phase 1 scope.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified via npm registry and cargo search on 2026-03-23
- Architecture: HIGH — based on official Tauri v2 docs and verified project structure from prior research
- Pitfalls: HIGH for HeroUI version drift (verified via npm), HIGH for Tauri v2 capabilities (official docs), MEDIUM for window title bar sizing

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (30 days for stable packages, but watch for HeroUI v2.8.x if pinning is relaxed)

**Critical validity note:** The HeroUI v3 stable release is the most important finding of this research pass. The prior STACK.md was written when v3 was beta. Any agent implementing Phase 1 must pin `@heroui/react@2.7.11` explicitly. This pin should remain until the project intentionally migrates to HeroUI v3.
