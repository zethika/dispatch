---
phase: 01-foundation
plan: 01
subsystem: ui
tags: [tauri, react, heroui, tailwindcss, typescript, vitest, tauri-specta, ipc]

requires: []
provides:
  - Tauri 2.x project scaffold with React + TypeScript frontend
  - HeroUI v2.7.11 component library with Tailwind v3 and green primary color (D-07)
  - Dark mode detection via prefers-color-scheme (D-06)
  - Rust backend with ping IPC command via tauri-specta typed bridge
  - Vitest test framework with jsdom and @testing-library/react
  - Working frontend build (vite build) and Rust compilation (cargo check)
affects: [02-layout-shell, all-subsequent-phases]

tech-stack:
  added:
    - "@heroui/react@2.7.11 (Tailwind v3 compatible UI components)"
    - "tailwindcss@^3.4.19 (utility CSS, required by HeroUI v2)"
    - "framer-motion@^12 (HeroUI peer dep, animations)"
    - "zustand@^5.0.12 (global UI state)"
    - "@tanstack/react-query@^5.95.0 (async command state)"
    - "@tauri-apps/api@^2 (core Tauri JS bindings: invoke, event)"
    - "vitest@^4 + @testing-library/react (unit test framework)"
    - "tauri-specta@2.0.0-rc.21 (typed IPC bridge, TS codegen)"
    - "specta@=2.0.0-rc.22 (type system)"
    - "specta-typescript@0.0.9 (TS export target)"
  patterns:
    - "IPC commands: #[tauri::command] + #[specta::specta] in commands/mod.rs"
    - "Typed IPC builder: Builder<tauri::Wry>::new().commands(collect_commands![...])"
    - "TS bindings auto-exported to src/bindings.ts (debug builds only)"
    - "Tailwind class-based dark mode: document.documentElement.classList.toggle('dark', isDark)"
    - "HeroUI provider wraps entire app in main.tsx"

key-files:
  created:
    - src/main.tsx
    - src/App.tsx
    - src/App.test.tsx
    - src/index.css
    - src/api/system.ts
    - src/test/setup.ts
    - src/vite-env.d.ts
    - src-tauri/src/main.rs
    - src-tauri/src/lib.rs
    - src-tauri/src/commands/mod.rs
    - src-tauri/Cargo.toml
    - src-tauri/tauri.conf.json
    - src-tauri/capabilities/default.json
    - tailwind.config.js
    - postcss.config.js
    - package.json
    - tsconfig.json
    - vitest.config.ts
  modified:
    - .gitignore (added src/bindings.ts entry)

key-decisions:
  - "Pin @heroui/react@2.7.11 — latest tag now resolves to v3.0.1 (Tailwind v4 incompatible with v3 constraint)"
  - "specta-typescript@0.0.9 (not 0.0.10) — version conflict with tauri-specta@rc.21 which requires specta@rc.22"
  - "specta@=2.0.0-rc.22 pinned directly to resolve transitive dep conflict"
  - "Green primary color (#17c964) per D-07 — HeroUI success green repurposed as primary semantic token"
  - "Window: 1280x800 default, 1024x640 minimum (supports three-panel layout on 13-inch screens)"

patterns-established:
  - "IPC pattern: src/api/*.ts files wrap Rust commands via invoke(); always typed with generics"
  - "Commands module: all Tauri commands in src-tauri/src/commands/mod.rs (or submodules)"
  - "lib.rs owns builder setup; main.rs is a one-liner calling dispatch_lib::run()"
  - "Tailwind purge: always include node_modules/@heroui/theme/dist in content paths"

requirements-completed: [APP-01, APP-02, APP-03]

duration: 6min
completed: 2026-03-24
---

# Phase 1 Plan 1: Scaffold Tauri Project with HeroUI + Tailwind + IPC Summary

**Tauri 2.x app scaffolded with HeroUI v2.7.11 (green primary via D-07), Tailwind v3, typed IPC ping via tauri-specta, dark mode detection, and passing vitest test suite**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-24T07:25:59Z
- **Completed:** 2026-03-24T07:32:05Z
- **Tasks:** 2
- **Files modified:** 19 created, 1 modified

## Accomplishments

