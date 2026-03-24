import type { TreeChild } from '../../types/collections';
import { useCollectionStore } from '../../stores/collectionStore';
import { MethodBadge } from './MethodBadge';
import { RenameInput } from './RenameInput';
import { TreeContextMenu } from './TreeContextMenu';

interface RequestNodeProps {
  request: TreeChild & { type: 'request' };
  depth: number;
  collectionSlug: string;
  parentPath: string[];
}

export function RequestNode({ request, depth, collectionSlug, parentPath }: RequestNodeProps) {
  const {
    activeRequestId,
    renamingNodeId,
    setActiveRequest,
    setContextMenu,
    setRenamingNode,
    renameNode,
  } = useCollectionStore();

  const nodeId =
    parentPath.length > 0
      ? `${collectionSlug}/${parentPath.join('/')}/${request.slug}`
      : `${collectionSlug}/${request.slug}`;

  const isActive = activeRequestId === nodeId;
  const isRenaming = renamingNodeId === nodeId;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu(nodeId, { x: e.clientX, y: e.clientY });
  };

  const handleRenameConfirm = (newName: string) => {
    setRenamingNode(null);
    void renameNode(collectionSlug, parentPath, request.slug, newName, false);
  };

  const handleRenameCancel = () => {
    setRenamingNode(null);
  };

  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 cursor-pointer rounded-sm select-none ${
        isActive ? 'bg-default-200' : 'hover:bg-default-100'
      }`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={() => setActiveRequest(nodeId)}
      onContextMenu={handleContextMenu}
    >
      <MethodBadge method={request.method} />
      {isRenaming ? (
        <RenameInput
          currentName={request.name}
          onConfirm={handleRenameConfirm}
          onCancel={handleRenameCancel}
        />
      ) : (
        <span className="text-sm truncate">{request.name}</span>
      )}
      <TreeContextMenu
        nodeType="request"
        collectionSlug={collectionSlug}
        parentPath={parentPath}
        slug={request.slug}
        nodeName={request.name}
        childCount={0}
      />
    </div>
  );
}
