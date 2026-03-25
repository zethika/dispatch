import { useEffect } from 'react';
import { Toaster } from 'sonner';
import TopBar from './components/layout/TopBar';
import Sidebar from './components/layout/Sidebar';
import RightPanel from './components/layout/RightPanel';
import { ensureDefaultWorkspace } from './api/collections';
import { useCollectionStore } from './stores/collectionStore';
import { useAuthStore } from './stores/authStore';

export default function App() {
  const { workspaceId, loadWorkspace } = useCollectionStore();
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (workspaceId) return;
    ensureDefaultWorkspace()
      .then((id) => loadWorkspace(id))
      .catch(console.error);
  }, [workspaceId, loadWorkspace]);

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