- Tauri 2.x project fully scaffolded with React + TypeScript and all production dependencies installed
- HeroUI v2.7.11 configured with Tailwind v3 and green primary color (#17c964) as per D-07 brand identity
- Rust backend with ping IPC command wired via tauri-specta for typed IPC bridge (TS bindings auto-generated on debug build)
- Both `cargo check` (Rust) and `vite build` (frontend) pass — project is ready for feature development
- 2 vitest tests pass: Dispatch heading renders and HeroUI Button with accessible role

## Task Commits

1. **Task 1: Scaffold Tauri project and install all dependencies** - `ca7c70e` (feat)
2. **Task 2: Verify IPC round-trip and HMR with smoke test** - `c66c92e` (test)

**Plan metadata:** (docs commit hash — see below)

## Files Created/Modified

- `src/main.tsx` - React entry with HeroUIProvider and prefers-color-scheme dark mode detection
- `src/App.tsx` - Placeholder app calling ping IPC and rendering HeroUI Button with color=primary (green)
- `src/App.test.tsx` - Vitest smoke tests for Dispatch heading and HeroUI button
- `src/api/system.ts` - IPC wrapper: invoke('ping') typed as Promise<string>
- `src/index.css` - Tailwind directives (@tailwind base/components/utilities)
- `src/test/setup.ts` - @testing-library/jest-dom/vitest setup
- `src-tauri/src/commands/mod.rs` - ping() command with #[tauri::command] + #[specta::specta]
- `src-tauri/src/lib.rs` - Builder with collect_commands, TS bindings export (debug only)
- `src-tauri/src/main.rs` - One-liner entry: dispatch_lib::run()
- `src-tauri/Cargo.toml` - Package renamed to dispatch, tauri-specta + specta added
- `src-tauri/tauri.conf.json` - Identifier dev.dispatch.app, window 1280x800, min 1024x640
- `src-tauri/capabilities/default.json` - core:default + core:window:allow-start-dragging
- `tailwind.config.js` - Tailwind v3 + HeroUI plugin + green primary color theme
- `postcss.config.js` - tailwindcss + autoprefixer
- `vitest.config.ts` - jsdom environment + setupFiles + src/**/*.test.{ts,tsx} include
- `package.json` - All dependencies with HeroUI pinned at 2.7.11 and tailwindcss at ^3.4.19
- `.gitignore` - Added src/bindings.ts (auto-generated by tauri-specta)

## Decisions Made

- **Pin @heroui/react@2.7.11**: The npm `latest` tag now resolves to v3.0.1 (HeroUI v3 stable as of 2026-03). v3 requires Tailwind v4 and has breaking API changes. Pin to last v2 compatible with Tailwind v3.
- **Green primary color #17c964**: Used HeroUI's built-in "success" green repurposed as the `primary` semantic slot per D-07. `color="primary"` on any HeroUI component renders green.
- **specta-typescript@0.0.9 (not 0.0.10)**: Version conflict required pinning to 0.0.9 (see deviations).
- **Window 1280x800 / min 1024x640**: Appropriate for three-panel layout on 13-inch MacBook Air (260px sidebar + 500px+ request editor + padding).
- **IPC and HMR are manual verification only**: Cannot be automated in vitest — require a running Tauri process. Documented in SUMMARY for verifier.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] specta-typescript pinned to 0.0.9 instead of 0.0.10**
- **Found during:** Task 1 (cargo check)
- **Issue:** `tauri-specta@2.0.0-rc.21` requires `specta@=rc.22`, but `specta-typescript@0.0.10` requires `specta@=rc.23`. Cargo version resolution fails — the two crates cannot coexist with their respective specta pins.
- **Fix:** Use `specta-typescript@0.0.9` (which requires `specta@rc.22`, consistent with tauri-specta) and add `specta@=2.0.0-rc.22` as a direct dependency. The `tauri-specta@typescript` feature already brings in the right specta-typescript version transitively (0.0.9).
- **Files modified:** `src-tauri/Cargo.toml`
- **Verification:** `cargo check` exits 0
- **Committed in:** `ca7c70e` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — version conflict)
**Impact on plan:** specta-typescript@0.0.9 is functionally equivalent to 0.0.10 for Phase 1 scope (only the TypeScript type exporter, no API differences in the `Typescript::default()` usage). No scope creep, no behavior change.

## Issues Encountered

- `npm create tauri-app` requires an interactive terminal — scaffolded to `/tmp/dispatch-scaffold` using `create-tauri-app` CLI flags (`-y --identifier --template`) then copied to dispatch/. This is the expected workaround when running in a non-TTY environment.

## User Setup Required

None — no external service configuration required.

## Manual Verification Required

The following items require manual verification via `npm run tauri dev`:

- **IPC ping round-trip**: Launch the app and confirm the page shows "IPC ping result: pong" (not "loading...")
- **HMR**: Edit `<h1>` text in App.tsx while `tauri dev` is running — change should reflect in the window without a full app restart

These cannot be automated in vitest because they require a running Tauri webview process.

## Next Phase Readiness

- Tauri project is fully scaffolded and both builds pass — ready for Plan 02 (three-panel layout shell)
- HeroUI provider configured, Tailwind v3 active, dark mode detection wired — all CSS foundation in place
- IPC pattern established (invoke → Rust command → typed return) — ready for HTTP engine (Phase 3) and git commands (Phase 6)
- Vitest framework operational — subsequent plans can add unit tests immediately

---
*Phase: 01-foundation*
*Completed: 2026-03-24*
