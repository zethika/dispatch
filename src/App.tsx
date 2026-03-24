import { useEffect } from 'react';
import TopBar from './components/layout/TopBar';
import Sidebar from './components/layout/Sidebar';
import RightPanel from './components/layout/RightPanel';
import { ensureDefaultWorkspace } from './api/collections';
import { useCollectionStore } from './stores/collectionStore';

export default function App() {
  const { workspaceId, loadWorkspace } = useCollectionStore();

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
    </div>
  );
}
