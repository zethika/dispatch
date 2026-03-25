import { invoke } from '@tauri-apps/api/core';

export interface RepoInfo {
  id: number;
  name: string;
  full_name: string;
  clone_url: string;
  private: boolean;
  owner: { login: string };
}

export async function listRepos(): Promise<RepoInfo[]> {
  return invoke<RepoInfo[]>('list_repos');
}
