import { create } from 'zustand';
import * as collectionsApi from '../api/collections';
import type { CollectionItem } from '../types/collections';

interface CollectionStore {
  workspaceId: string | null;
  workspaceName: string | null;
  collections: CollectionItem[];
  expandedNodes: Set<string>;
  activeRequestId: string | null; // slug path: "collection-slug/folder/request-slug"
  renamingNodeId: string | null;
  contextMenuNodeId: string | null;
  contextMenuPosition: { x: number; y: number } | null;

  loadWorkspace: (workspaceId: string) => Promise<void>;
  refreshWorkspace: () => Promise<void>;
  createCollection: (name: string) => Promise<void>;
  createFolder: (collectionSlug: string, parentPath: string[], name: string) => Promise<void>;
  createRequest: (collectionSlug: string, parentPath: string[], name: string) => Promise<void>;
  renameNode: (
    collectionSlug: string,
    parentPath: string[],
    oldSlug: string,
    newName: string,
    isDir: boolean,
  ) => Promise<void>;
  deleteNode: (
    collectionSlug: string,
    parentPath: string[],
    slug: string,
    isDir: boolean,
  ) => Promise<void>;
  deleteCollection: (collectionSlug: string) => Promise<void>;
  renameCollection: (oldSlug: string, newName: string) => Promise<void>;
  duplicateRequest: (
    collectionSlug: string,
    parentPath: string[],
    slug: string,
  ) => Promise<void>;
  reorderNode: (
    collectionSlug: string,
    parentPath: string[],
    slug: string,
    newIndex: number,
  ) => Promise<void>;
  moveNode: (
    srcCollectionSlug: string,
    srcParentPath: string[],
    dstCollectionSlug: string,
    dstParentPath: string[],
    slug: string,
    isDir: boolean,
    dstIndex: number | null,
  ) => Promise<void>;
  toggleExpanded: (nodeId: string) => void;
  setActiveRequest: (id: string | null) => void;
  setRenamingNode: (id: string | null) => void;
  setContextMenu: (
    nodeId: string | null,
    position: { x: number; y: number } | null,
  ) => void;
}

