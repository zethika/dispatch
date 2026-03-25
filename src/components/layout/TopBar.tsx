import { useState, useEffect } from 'react';
import { Button, Chip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { useCollectionStore } from '../../stores/collectionStore';
import EnvironmentModal from '../../features/environments/EnvironmentModal';

export default function TopBar() {
  const [modalOpen, setModalOpen] = useState(false);
  const { environments, activeEnvSlug, setActiveEnvironment } = useEnvironmentStore();
  const workspaceId = useCollectionStore((s) => s.workspaceId);

  // Load environments when workspaceId becomes available
  useEffect(() => {
    if (workspaceId) {
      void useEnvironmentStore.getState().loadEnvironments(workspaceId);
    }
  }, [workspaceId]);

  const activeEnvName =
    activeEnvSlug ? (environments.find((e) => e.slug === activeEnvSlug)?.name ?? 'No Environment') : 'No Environment';

  const handleSelectEnv = (key: string) => {
    if (!workspaceId) return;
    if (key === 'none') {
      void setActiveEnvironment(workspaceId, null);
    } else if (key === 'manage') {
      setModalOpen(true);
    } else {
      void setActiveEnvironment(workspaceId, key);
    }
  };

  return (
    <div
      data-testid="topbar"
      data-tauri-drag-region
      className="flex items-center px-4 gap-3 h-12 border-b border-divider bg-content1"
    >
      <span className="ml-20 font-semibold text-sm select-none" data-tauri-drag-region>
        Dispatch
      </span>

      <Button size="sm" color="primary" variant="flat" className="ml-2">
        Connect GitHub
      </Button>

      <Dropdown>
        <DropdownTrigger>
          <Button size="sm" variant="flat">
            {activeEnvName}
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label="Environment selector"
          onAction={(key) => handleSelectEnv(String(key))}
          items={[
            { key: 'none', label: 'No Environment', isActive: false, isManage: false },
            ...environments.map((env) => ({
              key: env.slug,
              label: env.name,
              isActive: activeEnvSlug === env.slug,
              isManage: false,
            })),
            { key: 'manage', label: 'Manage Environments...', isActive: false, isManage: true },
          ]}
        >
          {(item) => (
            <DropdownItem
              key={item.key}
              className={item.isManage ? 'text-primary' : ''}
              startContent={
                !item.isManage && !item.isActive && item.key !== 'none' ? (
                  <div className="w-1.5 h-1.5 flex-shrink-0" />
                ) : item.isActive ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />
                ) : undefined
              }
            >
              {item.label}
            </DropdownItem>
          )}
        </DropdownMenu>
      </Dropdown>

      <div className="flex-1" />

      <Chip variant="flat" color="default" size="sm">
        Local only
      </Chip>

      {workspaceId && (
        <EnvironmentModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}
