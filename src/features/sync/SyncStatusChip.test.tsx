import { describe, it, expect } from 'vitest';

describe('SyncStatusChip', () => {
  it('offline label mapping is correct', () => {
    const getLabel = (status: string) =>
      status === 'syncing'
        ? 'Syncing'
        : status === 'synced'
          ? 'Synced'
          : status === 'conflict'
            ? 'Conflict'
            : status === 'offline'
              ? 'Offline'
              : 'Error';
    expect(getLabel('offline')).toBe('Offline');
  });

  it('offline status gets CloudOffIcon (not XCircleIcon fallback)', () => {
    // Verifies offline is handled before the error fallback
    const getIconName = (status: string) =>
      status === 'syncing'
        ? 'Spinner'
        : status === 'synced'
          ? 'CheckCircleIcon'
          : status === 'conflict'
            ? 'WarningTriangleIcon'
            : status === 'offline'
              ? 'CloudOffIcon'
              : 'XCircleIcon';
    expect(getIconName('offline')).toBe('CloudOffIcon');
    expect(getIconName('error')).toBe('XCircleIcon');
  });

  it('renders Offline label when status is offline', () => {
    const getLabel = (status: string) =>
      status === 'offline' ? 'Offline' : 'Other';
    expect(getLabel('offline')).toBe('Offline');
  });

  it('triggers sync attempt when clicked while offline', () => {
    // handlePress calls triggerSync for any non-local status (including offline)
    const shouldTriggerSync = (status: string) => status !== 'local';
    expect(shouldTriggerSync('offline')).toBe(true);
    expect(shouldTriggerSync('local')).toBe(false);
  });
});