export const useCollectionStore = create<CollectionStore>((set, get) => ({
  workspaceId: null,
  workspaceName: null,
  collections: [],
  expandedNodes: new Set<string>(),
  activeRequestId: null,
  renamingNodeId: null,
  contextMenuNodeId: null,
  contextMenuPosition: null,

  loadWorkspace: async (workspaceId: string) => {
    const tree = await collectionsApi.loadWorkspace(workspaceId);
    set({
      workspaceId,
      workspaceName: tree.name,
      collections: tree.collections,
    });
  },

  refreshWorkspace: async () => {
    const { workspaceId } = get();
    if (!workspaceId) return;
    const tree = await collectionsApi.loadWorkspace(workspaceId);
    set({
      workspaceName: tree.name,
      collections: tree.collections,
    });
  },

  createCollection: async (name: string) => {
    const { workspaceId } = get();
    if (!workspaceId) return;
    await collectionsApi.createCollection(workspaceId, name);
    await get().refreshWorkspace();
  },

  createFolder: async (collectionSlug: string, parentPath: string[], name: string) => {
    const { workspaceId } = get();
    if (!workspaceId) return;
    await collectionsApi.createFolder(workspaceId, collectionSlug, parentPath, name);
    await get().refreshWorkspace();
  },

  createRequest: async (collectionSlug: string, parentPath: string[], name: string) => {
    const { workspaceId } = get();
    if (!workspaceId) return;
    await collectionsApi.createRequest(workspaceId, collectionSlug, parentPath, name);
    await get().refreshWorkspace();
  },

  renameNode: async (
    collectionSlug: string,
    parentPath: string[],
    oldSlug: string,
    newName: string,
    isDir: boolean,
  ) => {
    const { workspaceId } = get();
    if (!workspaceId) return;
    const newSlug = await collectionsApi.renameNode(
      workspaceId,
      collectionSlug,
      parentPath,
      oldSlug,
      newName,
      isDir,
    );
    // Update expandedNodes: swap old nodeId for new
    if (isDir) {
      const oldId = parentPath.length > 0
        ? `${collectionSlug}/${parentPath.join('/')}/${oldSlug}`
        : `${collectionSlug}/${oldSlug}`;
      const newId = parentPath.length > 0
        ? `${collectionSlug}/${parentPath.join('/')}/${newSlug}`
        : `${collectionSlug}/${newSlug}`;
      set((state) => {
        if (!state.expandedNodes.has(oldId)) return state;
        const next = new Set(state.expandedNodes);
        next.delete(oldId);
        next.add(newId);
        return { expandedNodes: next };
      });
    }
    await get().refreshWorkspace();
  },

  deleteNode: async (
    collectionSlug: string,
    parentPath: string[],
    slug: string,
    isDir: boolean,
  ) => {
    const { workspaceId } = get();
    if (!workspaceId) return;
    await collectionsApi.deleteNode(workspaceId, collectionSlug, parentPath, slug, isDir);
    await get().refreshWorkspace();
  },

  deleteCollection: async (collectionSlug: string) => {
    const { workspaceId } = get();
    if (!workspaceId) return;
    await collectionsApi.deleteCollection(workspaceId, collectionSlug);
    await get().refreshWorkspace();
  },

  renameCollection: async (oldSlug: string, newName: string) => {
    const { workspaceId } = get();
    if (!workspaceId) return;
    const newSlug = await collectionsApi.renameCollection(workspaceId, oldSlug, newName);
    // Update expandedNodes: swap collection slug and rewrite any child nodeIds that use it as prefix
    set((state) => {
      const next = new Set<string>();
      for (const id of state.expandedNodes) {
        if (id === oldSlug) {
          next.add(newSlug);
        } else if (id.startsWith(oldSlug + '/')) {
          next.add(newSlug + id.slice(oldSlug.length));
        } else {
          next.add(id);
        }
      }
      return { expandedNodes: next };
    });
    await get().refreshWorkspace();
  },

  duplicateRequest: async (
    collectionSlug: string,
    parentPath: string[],
    slug: string,
  ) => {
    const { workspaceId } = get();
    if (!workspaceId) return;
    await collectionsApi.duplicateRequest(workspaceId, collectionSlug, parentPath, slug);
    await get().refreshWorkspace();
  },

  reorderNode: async (
    collectionSlug: string,
    parentPath: string[],
    slug: string,
    newIndex: number,
  ) => {
    const { workspaceId } = get();
    if (!workspaceId) return;
    await collectionsApi.reorderNode(workspaceId, collectionSlug, parentPath, slug, newIndex);
    await get().refreshWorkspace();
  },

  moveNode: async (
    srcCollectionSlug: string,
    srcParentPath: string[],
    dstCollectionSlug: string,
    dstParentPath: string[],
    slug: string,
    isDir: boolean,
    dstIndex: number | null,
  ) => {
    const { workspaceId } = get();
    if (!workspaceId) return;
    await collectionsApi.moveNode(
      workspaceId,
      srcCollectionSlug,
      srcParentPath,
      dstCollectionSlug,
      dstParentPath,
      slug,
      isDir,
      dstIndex,
    );
    await get().refreshWorkspace();
  },

  toggleExpanded: (nodeId: string) => {
    set((state) => {
      const next = new Set(state.expandedNodes);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return { expandedNodes: next };
    });
  },

  setActiveRequest: (id: string | null) => {
    set({ activeRequestId: id });
  },

  setRenamingNode: (id: string | null) => {
    set({ renamingNodeId: id });
  },

  setContextMenu: (
    nodeId: string | null,
    position: { x: number; y: number } | null,
  ) => {
    set({ contextMenuNodeId: nodeId, contextMenuPosition: position });
  },
}));
