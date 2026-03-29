import { invoke } from '@tauri-apps/api/core';

export async function syncWorkspace(workspaceId: string): Promise<void> {
  return invoke<void>('sync_workspace', { workspaceId });
}

export async function pullWorkspace(workspaceId: string): Promise<void> {
  return invoke<void>('pull_workspace', { workspaceId });
}

export async function getSyncStatus(workspaceId: string): Promise<string> {
  return invoke<string>('get_sync_status', { workspaceId });
}

export async function notifyChange(workspaceId: string): Promise<void> {
  return invoke<void>('notify_change', { workspaceId });
}
