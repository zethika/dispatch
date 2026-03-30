import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { getCurrentWindow } from '@tauri-apps/api/window';
import TopBar from './components/layout/TopBar';
import Sidebar from './components/layout/Sidebar';
import RightPanel from './components/layout/RightPanel';
import { ensureDefaultWorkspace } from './api/collections';
import { useCollectionStore } from './stores/collectionStore';
import { useAuthStore } from './stores/authStore';
import { useWorkspaceStore } from './stores/workspaceStore';
import { useSyncStore } from './stores/syncStore';

export default function App() {
  const { workspaceId, loadWorkspace } = useCollectionStore();
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (workspaceId) return;
    ensureDefaultWorkspace()
      .then((id) => {
        // Load the workspace registry so WorkspaceSwitcher populates
        void useWorkspaceStore.getState().loadWorkspaces();
        return loadWorkspace(id);
      })
      .catch(console.error);
  }, [workspaceId, loadWorkspace]);

  // SYNC-03: Pull from remote when macOS window regains focus (D-08)
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getCurrentWindow()
      .onFocusChanged(({ payload: focused }) => {
        if (focused) {
          const { activeWorkspaceId, workspaces } = useWorkspaceStore.getState();
          const workspace = workspaces.find((w) => w.id === activeWorkspaceId);
          if (workspace && !workspace.is_local && workspace.clone_url) {
            void useSyncStore.getState().triggerPull(workspace.id);
          }
        }
      })
      .then((fn) => {
        unlisten = fn;
      });
    return () => unlisten?.();
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <RightPanel />
      </div>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
