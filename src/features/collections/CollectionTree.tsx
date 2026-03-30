import { useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useCollectionStore } from '../../stores/collectionStore';
import { CollectionNode } from './CollectionNode';
import DragOverlayItem from './DragOverlayItem';
import type { CollectionItem, TreeChild } from '../../types/collections';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Decode a nodeId like "collection-slug/folder/request-slug" into its parts. */
function decodeNodeId(nodeId: string): {
  collectionSlug: string;
  parentPath: string[];
  slug: string;
} {
  const parts = nodeId.split('/');
  const collectionSlug = parts[0];
  const slug = parts[parts.length - 1];
  const parentPath = parts.slice(1, parts.length - 1);
  return { collectionSlug, parentPath, slug };
}

interface ActiveItem {
  id: string;
  name: string;
  type: 'request' | 'folder' | 'collection';
  method?: string;
}

/** Find a tree node by its full nodeId and return metadata for the overlay. */
function findItemByNodeId(
  nodeId: string,
  collections: CollectionItem[],
): ActiveItem | null {
  const { collectionSlug, parentPath, slug } = decodeNodeId(nodeId);
  // Find the collection
  const coll = collections.find((c) => c.slug === collectionSlug);
  if (!coll) return null;

  // Traverse parentPath
  let children: TreeChild[] = coll.children;
  for (const seg of parentPath) {
    const folder = children.find((c) => c.type === 'folder' && c.slug === seg);
    if (!folder || folder.type !== 'folder') return null;
    children = folder.children;
  }

  const item = children.find((c) => c.slug === slug);
  if (!item) return null;

  if (item.type === 'request') {
    return { id: nodeId, name: item.name, type: 'request', method: item.method };
  }
  return { id: nodeId, name: item.name, type: 'folder' };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CollectionTree() {
  const { collections, workspaceName, createCollection, setContextMenu, reorderNode, moveNode } =
    useCollectionStore();

  const [activeItem, setActiveItem] = useState<ActiveItem | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    // Close any open context menu per Pitfall 4
    useCollectionStore.getState().setContextMenu(null, null);
    const found = findItemByNodeId(id, collections);
    setActiveItem(found);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over ? String(event.over.id) : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;

    setActiveItem(null);
    setOverId(null);

    if (!overId || activeId === overId) return;

    const active = decodeNodeId(activeId);
    const over = decodeNodeId(overId);

    const sameCollection = active.collectionSlug === over.collectionSlug;
    const sameParent =
      sameCollection &&
      active.parentPath.join('/') === over.parentPath.join('/');

    // Determine if the dragged item is a directory
    const activeItem = findItemByNodeId(activeId, collections);
    const isDir = activeItem?.type === 'folder';

    if (sameParent) {
      // Reorder within same parent: compute new index based on over item's position
      const parentChildren = getChildrenAtPath(
        active.collectionSlug,
        active.parentPath,
        collections,
      );
      const overIndex = parentChildren.findIndex((c) => c.slug === over.slug);
      if (overIndex !== -1) {
        void reorderNode(
          active.collectionSlug,
          active.parentPath,
          active.slug,
          overIndex,
        );
      }
    } else {
      // Cross-parent move
      // Check if dropping on the collection header (over.parentPath is empty and over.slug === over.collectionSlug)
      const isDroppingOnCollectionHeader =
        over.parentPath.length === 0 && over.slug === over.collectionSlug;

      if (isDroppingOnCollectionHeader) {
        // Move to root of that collection, append at end
        void moveNode(
          active.collectionSlug,
          active.parentPath,
          over.collectionSlug,
          [],
          active.slug,
          isDir,
          null,
        );
      } else {
        // Move to same parent as the over item
        const overChildren = getChildrenAtPath(
          over.collectionSlug,
          over.parentPath,
          collections,
        );
        const overIndex = overChildren.findIndex((c) => c.slug === over.slug);
        void moveNode(
          active.collectionSlug,
          active.parentPath,
          over.collectionSlug,
          over.parentPath,
          active.slug,
          isDir,
          overIndex !== -1 ? overIndex : null,
        );
      }
    }
  };

  const handleRootContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu('__root__', { x: e.clientX, y: e.clientY });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis]}
    >
      <div className="flex flex-col flex-1" onContextMenu={handleRootContextMenu}>
        {workspaceName && (
          <div className="text-xs font-semibold uppercase text-default-500 px-3 py-2 select-none">
            {workspaceName}
          </div>
        )}
        {collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-1 p-4 text-center">
            <p className="text-sm font-medium text-default-500">No collections yet</p>
            <p className="text-xs text-default-400">Right-click to create a collection</p>
          </div>
        ) : (
          <div className="flex flex-col py-1">
            {collections.map((collection) => (
              <CollectionNode
                key={collection.slug}
                collection={collection}
                depth={0}
                overId={overId}
              />
            ))}
          </div>
        )}

        {/* Root context menu for creating collections */}
        <RootContextMenu onCreateCollection={() => void createCollection('New Collection')} />
      </div>

      <DragOverlay>
        {activeItem && (
          <DragOverlayItem
            name={activeItem.name}
            type={activeItem.type}
            method={activeItem.method}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getChildrenAtPath(
  collectionSlug: string,
  parentPath: string[],
  collections: CollectionItem[],
): TreeChild[] {
  const coll = collections.find((c) => c.slug === collectionSlug);
  if (!coll) return [];
  let children: TreeChild[] = coll.children;
  for (const seg of parentPath) {
    const folder = children.find((c) => c.type === 'folder' && c.slug === seg);
    if (!folder || folder.type !== 'folder') return [];
    children = folder.children;
  }
  return children;
}

// ── Root context menu ─────────────────────────────────────────────────────────

interface RootContextMenuProps {
  onCreateCollection: () => void;
}

function RootContextMenu({ onCreateCollection }: RootContextMenuProps) {
  const { contextMenuNodeId, contextMenuPosition, setContextMenu } = useCollectionStore();

  const isOpen = contextMenuNodeId === '__root__' && contextMenuPosition !== null;

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = () => setContextMenu(null, null);
    const handleBlur = () => setContextMenu(null, null);
    window.addEventListener('click', handleClick);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isOpen, setContextMenu]);

  if (!isOpen || !contextMenuPosition) return null;

  const handleAction = () => {
    setContextMenu(null, null);
    onCreateCollection();
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: contextMenuPosition.x,
        top: contextMenuPosition.y,
        zIndex: 9999,
      }}
      className="bg-content1 border border-divider rounded-lg shadow-lg py-1 min-w-[160px]"
    >
      <button
        className="w-full text-left px-3 py-1.5 text-sm hover:bg-default-100 cursor-pointer"
        onClick={handleAction}
      >
        New Collection
      </button>
    </div>
  );
}
