import { useEffect, useState } from 'react';
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
} from '@heroui/react';
import { useCollectionStore } from '../../stores/collectionStore';
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
  } = useCollectionStore();

  const nodeId =
    parentPath.length > 0
      ? `${collectionSlug}/${parentPath.join('/')}/${slug}`
      : `${collectionSlug}/${slug}`;

  const isOpen = contextMenuNodeId === nodeId && contextMenuPosition !== null;
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Close context menu when window loses focus
  useEffect(() => {
    const handleBlur = () => setContextMenu(null, null);
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [setContextMenu]);

  const handleOpenChange = (open: boolean) => {
    if (!open) setContextMenu(null, null);
  };

  const handleAction = (key: React.Key) => {
    setContextMenu(null, null);
    switch (key) {
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
    }
  };

  const handleDeleteConfirm = () => {
    setShowDeleteModal(false);
    void deleteNode(collectionSlug, parentPath, slug, nodeType !== 'request');
  };

  if (!isOpen && !showDeleteModal) return null;

  return (
    <>
      {isOpen && contextMenuPosition && (
        <Dropdown
          isOpen={isOpen}
          onOpenChange={handleOpenChange}
          placement="bottom-start"
        >
          <DropdownTrigger>
            <span
              style={{
                position: 'fixed',
                left: contextMenuPosition.x,
                top: contextMenuPosition.y,
                width: 0,
                height: 0,
                display: 'block',
              }}
            />
          </DropdownTrigger>
          <DropdownMenu
            aria-label="Node actions"
            onAction={handleAction}
          >
            <DropdownSection showDivider>
              <DropdownItem key="new-request">New Request</DropdownItem>
              {nodeType !== 'request' ? (
                <DropdownItem key="new-folder">New Folder</DropdownItem>
              ) : null}
            </DropdownSection>
            <DropdownSection>
              <DropdownItem key="rename">Rename</DropdownItem>
              {nodeType === 'request' ? (
                <DropdownItem key="duplicate">Duplicate</DropdownItem>
              ) : null}
              <DropdownItem key="delete" color="danger" className="text-danger">
                Delete
              </DropdownItem>
            </DropdownSection>
          </DropdownMenu>
        </Dropdown>
      )}

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
