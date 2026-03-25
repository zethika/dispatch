import { invoke } from '@tauri-apps/api/core';
import type { EnvironmentFile, EnvironmentSummary } from '../types/environments';

export async function listEnvironments(workspaceId: string): Promise<EnvironmentSummary[]> {
  return invoke<EnvironmentSummary[]>('list_environments', { workspaceId });
}

export async function loadEnvironment(
  workspaceId: string,
  envSlug: string,
): Promise<EnvironmentFile> {
  return invoke<EnvironmentFile>('load_environment', { workspaceId, envSlug });
}

export async function saveEnvironment(
  workspaceId: string,
  envSlug: string,
  env: EnvironmentFile,
): Promise<void> {
  return invoke<void>('save_environment', { workspaceId, envSlug, env });
}

export async function createEnvironment(
  workspaceId: string,
  name: string,
): Promise<EnvironmentSummary> {
  return invoke<EnvironmentSummary>('create_environment', { workspaceId, name });
}

export async function deleteEnvironment(workspaceId: string, envSlug: string): Promise<void> {
  return invoke<void>('delete_environment', { workspaceId, envSlug });
}

export async function renameEnvironment(
  workspaceId: string,
  oldSlug: string,
  newName: string,
): Promise<EnvironmentSummary> {
  return invoke<EnvironmentSummary>('rename_environment', { workspaceId, oldSlug, newName });
}

export async function loadSecretValues(
  workspaceId: string,
  envSlug: string,
): Promise<Record<string, string>> {
  return invoke<Record<string, string>>('load_secret_values', { workspaceId, envSlug });
}

export async function saveSecretValues(
  workspaceId: string,
  envSlug: string,
  secrets: Record<string, string>,
): Promise<void> {
  return invoke<void>('save_secret_values', { workspaceId, envSlug, secrets });
}
