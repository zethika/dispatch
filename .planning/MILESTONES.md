# Milestones

## v1.0 MVP (Shipped: 2026-03-30)

**Phases completed:** 8 phases, 21 plans, 33 tasks

**Key accomplishments:**

- Tauri 2.x app scaffolded with HeroUI v2.7.11 (green primary via D-07), Tailwind v3, typed IPC ping via tauri-specta, dark mode detection, and passing vitest test suite
- Three-panel Tauri app shell with HeroUI TopBar (Connect GitHub / No Environment / Local only), 260px Sidebar (empty state), and resizable RightPanel (GET request editor + response viewer) — 9 tests passing
- File-per-request Rust CRUD engine with slugify, path traversal defense, 19 unit tests, 9 Tauri commands, and a fully typed TypeScript data layer (types, API wrappers, Zustand store)
- Interactive sidebar tree with context menus, inline rename, delete modals, and HTTP method badges — all 13 visual verification items passed
- reqwest HTTP execution engine in Rust with send_request/load_request/save_request IPC commands, HttpResponse type across the bridge, and Zustand requestStore with four-state ResponseState discriminated union
- Full request editor with method dropdown, tabbed params/headers/body/auth editors, and debounced auto-save wired to requestStore and collectionStore
- CSS tokenizer-based JSON syntax highlighting with four-state response viewer (idle, loading, success with status bar + Body/Headers tabs, error with red panel) wired to requestStore
- One-liner:
- TopBar
- {{variable}} substitution wired into sendRequest for all fields, with orange/red CSS overlay highlighting and unresolved count badge in UrlBar
- GitHub OAuth device flow + macOS Keychain token storage + git2 workspace clone via IPC commands, tokens never crossing the IPC bridge
- GitHub device flow LoginModal + RepoBrowserModal with authStore (loginModalOpen D-11), workspaceStore, API wrappers, and sonner toast system
- WorkspaceSwitcher sidebar dropdown, TopBar auth state swap with avatar and session expiry toast, DisconnectConfirmModal, and workspace switch wiring across all stores
- One-liner:
- One-liner:
- One-liner:
- Offline chip (CloudOffIcon + 'Offline' label), neutral transition toasts, focus-pull via onFocusChanged, and WorkspaceSwitcher gray dot — completing the 6-state frontend sync experience.
- Rust layer:
- One-liner:
- One-liner:

---
