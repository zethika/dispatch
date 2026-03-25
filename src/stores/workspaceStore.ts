import { create } from 'zustand';
import * as workspaceApi from '../api/workspace';
import type { WorkspaceEntry } from '../api/workspace';

interface WorkspaceStore {
  workspaces: WorkspaceEntry[];
  isLoading: boolean;

  loadWorkspaces: () => Promise<void>;
  addWorkspace: (entry: WorkspaceEntry) => void;
  removeWorkspace: (workspaceId: string) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  workspaces: [],
  isLoading: false,

  loadWorkspaces: async () => {
    set({ isLoading: true });
    try {
      const workspaces = await workspaceApi.listWorkspaces();
      set({ workspaces, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addWorkspace: (entry: WorkspaceEntry) => {
    set((state) => ({
      workspaces: [...state.workspaces, entry],
    }));
  },

  removeWorkspace: (workspaceId: string) => {
    set((state) => ({
      workspaces: state.workspaces.filter((w) => w.id !== workspaceId),
    }));
  },
}));
