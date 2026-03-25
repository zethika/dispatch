import { create } from 'zustand';
import * as workspaceApi from '../api/workspace';
import type { WorkspaceEntry } from '../api/workspace';
import { useCollectionStore } from './collectionStore';
import { useEnvironmentStore } from './environmentStore';
import { useRequestStore } from './requestStore';

interface WorkspaceState {
  workspaces: WorkspaceEntry[];
  activeWorkspaceId: string | null;

  loadWorkspaces: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  disconnectWorkspace: (workspaceId: string) => Promise<void>;
  addWorkspace: (entry: WorkspaceEntry) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,

  loadWorkspaces: async () => {
    try {
      const workspaces = await workspaceApi.listWorkspaces();
      if (!Array.isArray(workspaces)) return;
      const current = get().activeWorkspaceId;
      set({
        workspaces,
        activeWorkspaceId:
          current || (workspaces.find((w) => w.is_local)?.id ?? workspaces[0]?.id ?? null),
      });
    } catch {
      // Silently fail — workspace list remains empty on error
    }
  },

  switchWorkspace: async (workspaceId: string) => {
    set({ activeWorkspaceId: workspaceId });
    // Reload all workspace-scoped stores
    await useCollectionStore.getState().loadWorkspace(workspaceId);
    await useEnvironmentStore.getState().loadEnvironments(workspaceId);
    // Clear active request — IDs are workspace-scoped
    useRequestStore.getState().clearActiveRequest();
  },

  disconnectWorkspace: async (workspaceId: string) => {
    await workspaceApi.disconnectWorkspace(workspaceId);
    const { workspaces, activeWorkspaceId } = get();
    const remaining = workspaces.filter((w) => w.id !== workspaceId);
    set({ workspaces: remaining });
    // If disconnected workspace was active, switch to Local
    if (activeWorkspaceId === workspaceId) {
      const local = remaining.find((w) => w.is_local);
      if (local) {
        await get().switchWorkspace(local.id);
      }
    }
  },

  addWorkspace: (entry: WorkspaceEntry) => {
    set((s) => ({ workspaces: [...s.workspaces, entry] }));
  },
}));
