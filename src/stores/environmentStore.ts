import { create } from 'zustand';
import { load } from '@tauri-apps/plugin-store';
import * as environmentsApi from '../api/environments';
import type { EnvironmentSummary } from '../types/environments';

interface EnvironmentStore {
  environments: EnvironmentSummary[];
  activeEnvSlug: string | null;
  activeEnvVariables: Record<string, string>; // merged public + secret values

  loadEnvironments: (workspaceId: string) => Promise<void>;
  setActiveEnvironment: (workspaceId: string, slug: string | null) => Promise<void>;
  createEnvironment: (workspaceId: string, name: string) => Promise<void>;
  deleteEnvironment: (workspaceId: string, slug: string) => Promise<void>;
  renameEnvironment: (workspaceId: string, oldSlug: string, newName: string) => Promise<void>;
  refreshActiveVariables: (workspaceId: string) => Promise<void>;
}

export const useEnvironmentStore = create<EnvironmentStore>((set, get) => ({
  environments: [],
  activeEnvSlug: null,
  activeEnvVariables: {},

  loadEnvironments: async (workspaceId: string) => {
    const environments = await environmentsApi.listEnvironments(workspaceId);
    set({ environments });

    // Restore persisted active environment selection
    const store = await load('dispatch-prefs.json');
    const savedSlug = await store.get<string | null>(`activeEnv:${workspaceId}`);

    if (savedSlug && environments.some((e) => e.slug === savedSlug)) {
      set({ activeEnvSlug: savedSlug });
      await get().refreshActiveVariables(workspaceId);
    } else {
      set({ activeEnvSlug: null, activeEnvVariables: {} });
    }
  },

  setActiveEnvironment: async (workspaceId: string, slug: string | null) => {
    set({ activeEnvSlug: slug });

    const store = await load('dispatch-prefs.json');
    await store.set(`activeEnv:${workspaceId}`, slug);

    if (slug !== null) {
      await get().refreshActiveVariables(workspaceId);
    } else {
      set({ activeEnvVariables: {} });
    }
  },

  refreshActiveVariables: async (workspaceId: string) => {
    const { activeEnvSlug } = get();
    if (!activeEnvSlug) {
      set({ activeEnvVariables: {} });
      return;
    }

    const [envFile, secrets] = await Promise.all([
      environmentsApi.loadEnvironment(workspaceId, activeEnvSlug),
      environmentsApi.loadSecretValues(workspaceId, activeEnvSlug),
    ]);

    // Merge: secret variables use the value from the local secrets map; public vars use file value
    const merged: Record<string, string> = {};
    for (const variable of envFile.variables) {
      if (variable.secret) {
        merged[variable.key] = secrets[variable.key] ?? '';
      } else {
        merged[variable.key] = variable.value;
      }
    }

    set({ activeEnvVariables: merged });
  },

  createEnvironment: async (workspaceId: string, name: string) => {
    await environmentsApi.createEnvironment(workspaceId, name);
    await get().loadEnvironments(workspaceId);
  },

  deleteEnvironment: async (workspaceId: string, slug: string) => {
    await environmentsApi.deleteEnvironment(workspaceId, slug);
    // If deleted env was active, clear it
    const { activeEnvSlug } = get();
    if (activeEnvSlug === slug) {
      set({ activeEnvSlug: null, activeEnvVariables: {} });
    }
    await get().loadEnvironments(workspaceId);
  },

  renameEnvironment: async (workspaceId: string, oldSlug: string, newName: string) => {
    const summary = await environmentsApi.renameEnvironment(workspaceId, oldSlug, newName);
    // If the renamed env was active, update the active slug to the new one
    const { activeEnvSlug } = get();
    if (activeEnvSlug === oldSlug) {
      set({ activeEnvSlug: summary.slug });
    }
    await get().loadEnvironments(workspaceId);
  },
}));
