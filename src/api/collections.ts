import { invoke } from '@tauri-apps/api/core';
import type {
  WorkspaceTree,
  CollectionItem,
  FolderItem,
  RequestItem,
} from '../types/collections';

export async function ensureDefaultWorkspace(): Promise<string> {
  return invoke<string>('ensure_default_workspace');
}

export async function getWorkspaceIds(): Promise<string[]> {
  return invoke<string[]>('get_workspace_ids');
}

export async function loadWorkspace(workspaceId: string): Promise<WorkspaceTree> {
  return invoke<WorkspaceTree>('load_workspace', { workspaceId });
}

export async function createCollection(
  workspaceId: string,
  name: string,
): Promise<CollectionItem> {
  return invoke<CollectionItem>('create_collection', { workspaceId, name });
}

export async function createFolder(
  workspaceId: string,
  collectionSlug: string,
  parentPath: string[],
  name: string,
): Promise<FolderItem> {
  return invoke<FolderItem>('create_folder', {
    workspaceId,
    collectionSlug,
    parentPath,
    name,
  });
}

export async function createRequest(
  workspaceId: string,
  collectionSlug: string,
  parentPath: string[],
  name: string,
): Promise<RequestItem> {
  return invoke<RequestItem>('create_request', {
    workspaceId,
    collectionSlug,
    parentPath,
    name,
  });
}

export async function renameNode(
  workspaceId: string,
  collectionSlug: string,
  parentPath: string[],
  oldSlug: string,
  newName: string,
  isDir: boolean,
): Promise<string> {
  return invoke<string>('rename_node', {
    workspaceId,
    collectionSlug,
    parentPath,
    oldSlug,
    newName,
    isDir,
  });
}

export async function deleteNode(
  workspaceId: string,
  collectionSlug: string,
  parentPath: string[],
  slug: string,
  isDir: boolean,
): Promise<void> {
  return invoke<void>('delete_node', {
    workspaceId,
    collectionSlug,
    parentPath,
    slug,
    isDir,
  });
}

export async function deleteCollection(
  workspaceId: string,
  collectionSlug: string,
): Promise<void> {
  return invoke<void>('delete_collection', { workspaceId, collectionSlug });
}

export async function renameCollection(
  workspaceId: string,
  oldSlug: string,
  newName: string,
): Promise<string> {
  return invoke<string>('rename_collection', { workspaceId, oldSlug, newName });
}

export async function duplicateRequest(
  workspaceId: string,
  collectionSlug: string,
  parentPath: string[],
  slug: string,
): Promise<RequestItem> {
  return invoke<RequestItem>('duplicate_request', {
    workspaceId,
    collectionSlug,
    parentPath,
    slug,
  });
}

export async function reorderNode(
  workspaceId: string,
  collectionSlug: string,
  parentPath: string[],
  slug: string,
  newIndex: number,
): Promise<void> {
  return invoke('reorder_node', {
    workspaceId,
    collectionSlug,
    parentPath,
    slug,
    newIndex,
  });
}

export async function moveNode(
  workspaceId: string,
  srcCollectionSlug: string,
  srcParentPath: string[],
  dstCollectionSlug: string,
  dstParentPath: string[],
  slug: string,
  isDir: boolean,
  dstIndex: number | null,
): Promise<void> {
  return invoke('move_node', {
    workspaceId,
    srcCollectionSlug,
    srcParentPath,
    dstCollectionSlug,
    dstParentPath,
    slug,
    isDir,
    dstIndex,
  });
}
