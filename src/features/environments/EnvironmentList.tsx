import { useState } from 'react';
import { Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import type { EnvironmentSummary } from '../../types/environments';
import { useEnvironmentStore } from '../../stores/environmentStore';

interface EnvironmentListProps {
  environments: EnvironmentSummary[];
  selectedSlug: string | null;
  activeSlug: string | null;
  onSelect: (slug: string) => void;
  workspaceId: string;
}

export default function EnvironmentList({
  environments,
  selectedSlug,
  activeSlug,
  onSelect,
  workspaceId,
}: EnvironmentListProps) {
  const [renamingSlug, setRenamingSlug] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState<string | null>(null);

  const handleStartRename = (env: EnvironmentSummary) => {
    setRenamingSlug(env.slug);
    setRenameValue(env.name);
  };

  const handleRenameCommit = async () => {
    if (!renamingSlug || !renameValue.trim()) {
      setRenamingSlug(null);
      return;
    }
    await useEnvironmentStore.getState().renameEnvironment(workspaceId, renamingSlug, renameValue.trim());
    setRenamingSlug(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      void handleRenameCommit();
    } else if (e.key === 'Escape') {
      setRenamingSlug(null);
    }
  };

  const handleDeleteRequest = (slug: string) => {
    setDeleteConfirmSlug(slug);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmSlug) return;
    await useEnvironmentStore.getState().deleteEnvironment(workspaceId, deleteConfirmSlug);
    setDeleteConfirmSlug(null);
  };

  const handleNewEnvironment = async () => {
    await useEnvironmentStore.getState().createEnvironment(workspaceId, 'New Environment');
    // The store reloads environments — after reload, environments will be updated
    // Select the last one (newly created) via a side effect in parent
  };

  const deleteTargetEnv = environments.find((e) => e.slug === deleteConfirmSlug);

  return (
    <div className="flex flex-col w-60 border-r border-divider pr-3 mr-3">
      <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
        {environments.map((env) => (
          <div
            key={env.slug}
            className={`group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer ${
              selectedSlug === env.slug ? 'bg-content2' : 'hover:bg-content2/60'
            }`}
            onClick={() => onSelect(env.slug)}
          >
            {/* Active indicator dot */}
            <div
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                activeSlug === env.slug ? 'bg-success' : 'bg-transparent'
              }`}
              data-testid={`active-dot-${env.slug}`}
            />

            {/* Name or rename input */}
            {renamingSlug === env.slug ? (
              <Input
                autoFocus
                size="sm"
                variant="bordered"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => void handleRenameCommit()}
                onKeyDown={handleRenameKeyDown}
                className="flex-1 -my-1"
                aria-label="Rename environment"
                data-testid={`rename-input-${env.slug}`}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 text-sm truncate select-none">{env.name}</span>
            )}

            {/* Action buttons (visible on hover) */}
            {renamingSlug !== env.slug && (
              <div className="hidden group-hover:flex items-center gap-0.5">
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  aria-label="Rename environment"
                  data-testid={`rename-btn-${env.slug}`}
                  onPress={() => handleStartRename(env)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-6 h-6 min-w-0 text-default-400"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-3.5 h-3.5"
                  >
                    <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z" />
                    <path d="M5.25 5.25a3 3 0 00-3 3v10.5a3 3 0 003 3h10.5a3 3 0 003-3V13.5a.75.75 0 00-1.5 0v5.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V8.25a1.5 1.5 0 011.5-1.5h5.25a.75.75 0 000-1.5H5.25z" />
                  </svg>
                </Button>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  aria-label="Delete environment"
                  data-testid={`delete-btn-${env.slug}`}
                  onPress={() => handleDeleteRequest(env.slug)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-6 h-6 min-w-0 text-danger"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-3.5 h-3.5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.769l-1.005-13.07-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New Environment button */}
      <Button
        variant="light"
        size="sm"
        className="mt-3 self-start"
        onPress={() => void handleNewEnvironment()}
        data-testid="new-environment-btn"
      >
        + New Environment
      </Button>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteConfirmSlug !== null}
        onClose={() => setDeleteConfirmSlug(null)}
        size="sm"
      >
        <ModalContent>
          <ModalHeader>Delete Environment</ModalHeader>
          <ModalBody>
            <p className="text-sm">
              Are you sure you want to delete{' '}
              <strong>{deleteTargetEnv?.name ?? 'this environment'}</strong>? This action cannot be
              undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" size="sm" onPress={() => setDeleteConfirmSlug(null)}>
              Cancel
            </Button>
            <Button
              color="danger"
              size="sm"
              onPress={() => void handleDeleteConfirm()}
              data-testid="confirm-delete-btn"
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
