import { render, screen } from '@testing-library/react';
import { HeroUIProvider } from '@heroui/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../stores/authStore', () => ({
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
    };
    return selector ? selector(state) : state;
  }),
}));

import TopBar from './TopBar';

function renderTopBar() {
  return render(
    <HeroUIProvider>
      <TopBar />
    </HeroUIProvider>
  );
}

describe('TopBar (APP-03)', () => {
  it('shows Connect GitHub button when logged out', () => {
    renderTopBar();
    expect(screen.getByText('Connect GitHub')).toBeInTheDocument();
  });

  it('shows No Environment placeholder (D-09)', () => {
    renderTopBar();
    expect(screen.getByText('No Environment')).toBeInTheDocument();
  });
});
