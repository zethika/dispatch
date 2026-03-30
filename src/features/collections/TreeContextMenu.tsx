import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useCollectionStore } from '../../stores/collectionStore';
import { useRequestStore } from '../../stores/requestStore';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { buildCurlString } from '../../utils/curl';
import CurlImportModal from '../http/CurlImportModal';
import { DeleteModal } from './DeleteModal';

interface TreeContextMenuProps {
  nodeType: 'collection' | 'folder' | 'request';
  collectionSlug: string;
  parentPath: string[];
  slug: string;
  nodeName: string;
  childCount: number;
}

export function TreeContextMenu({
  nodeType,
  collectionSlug,
  parentPath,
  slug,
  nodeName,
  childCount,
}: TreeContextMenuProps) {
  const {
    contextMenuNodeId,
    contextMenuPosition,
    setContextMenu,
    setRenamingNode,
    createRequest,
    createFolder,
    duplicateRequest,
    deleteNode,
    deleteCollection,
  } = useCollectionStore();

  // For collections, collectionSlug === slug and parentPath is [],
  // so nodeId is just the slug itself (matching CollectionNode's nodeId).
  const nodeId =
    parentPath.length > 0
      ? `${collectionSlug}/${parentPath.join('/')}/${slug}`
      : collectionSlug === slug
        ? slug
        : `${collectionSlug}/${slug}`;

  const isOpen = contextMenuNodeId === nodeId && contextMenuPosition !== null;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCurlImportModal, setShowCurlImportModal] = useState(false);

  // Close context menu on any click or blur
  useEffect(() => {
    if (!isOpen) return;
    const close = () => setContextMenu(null, null);
    window.addEventListener('click', close);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('blur', close);
    };
  }, [isOpen, setContextMenu]);

  const handleAction = (action: string) => {
    setContextMenu(null, null);
    switch (action) {
      case 'new-request':
        void createRequest(collectionSlug, nodeType === 'folder' ? [...parentPath, slug] : parentPath, 'New Request');
        break;
      case 'new-folder':
        void createFolder(collectionSlug, nodeType === 'folder' ? [...parentPath, slug] : parentPath, 'New Folder');
        break;
      case 'rename':
        setRenamingNode(nodeId);
        break;
      case 'duplicate':
        void duplicateRequest(collectionSlug, parentPath, slug);
        break;
      case 'delete':
        setShowDeleteModal(true);
        break;
      case 'import-curl':
        setShowCurlImportModal(true);
        break;
      case 'copy-as-curl': {
        const store = useRequestStore.getState();
        const vars = useEnvironmentStore.getState().activeEnvVariables;
        const curlStr = buildCurlString(
          store.method,
          store.url,
          store.headers,
          store.body,
          store.auth,
          vars,
        );
        void navigator.clipboard.writeText(curlStr).then(() => {
          toast.success('Copied as cURL');
        });
        break;
      }
    }
  };

  const handleDeleteConfirm = () => {
    setShowDeleteModal(false);
    if (nodeType === 'collection') {
      void deleteCollection(collectionSlug);
    } else {
      void deleteNode(collectionSlug, parentPath, slug, nodeType !== 'request');
    }
  };

  return (
    <>
      {isOpen && contextMenuPosition && (
        <div
          style={{
            position: 'fixed',
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
            zIndex: 9999,
          }}
          className="bg-content1 border border-divider rounded-lg shadow-lg py-1 min-w-[160px]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-default-100 cursor-pointer"
            onClick={() => handleAction('new-request')}
          >
            New Request
          </button>
          {nodeType !== 'request' && (
            <button
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-default-100 cursor-pointer"
              onClick={() => handleAction('new-folder')}
            >
              New Folder
            </button>
          )}
          <div className="my-1 border-t border-divider" />
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-default-100 cursor-pointer"
            onClick={() => handleAction('rename')}
          >
            Rename
          </button>
          {nodeType === 'request' && (
            <button
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-default-100 cursor-pointer"
              onClick={() => handleAction('duplicate')}
            >
              Duplicate
            </button>
          )}
          <div className="my-1 border-t border-divider" />
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-default-100 cursor-pointer"
            onClick={() => handleAction('import-curl')}
          >
            Import cURL
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-default-100 cursor-pointer"
            onClick={() => handleAction('copy-as-curl')}
          >
            Copy as cURL
          </button>
          <div className="my-1 border-t border-divider" />
          <button
            className="w-full text-left px-3 py-1.5 text-sm text-danger hover:bg-default-100 cursor-pointer"
            onClick={() => handleAction('delete')}
          >
            Delete
          </button>
        </div>
      )}

      <CurlImportModal
        isOpen={showCurlImportModal}
        onClose={() => setShowCurlImportModal(false)}
      />

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        nodeName={nodeName}
        childCount={childCount}
        isCollection={nodeType !== 'request'}
      />
    </>
  );
}
