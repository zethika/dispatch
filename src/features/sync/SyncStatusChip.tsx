import { Button, Spinner } from '@heroui/react';
import { useSyncStore } from '../../stores/syncStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';

// Inline SVG icons (project convention — no icon packages)

const CheckCircleIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-primary"
  >
    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M5 8L7 10L11 6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const WarningTriangleIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-warning"
  >
    <path
      d="M8 2L14 13H2L8 2Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M8 6V9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
  </svg>
);

const XCircleIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-danger"
  >
    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const CloudOffIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-default-400"
  >
    <path
      d="M2 2L22 22"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M9.34 9.34C7.14 9.75 5.5 11.68 5.5 14C5.5 16.49 7.51 18.5 10 18.5H16.73M20 15.74A4.5 4.5 0 0 0 17 9.5H15.92A7 7 0 0 0 7.73 5.73"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const NoSyncIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-default-400"
  >
    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
    <path
      d="M5 8H11"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const CloudOffIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-default-400"
  >
    <path
      d="M2 2L14 14"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M10.6 5.4A4 4 0 0 0 4.1 8.1C2.4 8.4 1 9.7 1 11.3 1 13 2.5 14 4 14h7.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export default function SyncStatusChip() {
  const syncStatuses = useSyncStore((s) => s.syncStatuses);
  const activeWorkspace = useWorkspaceStore((s) =>
    s.workspaces.find((w) => w.id === s.activeWorkspaceId)
  );

  const workspaceId = activeWorkspace?.id ?? null;
  const isLocal = activeWorkspace?.is_local ?? true;
  const status = isLocal
    ? 'local'
    : workspaceId
      ? (syncStatuses[workspaceId] ?? 'synced')
      : 'local';

  const handlePress = () => {
    if (workspaceId && status !== 'local') {
      void useSyncStore.getState().triggerSync(workspaceId);
    }
  };

  if (status === 'local') {
    return (
      <Button
        size="sm"
        variant="flat"
        isDisabled
        className="gap-2 cursor-default"
        startContent={<NoSyncIcon />}
      >
        Local only
      </Button>
    );
  }

  const icon =
    status === 'syncing' ? (
      <Spinner size="sm" />
    ) : status === 'synced' ? (
      <CheckCircleIcon />
    ) : status === 'conflict' ? (
      <WarningTriangleIcon />
    ) : status === 'offline' ? (
      <CloudOffIcon />
    ) : (
      <XCircleIcon />
    );

  const label =
    status === 'syncing'
      ? 'Syncing'
      : status === 'synced'
        ? 'Synced'
        : status === 'conflict'
          ? 'Conflict'
          : status === 'offline'
            ? 'Offline'
            : 'Error';

  return (
    <Button
      size="sm"
      variant="flat"
      className="gap-2"
      startContent={icon}
      onPress={handlePress}
    >
      {label}
    </Button>
  );
}
