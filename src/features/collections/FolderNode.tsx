import type { TreeChild } from '../../types/collections';
import { useCollectionStore } from '../../stores/collectionStore';
import { RenameInput } from './RenameInput';
import { TreeContextMenu } from './TreeContextMenu';
import { RequestNode } from './RequestNode';

interface FolderNodeProps {
  folder: TreeChild & { type: 'folder' };
  depth: number;
  collectionSlug: string;
  parentPath: string[];
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

export function FolderNode({ folder, depth, collectionSlug, parentPath }: FolderNodeProps) {
  const {
    expandedNodes,
    renamingNodeId,
    toggleExpanded,
    setContextMenu,
    setRenamingNode,
    renameNode,
  } = useCollectionStore();

  const nodeId =
    parentPath.length > 0
      ? `${collectionSlug}/${parentPath.join('/')}/${folder.slug}`
      : `${collectionSlug}/${folder.slug}`;

  const isExpanded = expandedNodes.has(nodeId);
  const isRenaming = renamingNodeId === nodeId;
  const childCount = countChildren(folder.children);
  const childParentPath = [...parentPath, folder.slug];

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu(nodeId, { x: e.clientX, y: e.clientY });
  };

  const handleRenameConfirm = (newName: string) => {
    setRenamingNode(null);
    void renameNode(collectionSlug, parentPath, folder.slug, newName, true);
  };

  const handleRenameCancel = () => {
    setRenamingNode(null);
  };

  return (
    <div>
      <div
        className="flex items-center gap-1 px-2 py-1 cursor-pointer rounded-sm select-none hover:bg-default-100"
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
          className="shrink-0 text-default-400"
        >
          <path d="M1 3a1 1 0 011-1h3.586a1 1 0 01.707.293L7 3h5a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V3z" />
        </svg>
        {isRenaming ? (
          <RenameInput
            currentName={folder.name}
            onConfirm={handleRenameConfirm}
            onCancel={handleRenameCancel}
          />
        ) : (
          <span className="text-sm truncate">{folder.name}</span>
        )}
        <TreeContextMenu
          nodeType="folder"
          collectionSlug={collectionSlug}
          parentPath={parentPath}
          slug={folder.slug}
          nodeName={folder.name}
          childCount={childCount}
        />
      </div>
      {isExpanded && (
        <div>
          {folder.children.map((child) =>
            child.type === 'folder' ? (
              <FolderNode
                key={child.slug}
                folder={child}
                depth={depth + 1}
                collectionSlug={collectionSlug}
                parentPath={childParentPath}
              />
            ) : (
              <RequestNode
                key={child.slug}
                request={child}
                depth={depth + 1}
                collectionSlug={collectionSlug}
                parentPath={childParentPath}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}
