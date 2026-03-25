import { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react';
import * as environmentsApi from '../../api/environments';
import { useEnvironmentStore } from '../../stores/environmentStore';
import type { EnvironmentFile } from '../../types/environments';
import EnvironmentList from './EnvironmentList';
import VariableEditor from './VariableEditor';

interface EnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

export default function EnvironmentModal({ isOpen, onClose, workspaceId }: EnvironmentModalProps) {
  const { environments, activeEnvSlug } = useEnvironmentStore();
  const [selectedEnvSlug, setSelectedEnvSlug] = useState<string | null>(null);
  const [loadedEnv, setLoadedEnv] = useState<EnvironmentFile | null>(null);
  const [loadedSecrets, setLoadedSecrets] = useState<Record<string, string>>({});

  // Load variables when an environment is selected
  useEffect(() => {
    if (!selectedEnvSlug || !workspaceId) {
      setLoadedEnv(null);
      setLoadedSecrets({});
      return;
    }

    void (async () => {
      const [envFile, secrets] = await Promise.all([
        environmentsApi.loadEnvironment(workspaceId, selectedEnvSlug),
        environmentsApi.loadSecretValues(workspaceId, selectedEnvSlug),
      ]);
      setLoadedEnv(envFile);
      setLoadedSecrets(secrets);
    })();
  }, [selectedEnvSlug, workspaceId]);

  // When environments list changes (e.g. after create), auto-select last if nothing selected
  useEffect(() => {
    if (environments.length > 0 && selectedEnvSlug === null) {
      setSelectedEnvSlug(environments[0].slug);
    }
    // If selected env was deleted, clear selection
    if (selectedEnvSlug && !environments.some((e) => e.slug === selectedEnvSlug)) {
      setSelectedEnvSlug(environments.length > 0 ? environments[0].slug : null);
    }
  }, [environments, selectedEnvSlug]);

  const handleSave = async (
    updatedVariables: EnvironmentFile['variables'],
    updatedSecrets: Record<string, string>,
  ) => {
    if (!selectedEnvSlug || !loadedEnv) return;

    const updatedEnvFile: EnvironmentFile = {
      ...loadedEnv,
      variables: updatedVariables,
    };

    await environmentsApi.saveEnvironment(workspaceId, selectedEnvSlug, updatedEnvFile);
    await environmentsApi.saveSecretValues(workspaceId, selectedEnvSlug, updatedSecrets);

    // If the saved env is the active one, refresh the resolved variable values
    if (selectedEnvSlug === activeEnvSlug) {
      await useEnvironmentStore.getState().refreshActiveVariables(workspaceId);
    }

    // Update local state to reflect save
    setLoadedEnv(updatedEnvFile);
    setLoadedSecrets(updatedSecrets);
  };

  const handleClose = () => {
    // Refresh env list when modal closes (names may have changed)
    void useEnvironmentStore.getState().loadEnvironments(workspaceId);
    onClose();
  };

  return (
    <Modal size="3xl" isOpen={isOpen} onClose={handleClose} scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>Manage Environments</ModalHeader>
        <ModalBody className="pb-6">
          <div className="flex min-h-64">
            <EnvironmentList
              environments={environments}
              selectedSlug={selectedEnvSlug}
              activeSlug={activeEnvSlug}
              onSelect={setSelectedEnvSlug}
              workspaceId={workspaceId}
            />
            <div className="flex-1">
              {selectedEnvSlug && loadedEnv ? (
                <VariableEditor
                  variables={loadedEnv.variables}
                  secretValues={loadedSecrets}
                  onSave={(vars, secrets) => void handleSave(vars, secrets)}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-default-400 text-sm">
                  {environments.length === 0
                    ? 'Create an environment to get started'
                    : 'Select an environment to edit its variables'}
                </div>
              )}
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
