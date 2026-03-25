import { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Spinner,
} from '@heroui/react';
import { toast } from 'sonner';
import * as authApi from '../../api/auth';
import type { DeviceCodeResponse } from '../../api/auth';
import { useAuthStore } from '../../stores/authStore';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type LoginStatus = 'idle' | 'fetching' | 'awaiting' | 'success' | 'expired' | 'error';

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [status, setStatus] = useState<LoginStatus>('idle');
  const [deviceCode, setDeviceCode] = useState<DeviceCodeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // On open: fetch device code
  useEffect(() => {
    if (!isOpen || status !== 'idle') return;

    setStatus('fetching');
    void (async () => {
      try {
        const response = await authApi.initiateLogin();
        setDeviceCode(response);
        setStatus('awaiting');
      } catch {
        setErrorMessage('Could not reach GitHub. Check your connection.');
        setStatus('error');
      }
    })();
  }, [isOpen, status]);

  // Poll for approval when awaiting
  useEffect(() => {
    if (status !== 'awaiting' || !deviceCode) return;

    void (async () => {
      try {
        const user = await authApi.pollLogin(deviceCode.device_code, deviceCode.interval);
        useAuthStore.getState().setUser(user);
        toast.success(`Signed in as @${user.login}`);
        setStatus('success');
        setTimeout(() => onClose(), 100);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.toLowerCase().includes('expired')) {
          setStatus('expired');
        } else if (message.toLowerCase().includes('denied')) {
          onClose();
        } else {
          setErrorMessage('Could not reach GitHub. Check your connection.');
          setStatus('error');
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleClose = () => {
    setStatus('idle');
    setDeviceCode(null);
    setErrorMessage('');
    onClose();
  };

  const handleRetry = () => {
    setStatus('idle');
    setDeviceCode(null);
    setErrorMessage('');
  };

  const handleCopyAndOpen = async () => {
    if (!deviceCode) return;
    await navigator.clipboard.writeText(deviceCode.user_code);
    window.open(deviceCode.verification_uri, '_blank');
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalContent>
        <ModalHeader className="text-base font-semibold">Sign in with GitHub</ModalHeader>

        <ModalBody>
          {status === 'fetching' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Spinner size="md" />
              <span className="text-sm text-default-500">Requesting code...</span>
            </div>
          )}

          {status === 'awaiting' && deviceCode && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-default-500">
                Enter this code at github.com/login/device
              </p>
              <div
                className="text-2xl font-semibold font-mono tracking-widest text-center py-4 bg-content2 rounded-lg select-all cursor-pointer"
                onClick={() => void handleCopyAndOpen()}
              >
                {deviceCode.user_code}
              </div>
              <Button color="primary" onPress={() => void handleCopyAndOpen()}>
                Copy &amp; Open GitHub
              </Button>
              <div className="flex items-center justify-center gap-2">
                <Spinner size="sm" />
                <span className="text-sm text-default-400">Waiting for approval...</span>
              </div>
            </div>
          )}

          {status === 'expired' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-sm text-danger">Code expired. Try again.</p>
              <Button color="primary" variant="flat" onPress={handleRetry}>
                Try Again
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-sm text-danger">{errorMessage}</p>
              <Button color="primary" variant="flat" onPress={handleRetry}>
                Try Again
              </Button>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onPress={handleClose}>
            Cancel Sign-in
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
