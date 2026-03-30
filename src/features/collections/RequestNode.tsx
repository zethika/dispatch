import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TreeChild } from '../../types/collections';
import { useCollectionStore } from '../../stores/collectionStore';
import { MethodBadge } from './MethodBadge';
import { RenameInput } from './RenameInput';
import { TreeContextMenu } from './TreeContextMenu';
import DropIndicator from './DropIndicator';

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

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: nodeId });

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
    <>
      {isOver && !isDragging && <DropIndicator />}
      <div
        ref={setNodeRef}
        style={{
          paddingLeft: `${depth * 16 + 8}px`,
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.4 : 1,
        }}
        {...attributes}
        {...listeners}
        className={`flex items-center gap-1 px-2 py-1 cursor-pointer rounded-sm select-none ${
          isActive ? 'bg-default-200' : 'hover:bg-default-100'
        }`}
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
    </>
  );
}
