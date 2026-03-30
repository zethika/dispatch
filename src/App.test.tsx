import { render, screen } from '@testing-library/react';
import { HeroUIProvider } from '@heroui/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue('pong'),
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    onFocusChanged: vi.fn().mockResolvedValue(() => {}),
  })),
}));

vi.mock('./stores/collectionStore', () => ({
  useCollectionStore: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      workspaceId: null,
      workspaceName: null,
      collections: [],
      expandedNodes: new Set(),
      activeRequestId: null,
      renamingNodeId: null,
      contextMenuNodeId: null,
      contextMenuPosition: null,
      loadWorkspace: vi.fn(),
      toggleExpanded: vi.fn(),
      setActiveRequest: vi.fn(),
      setRenamingNode: vi.fn(),
      setContextMenu: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('./stores/authStore', () => ({
  useAuthStore: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      user: null,
      isLoggedIn: false,
      isLoading: false,
      loginModalOpen: false,
      sessionExpiredPending: false,
      checkAuth: vi.fn(),
      setUser: vi.fn(),
      logout: vi.fn(),
      openLoginModal: vi.fn(),
      closeLoginModal: vi.fn(),
      handleSessionExpired: vi.fn(),
      clearSessionExpiredPending: vi.fn(),
      getState: vi.fn(() => ({ checkAuth: vi.fn(), openLoginModal: vi.fn(), logout: vi.fn() })),
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('./stores/workspaceStore', () => ({
  useWorkspaceStore: Object.assign(
    vi.fn((selector?: (s: unknown) => unknown) => {
      const state = {
        workspaces: [],
        activeWorkspaceId: null,
        isLoading: false,
        loadWorkspaces: vi.fn(),
        addWorkspace: vi.fn(),
        removeWorkspace: vi.fn(),
        switchWorkspace: vi.fn(),
        disconnectWorkspace: vi.fn(),
      };
      return selector ? selector(state) : state;
    }),
    {
      getState: vi.fn(() => ({
        loadWorkspaces: vi.fn(),
        addWorkspace: vi.fn(),
        workspaces: [],
        activeWorkspaceId: null,
      })),
    },
  ),
}));

vi.mock('./stores/syncStore', () => ({
  useSyncStore: Object.assign(
    vi.fn((selector?: (s: unknown) => unknown) => {
      const state = {
        syncStatuses: {},
        initListener: vi.fn().mockResolvedValue(() => {}),
        triggerSync: vi.fn(),
        triggerPull: vi.fn(),
        getStatus: vi.fn(() => 'synced'),
      };
      return selector ? selector(state) : state;
    }),
    {
      getState: vi.fn(() => ({
        triggerPull: vi.fn(),
        initListener: vi.fn().mockResolvedValue(() => {}),
        syncStatuses: {},
      })),
    },
  ),
}));

vi.mock('./stores/requestStore', () => ({
  useRequestStore: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      method: 'GET',
      url: '',
      headers: [],
      queryParams: [],
      body: null,
      auth: null,
      response: { status: 'idle' },
      activeRequestMeta: null,
      setMethod: vi.fn(),
      setUrl: vi.fn(),
      setHeaders: vi.fn(),
      setQueryParams: vi.fn(),
      setBody: vi.fn(),
      setAuth: vi.fn(),
      sendRequest: vi.fn(),
      loadFromFile: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

import App from './App';

function renderApp() {
  return render(
    <HeroUIProvider>
      <App />
    </HeroUIProvider>
  );
}

describe('App Shell Layout (APP-02)', () => {
  it('renders the top bar', () => {
    renderApp();
    expect(screen.getByTestId('topbar')).toBeInTheDocument();
  });

  it('renders the sidebar', () => {
    renderApp();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('renders the request editor', () => {
    renderApp();
    expect(screen.getByTestId('request-editor')).toBeInTheDocument();
  });

  it('renders the response viewer', () => {
    renderApp();
    expect(screen.getByTestId('response-viewer')).toBeInTheDocument();
  });
});
