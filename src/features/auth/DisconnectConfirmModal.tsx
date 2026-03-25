import { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from '@heroui/react';
import { useWorkspaceStore } from '../../stores/workspaceStore';

interface DisconnectConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceName: string;
  workspaceId: string;
}

export default function DisconnectConfirmModal({
  isOpen,
  onClose,
  workspaceName,
  workspaceId,
}: DisconnectConfirmModalProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await useWorkspaceStore.getState().disconnectWorkspace(workspaceId);
    } finally {
      setIsDisconnecting(false);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>Disconnect {workspaceName}?</ModalHeader>
        <ModalBody>
          <p className="text-sm text-default-500">
            This removes the local copy. Your data is still on GitHub.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Keep Workspace
          </Button>
          <Button
            color="danger"
            onPress={() => void handleDisconnect()}
            isLoading={isDisconnecting}
          >
            Disconnect
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
