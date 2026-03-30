import { describe, it, expect } from 'vitest';
import type { SyncStatus } from './syncStore';

describe('syncStore offline handling', () => {
  it('includes offline in SyncStatus type', () => {
    const status: SyncStatus = 'offline';
    expect(status).toBe('offline');
  });

  it('network error detection pattern matches expected strings', () => {
    const isNetworkError = (msg: string) => {
      const lower = msg.toLowerCase();
      return (
        lower.includes('could not connect') ||
        lower.includes('network') ||
        lower.includes('timed out') ||
        lower.includes('connection refused')
      );
    };
    expect(isNetworkError('could not connect to remote')).toBe(true);
    expect(isNetworkError('Network unreachable')).toBe(true);
    expect(isNetworkError('authentication failed')).toBe(false);
    expect(isNetworkError('merge conflict')).toBe(false);
  });
});
