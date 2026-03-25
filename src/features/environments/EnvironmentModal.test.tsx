import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HeroUIProvider } from '@heroui/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Tauri invoke for API calls
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock Tauri store plugin
vi.mock('@tauri-apps/plugin-store', () => ({
  load: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Set up store mock state
const storeMockState = {
  environments: [] as Array<{ slug: string; name: string }>,
  activeEnvSlug: null as string | null,
  activeEnvVariables: {} as Record<string, string>,
  loadEnvironments: vi.fn(),
  setActiveEnvironment: vi.fn(),
  createEnvironment: vi.fn(),
  deleteEnvironment: vi.fn(),
  renameEnvironment: vi.fn(),
  refreshActiveVariables: vi.fn(),
};

// The getState function is used by EnvironmentList (direct store calls)
const mockGetState = () => storeMockState;

// Mock environmentStore
vi.mock('../../stores/environmentStore', () => ({
  useEnvironmentStore: Object.assign(
    vi.fn((selector?: (s: unknown) => unknown) => {
      return selector ? selector(storeMockState) : storeMockState;
    }),
    {
      getState: () => storeMockState,
    },
  ),
}));

// Mock environments API
vi.mock('../../api/environments', () => ({
  listEnvironments: vi.fn().mockResolvedValue([]),
  loadEnvironment: vi.fn().mockResolvedValue({ name: 'Production', variables: [] }),
  saveEnvironment: vi.fn().mockResolvedValue(undefined),
  createEnvironment: vi.fn().mockResolvedValue({ slug: 'new-environment', name: 'New Environment' }),
  deleteEnvironment: vi.fn().mockResolvedValue(undefined),
  renameEnvironment: vi.fn().mockResolvedValue({ slug: 'production', name: 'Production' }),
  loadSecretValues: vi.fn().mockResolvedValue({}),
  saveSecretValues: vi.fn().mockResolvedValue(undefined),
}));

// Mock collectionStore for TopBar tests
vi.mock('../../stores/collectionStore', () => ({
  useCollectionStore: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      workspaceId: 'test-workspace',
      workspaceName: 'Test Workspace',
      collections: [],
    };
    return selector ? selector(state) : state;
  }),
}));

import EnvironmentModal from './EnvironmentModal';
import EnvironmentList from './EnvironmentList';
import TopBar from '../../components/layout/TopBar';

void mockGetState; // suppress unused warning

function renderModal(props?: Partial<{ isOpen: boolean; onClose: () => void; workspaceId: string }>) {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    workspaceId: 'test-workspace',
    ...props,
  };
  return render(
    <HeroUIProvider>
      <EnvironmentModal {...defaultProps} />
    </HeroUIProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  storeMockState.environments = [];
  storeMockState.activeEnvSlug = null;
  storeMockState.loadEnvironments = vi.fn();
  storeMockState.createEnvironment = vi.fn();
  storeMockState.deleteEnvironment = vi.fn();
  storeMockState.renameEnvironment = vi.fn();
  storeMockState.refreshActiveVariables = vi.fn();
  storeMockState.setActiveEnvironment = vi.fn();
});

describe('EnvironmentModal (ENV-01, ENV-02)', () => {
  it('renders modal header when isOpen=true', () => {
    renderModal();
    expect(screen.getByText('Manage Environments')).toBeInTheDocument();
  });

  it('shows empty state message when no environments exist', () => {
    storeMockState.environments = [];
    renderModal();
    expect(screen.getByText(/create an environment to get started/i)).toBeInTheDocument();
  });

  it('renders environment list with two environments', () => {
    storeMockState.environments = [
      { slug: 'production', name: 'Production' },
      { slug: 'staging', name: 'Staging' },
    ];
    renderModal();
    expect(screen.getByText('Production')).toBeInTheDocument();
    expect(screen.getByText('Staging')).toBeInTheDocument();
  });

  it('calls createEnvironment when + New Environment is clicked', async () => {
    storeMockState.environments = [];
    renderModal();

    const newBtn = screen.getByTestId('new-environment-btn');
    fireEvent.click(newBtn);

    await waitFor(() => {
      expect(storeMockState.createEnvironment).toHaveBeenCalledWith(
        'test-workspace',
        'New Environment',
      );
    });
  });

  it('active environment shows green dot indicator', () => {
    storeMockState.environments = [
      { slug: 'production', name: 'Production' },
      { slug: 'staging', name: 'Staging' },
    ];
    storeMockState.activeEnvSlug = 'production';
    renderModal();

    const activeDot = screen.getByTestId('active-dot-production');
    expect(activeDot).toHaveClass('bg-success');
  });

  it('inactive environment does not show active dot', () => {
    storeMockState.environments = [
      { slug: 'production', name: 'Production' },
      { slug: 'staging', name: 'Staging' },
    ];
    storeMockState.activeEnvSlug = 'production';
    renderModal();

    const inactiveDot = screen.getByTestId('active-dot-staging');
    expect(inactiveDot).not.toHaveClass('bg-success');
  });
});

describe('EnvironmentList inline rename', () => {
  it('shows rename input when rename button is clicked', () => {
    const envs = [{ slug: 'production', name: 'Production' }];

    render(
      <HeroUIProvider>
        <EnvironmentList
          environments={envs}
          selectedSlug={null}
          activeSlug={null}
          onSelect={vi.fn()}
          workspaceId="test-workspace"
        />
      </HeroUIProvider>,
    );

    const renameBtn = screen.getByTestId('rename-btn-production');
    fireEvent.click(renameBtn);

    const renameInput = screen.getByTestId('rename-input-production');
    expect(renameInput).toBeInTheDocument();
  });
});

describe('TopBar environment dropdown (ENV-02)', () => {
  it('shows active environment name in dropdown trigger', () => {
    storeMockState.environments = [
      { slug: 'production', name: 'Production' },
      { slug: 'staging', name: 'Staging' },
    ];
    storeMockState.activeEnvSlug = 'production';

    render(
      <HeroUIProvider>
        <TopBar />
      </HeroUIProvider>,
    );

    // The active env name shows in the dropdown trigger button
    expect(screen.getByText('Production')).toBeInTheDocument();
  });

  it('shows No Environment when activeEnvSlug is null', () => {
    storeMockState.environments = [];
    storeMockState.activeEnvSlug = null;

    render(
      <HeroUIProvider>
        <TopBar />
      </HeroUIProvider>,
    );

    expect(screen.getByText('No Environment')).toBeInTheDocument();
  });
});
