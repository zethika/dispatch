import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react';
import { useUiStore } from '../../stores/uiStore';

const SHORTCUTS = [
  { keys: 'Cmd + Enter', label: 'Send request' },
  { keys: 'Cmd + N', label: 'New request' },
  { keys: 'Cmd + Shift + N', label: 'New collection' },
  { keys: 'Cmd + K', label: 'Search' },
  { keys: 'Cmd + E', label: 'Switch environment' },
  { keys: 'Cmd + Shift + C', label: 'Copy as cURL' },
  { keys: 'Cmd + W', label: 'Close request' },
  { keys: 'Cmd + S', label: 'Force sync' },
  { keys: 'Cmd + /', label: 'This cheatsheet' },
];

export default function ShortcutCheatsheet() {
  const { cheatsheetOpen, setCheatsheetOpen } = useUiStore();

  return (
    <Modal
      isOpen={cheatsheetOpen}
      onClose={() => setCheatsheetOpen(false)}
      size="md"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">Keyboard Shortcuts</ModalHeader>
        <ModalBody className="pb-6">
          <div className="grid grid-cols-1 gap-2">
            {SHORTCUTS.map((shortcut) => (
              <div key={shortcut.keys} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{shortcut.label}</span>
                <kbd className="text-xs font-semibold font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {shortcut.keys}
                </kbd>
              </div>
            ))}
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
