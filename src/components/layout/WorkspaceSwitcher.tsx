import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
  Spinner,
} from '@heroui/react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';
import { useSyncStore } from '../../stores/syncStore';

interface WorkspaceSwitcherProps {
  onConnectRepo: () => void;
}

const ChevronDownIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M2.5 4.5L6 8L9.5 4.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function statusDot(status: string) {
  if (status === 'syncing') return <Spinner size="sm" classNames={{ wrapper: 'w-3 h-3' }} />;
  const colorMap: Record<string, string> = {
    synced: 'bg-primary',
    conflict: 'bg-warning',
    error: 'bg-danger',
  };
  const bg = colorMap[status] ?? 'bg-default-300';
  return <div className={`w-1.5 h-1.5 rounded-full ${bg} flex-shrink-0`} />;
}

export default function WorkspaceSwitcher({ onConnectRepo }: WorkspaceSwitcherProps) {
  const { workspaces, activeWorkspaceId, switchWorkspace } = useWorkspaceStore();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const syncStatuses = useSyncStore((s) => s.syncStatuses);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const activeLabel = activeWorkspace?.display_name ?? 'Local';

  const workspaceItems = workspaces.map((w) => ({
    key: w.id,
    label: w.display_name,
    is_local: w.is_local,
    syncStatus: w.is_local ? 'local' : (syncStatuses[w.id] ?? 'synced'),
  }));

  const allItems = [
    ...workspaceItems,
    ...(isLoggedIn
      ? [{ key: 'connect', label: 'Connect repo...', is_local: false, syncStatus: undefined as string | undefined }]
      : []),
  ];

  const handleAction = (key: React.Key) => {
    const keyStr = String(key);
    if (keyStr === 'connect') {
      onConnectRepo();
    } else {
      void switchWorkspace(keyStr);
    }
  };

  return (
    <div className="px-3 py-2 border-b border-divider">
      <Dropdown>
        <DropdownTrigger>
          <Button
            variant="flat"
            size="sm"
            className="w-full justify-between"
            endContent={<ChevronDownIcon />}
          >
            {activeLabel}
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label="Workspace switcher"
          items={allItems}
          selectedKeys={activeWorkspaceId ? new Set([activeWorkspaceId]) : new Set<string>()}
          selectionMode="single"
          onAction={handleAction}
        >
          {(item) => (
            <DropdownItem
              key={item.key}
              className={item.key === 'connect' ? 'text-primary' : ''}
              startContent={
                item.key !== 'connect' ? statusDot(item.syncStatus ?? 'local') : undefined
              }
            >
              {item.label}
            </DropdownItem>
          )}
        </DropdownMenu>
      </Dropdown>
    </div>
  );
}
