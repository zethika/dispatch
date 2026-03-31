import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Textarea,
} from '@heroui/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { parseCurl, type ParsedCurl } from '../../utils/curl';
import { useRequestStore } from '../../stores/requestStore';

interface CurlImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function applyParsedCurl(parsed: ParsedCurl) {
  const store = useRequestStore.getState();
  store.setMethod(parsed.method);
  store.setUrl(parsed.url);

  // Check for Authorization Bearer header and extract to auth
  const authEntry = Object.entries(parsed.headers).find(
    ([k]) => k.toLowerCase() === 'authorization',
  );

  const nonAuthHeaders = Object.entries(parsed.headers)
    .filter(([k]) => k.toLowerCase() !== 'authorization')
    .map(([key, value]) => ({ key, value, enabled: true }));

  store.setHeaders(nonAuthHeaders);

  if (authEntry && authEntry[1].startsWith('Bearer ')) {
    store.setAuth({ type: 'bearer', token: authEntry[1].slice(7) });
  } else {
    // If there's an Authorization header that's not Bearer, add it back to headers
    if (authEntry) {
      store.setHeaders([...nonAuthHeaders, { key: authEntry[0], value: authEntry[1], enabled: true }]);
    }
    store.setAuth(null);
  }

  if (parsed.body) {
    store.setBody({ type: 'json', content: parsed.body });
  } else {
    store.setBody(null);
  }
}

export { applyParsedCurl };

export default function CurlImportModal({ isOpen, onClose }: CurlImportModalProps) {
  const [value, setValue] = useState('');

  const handleImport = async () => {
    const parsed = await parseCurl(value.trim());
    if (parsed) {
      applyParsedCurl(parsed);
      toast.success('cURL imported');
      setValue('');
      onClose();
    } else {
      toast.warning('Could not parse cURL command');
    }
  };

  const handleClose = () => {
    setValue('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalContent>
        <ModalHeader>Import cURL Command</ModalHeader>
        <ModalBody>
          <p className="text-sm text-default-500 mb-2">
            Paste a cURL command to import it as the current request.
          </p>
          <Textarea
            placeholder="curl https://api.example.com -H 'Authorization: Bearer token'"
            value={value}
            onValueChange={setValue}
            minRows={4}
            maxRows={10}
            autoFocus
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={handleClose}>
            Cancel
          </Button>
          <Button color="primary" onPress={handleImport} isDisabled={!value.trim()}>
            Import
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
