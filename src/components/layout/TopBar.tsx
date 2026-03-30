import { useState, useEffect } from 'react';
import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
  Spinner,
} from '@heroui/react';
import { toast } from 'sonner';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { useCollectionStore } from '../../stores/collectionStore';
import { useAuthStore } from '../../stores/authStore';
import { useSyncStore } from '../../stores/syncStore';
import { useUiStore } from '../../stores/uiStore';
import EnvironmentModal from '../../features/environments/EnvironmentModal';
import LoginModal from '../../features/auth/LoginModal';
import SyncStatusChip from '../../features/sync/SyncStatusChip';
import SearchModal from '../../features/search/SearchModal';

export default function TopBar() {
  const [modalOpen, setModalOpen] = useState(false);
  const { environments, activeEnvSlug, setActiveEnvironment } = useEnvironmentStore();
  const workspaceId = useCollectionStore((s) => s.workspaceId);
  const { setSearchOpen } = useUiStore();
  const {
    user,
    isLoggedIn,
    isLoading,
    loginModalOpen,
    openLoginModal,
    closeLoginModal,
    sessionExpiredPending,
    clearSessionExpiredPending,
  } = useAuthStore();

  // Load environments when workspaceId becomes available
  useEffect(() => {
    if (workspaceId) {
      void useEnvironmentStore.getState().loadEnvironments(workspaceId);
    }
  }, [workspaceId]);

  // Initialize sync event listener on mount
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    useSyncStore.getState().initListener().then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, []);

  // D-11: Show session expiry toast with clickable "Sign in" action
  useEffect(() => {
    if (sessionExpiredPending) {
      toast('GitHub session expired — Sign in again', {
        action: {
          label: 'Sign in',
          onClick: () => useAuthStore.getState().openLoginModal(),
        },
      });
      clearSessionExpiredPending();
    }
  }, [sessionExpiredPending, clearSessionExpiredPending]);

  // Cmd+K opens search modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setSearchOpen]);

  const activeEnvName =
    activeEnvSlug
      ? (environments.find((e) => e.slug === activeEnvSlug)?.name ?? 'No Environment')
      : 'No Environment';

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

  const handleLogout = async () => {
    await useAuthStore.getState().logout();
    toast.success('Signed out');
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

      {isLoading ? (
        <Spinner size="sm" />
      ) : isLoggedIn && user ? (
        <Dropdown>
          <DropdownTrigger>
            <Avatar
              as="button"
              size="sm"
              src={user.avatar_url}
              name={user.login.charAt(0).toUpperCase()}
              className="cursor-pointer"
            />
          </DropdownTrigger>
          <DropdownMenu aria-label="User menu">
            <DropdownItem key="username" isReadOnly className="opacity-100">
              <span className="font-semibold text-sm">@{user.login}</span>
            </DropdownItem>
            <DropdownItem
              key="signout"
              color="danger"
              variant="light"
              onPress={() => void handleLogout()}
            >
              Sign out
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      ) : (
        <Button size="sm" color="primary" variant="flat" className="ml-2" onPress={openLoginModal}>
          Connect GitHub
        </Button>
      )}

      <Dropdown>
        <DropdownTrigger>
          <Button size="sm" variant="flat" data-shortcut-id="env-selector">
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

      <button
        data-shortcut-id="search-icon"
        onClick={() => setSearchOpen(true)}
        className="flex items-center gap-1.5 px-2 py-1 text-xs text-default-400 bg-default-100 hover:bg-default-200 rounded-md transition-colors select-none"
        title="Search (Cmd+K)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span>Search</span>
        <kbd className="text-default-300 text-xs">⌘K</kbd>
      </button>

      <div className="flex-1" />

      <span data-shortcut-id="sync-chip">
        <SyncStatusChip />
      </span>

      {workspaceId && (
        <EnvironmentModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          workspaceId={workspaceId}
        />
      )}

      <LoginModal isOpen={loginModalOpen} onClose={closeLoginModal} />

      <SearchModal />
    </div>
  );
}
