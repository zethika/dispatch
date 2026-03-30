import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { CollectionItem, TreeChild } from '../../types/collections';
import { useCollectionStore } from '../../stores/collectionStore';
import { RenameInput } from './RenameInput';
import { TreeContextMenu } from './TreeContextMenu';
import { FolderNode } from './FolderNode';
import { RequestNode } from './RequestNode';

interface CollectionNodeProps {
  collection: CollectionItem;
  depth: number;
  overId: string | null;
}

function countChildren(children: TreeChild[]): number {
  let count = 0;
  for (const child of children) {
    count += 1;
    if (child.type === 'folder') {
      count += countChildren(child.children);
    }
  }
  return count;
}

export function CollectionNode({ collection, depth, overId }: CollectionNodeProps) {
  const {
    expandedNodes,
    renamingNodeId,
    toggleExpanded,
    setContextMenu,
    setRenamingNode,
    renameCollection,
  } = useCollectionStore();

  const nodeId = collection.slug;
  const isExpanded = expandedNodes.has(nodeId);
  const isRenaming = renamingNodeId === nodeId;
  const childCount = countChildren(collection.children);

  // Build nodeId strings for direct children (for SortableContext)
  const childNodeIds = collection.children.map((child) =>
    `${collection.slug}/${child.slug}`,
  );

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu(nodeId, { x: e.clientX, y: e.clientY });
  };

  const handleRenameConfirm = (newName: string) => {
    setRenamingNode(null);
    void renameCollection(collection.slug, newName);
  };

  const handleRenameCancel = () => {
    setRenamingNode(null);
  };

  // Show drop highlight when something is dragged over the collection header
  const isDropTarget = overId === collection.slug;

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 cursor-pointer rounded-sm select-none hover:bg-default-100 ${
          isDropTarget ? 'border border-primary' : ''
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => toggleExpanded(nodeId)}
        onContextMenu={handleContextMenu}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="currentColor"
          className="shrink-0 text-default-400 transition-transform duration-150"
          style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          <path d="M4 2l4 4-4 4V2z" />
        </svg>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="currentColor"
          className="shrink-0 text-default-500"
        >
          <path d="M1 3a1 1 0 011-1h3.586a1 1 0 01.707.293L7 3h5a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V3z" />
        </svg>
        {isRenaming ? (
          <RenameInput
            currentName={collection.name}
            onConfirm={handleRenameConfirm}
            onCancel={handleRenameCancel}
          />
        ) : (
          <span className="text-sm font-medium truncate">{collection.name}</span>
        )}
        <TreeContextMenu
          nodeType="collection"
          collectionSlug={collection.slug}
          parentPath={[]}
          slug={collection.slug}
          nodeName={collection.name}
          childCount={childCount}
        />
      </div>
      {isExpanded && (
        <SortableContext items={childNodeIds} strategy={verticalListSortingStrategy}>
          <div>
            {collection.children.map((child) =>
              child.type === 'folder' ? (
                <FolderNode
                  key={child.slug}
                  folder={child}
                  depth={depth + 1}
                  collectionSlug={collection.slug}
                  parentPath={[]}
                />
              ) : (
                <RequestNode
                  key={child.slug}
                  request={child}
                  depth={depth + 1}
                  collectionSlug={collection.slug}
                  parentPath={[]}
                />
              ),
            )}
          </div>
        </SortableContext>
      )}
    </div>
  );
}
