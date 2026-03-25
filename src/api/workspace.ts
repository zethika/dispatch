import { invoke } from '@tauri-apps/api/core';

export interface WorkspaceEntry {
  id: string;
  display_name: string;
  github_repo_full_name: string | null;
  clone_url: string | null;
  local_path: string;
  is_local: boolean;
}

export async function connectWorkspace(
  repoFullName: string,
  repoName: string,
  cloneUrl: string,
): Promise<WorkspaceEntry> {
  return invoke<WorkspaceEntry>('connect_workspace', {
    repoFullName,
    repoName,
    cloneUrl,
  });
}

export async function disconnectWorkspace(workspaceId: string): Promise<void> {
  return invoke<void>('disconnect_workspace', { workspaceId });
}

export async function listWorkspaces(): Promise<WorkspaceEntry[]> {
  return invoke<WorkspaceEntry[]>('list_workspaces');
}
