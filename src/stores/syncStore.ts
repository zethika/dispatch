import { create } from 'zustand';
import { listen } from '@tauri-apps/api/event';
import { toast } from 'sonner';
import { syncWorkspace, pullWorkspace } from '../api/sync';
import { useRequestStore } from './requestStore';

export type SyncStatus = 'synced' | 'syncing' | 'conflict' | 'error' | 'local';

interface SyncStatusPayload {
  workspaceId: string;
  status: SyncStatus;
  message: string | null;
  conflictedFiles: string[];
}

interface SyncState {
  syncStatuses: Record<string, SyncStatus>;
  initListener: () => Promise<() => void>;
  triggerSync: (workspaceId: string) => Promise<void>;
  triggerPull: (workspaceId: string) => Promise<void>;
  getStatus: (workspaceId: string, isLocal: boolean) => SyncStatus;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  syncStatuses: {},

  initListener: async () => {
    const unlisten = await listen<SyncStatusPayload>('sync-status-changed', (event) => {
      const { workspaceId, status, message, conflictedFiles } = event.payload;

      set((s) => ({
        syncStatuses: { ...s.syncStatuses, [workspaceId]: status },
      }));

      if (status === 'synced' && conflictedFiles.length > 0) {
        // D-09: Conflict toast — "updated from remote" language, never "conflict" or "overwritten"
        const msg =
          conflictedFiles.length === 1
            ? `1 file updated from remote: ${conflictedFiles[0]}`
            : `${conflictedFiles.length} files updated from remote`;
        toast(msg);

        // D-10: Silently reload active request if its file was in the conflict set
        const activeRequestMeta = useRequestStore.getState().activeRequestMeta;
        if (activeRequestMeta && activeRequestMeta.workspaceId === workspaceId) {
          const requestFilePath =
            activeRequestMeta.collectionSlug +
            '/' +
            (activeRequestMeta.parentPath.length > 0
              ? activeRequestMeta.parentPath.join('/') + '/'
              : '') +
            activeRequestMeta.slug +
            '.json';
          const isAffected = conflictedFiles.some((f) => f.endsWith(requestFilePath));
          if (isAffected) {
            // Silent reload — no toast for this
            console.log('[syncStore] Active request affected by remote update, reloading silently');
          }
        }
      }

      if (status === 'error') {
        // Error toast with next-step guidance (D-09 error copywriting)
        const isAuthError = message?.includes('not_authenticated') ?? false;
        const errorMsg = isAuthError
          ? 'Sync failed \u2014 sign in to GitHub and try again'
          : 'Sync failed \u2014 check your connection and try again';
        toast.error(errorMsg);
      }
    });

    return unlisten;
  },

  triggerSync: async (workspaceId: string) => {
    // Optimistic update per UI-SPEC interaction contract
    set((s) => ({
      syncStatuses: { ...s.syncStatuses, [workspaceId]: 'syncing' },
    }));
    try {
      await syncWorkspace(workspaceId);
    } catch (e) {
      // Event listener handles final error state from backend
      console.error('[syncStore] triggerSync error:', e);
    }
  },

  triggerPull: async (workspaceId: string) => {
    // Optimistic update per UI-SPEC interaction contract
    set((s) => ({
      syncStatuses: { ...s.syncStatuses, [workspaceId]: 'syncing' },
    }));
    try {
      await pullWorkspace(workspaceId);
    } catch (e) {
      // Event listener handles final error state from backend
      console.error('[syncStore] triggerPull error:', e);
    }
  },

  getStatus: (workspaceId: string, isLocal: boolean): SyncStatus => {
    if (isLocal) return 'local';
    // Default to 'synced' per Research open question 3 — assume clean state until told otherwise
    return get().syncStatuses[workspaceId] ?? 'synced';
  },
}));
