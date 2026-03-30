import { useEffect, useState } from 'react';
import { CollectionTree } from '../../features/collections/CollectionTree';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import RepoBrowserModal from '../../features/auth/RepoBrowserModal';
import { useWorkspaceStore } from '../../stores/workspaceStore';

export default function Sidebar() {
  const [repoBrowserOpen, setRepoBrowserOpen] = useState(false);

  // Load workspace list on mount
  useEffect(() => {
    void useWorkspaceStore.getState().loadWorkspaces();
  }, []);

  return (
    <div
      data-testid="sidebar"
      data-shortcut-id="sidebar-area"
      className="w-[260px] min-w-[260px] flex flex-col border-r border-divider bg-content1 overflow-y-auto"
    >
      <WorkspaceSwitcher onConnectRepo={() => setRepoBrowserOpen(true)} />
      <CollectionTree />
      <RepoBrowserModal
        isOpen={repoBrowserOpen}
        onClose={() => setRepoBrowserOpen(false)}
      />
    </div>
  );
}
