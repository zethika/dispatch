import { useEffect } from 'react';
import { useCollectionStore } from '../../stores/collectionStore';
import { CollectionNode } from './CollectionNode';

export function CollectionTree() {
  const { collections, workspaceName, createCollection, setContextMenu } =
    useCollectionStore();

  const handleRootContextMenu = (e: React.MouseEvent) => {
    // Always prevent native context menu in the tree area.
    // Child nodes (CollectionNode, etc.) call e.stopPropagation(),
    // so this only fires for empty space / non-interactive elements.
    e.preventDefault();
    setContextMenu('__root__', { x: e.clientX, y: e.clientY });
  };

  return (
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
            <CollectionNode key={collection.slug} collection={collection} depth={0} />
          ))}
        </div>
      )}

      {/* Root context menu for creating collections */}
      <RootContextMenu onCreateCollection={() => void createCollection('New Collection')} />
    </div>
  );
}

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
