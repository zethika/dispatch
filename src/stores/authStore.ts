import { create } from 'zustand';
import * as authApi from '../api/auth';
import type { GitHubUser } from '../api/auth';

interface AuthState {
  user: GitHubUser | null;
  isLoggedIn: boolean;
  isLoading: boolean; // true during startup token check
  loginModalOpen: boolean; // controlled by authStore so any component can open it (D-11)
  sessionExpiredPending: boolean; // flag for TopBar to show expiry toast

  checkAuth: () => Promise<void>;
  setUser: (user: GitHubUser | null) => void;
  logout: () => Promise<void>;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  handleSessionExpired: () => void;
  clearSessionExpiredPending: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoggedIn: false,
  isLoading: true, // starts true — resolved by checkAuth on mount
  loginModalOpen: false,
  sessionExpiredPending: false,

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const user = await authApi.getAuthState();
      set({ user, isLoggedIn: !!user, isLoading: false });
    } catch {
      set({ user: null, isLoggedIn: false, isLoading: false });
    }
  },

  setUser: (user) => {
    set({ user, isLoggedIn: !!user });
  },

  logout: async () => {
    await authApi.logout();
    set({ user: null, isLoggedIn: false });
  },

  openLoginModal: () => {
    set({ loginModalOpen: true });
  },

  closeLoginModal: () => {
    set({ loginModalOpen: false });
  },

  handleSessionExpired: () => {
    const { isLoggedIn } = get();
    if (isLoggedIn) {
      set({ user: null, isLoggedIn: false, sessionExpiredPending: true });
    }
  },

  clearSessionExpiredPending: () => {
    set({ sessionExpiredPending: false });
  },
}));
