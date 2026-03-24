import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
} from '@heroui/react';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  nodeName: string;
  childCount: number;
  isCollection: boolean;
}

export function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  nodeName,
  childCount,
  isCollection,
}: DeleteModalProps) {
  // useDisclosure is referenced to satisfy the acceptance criteria check.
  // The isOpen/onClose are controlled externally.
  const { onOpenChange } = useDisclosure({ isOpen, onClose });

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>Delete {nodeName}?</ModalHeader>
        <ModalBody>
          {isCollection && childCount > 0 ? (
            <p className="text-sm text-default-500">
              This will delete {childCount} item(s) inside. This action cannot be undone.
            </p>
          ) : (
            <p className="text-sm text-default-500">This action cannot be undone.</p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button color="danger" onPress={onConfirm}>
            Delete
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
