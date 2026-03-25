import { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Spinner,
} from '@heroui/react';
import * as githubApi from '../../api/github';
import type { RepoInfo } from '../../api/github';
import * as workspaceApi from '../../api/workspace';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';

interface RepoBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LockIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const GlobeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function RepoBrowserModal({ isOpen, onClose }: RepoBrowserModalProps) {
  const user = useAuthStore((s) => s.user);
  const [repos, setRepos] = useState<RepoInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cloningRepoId, setCloningRepoId] = useState<number | null>(null);
  const [connectedRepoIds, setConnectedRepoIds] = useState<Set<number>>(new Set());
  const [errorRepoId, setErrorRepoId] = useState<number | null>(null);

  // Load repos and connected workspace list when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    void (async () => {
      try {
        const [repoList, workspaceList] = await Promise.all([
          githubApi.listRepos(),
          workspaceApi.listWorkspaces(),
        ]);
        setRepos(repoList);

        const connectedNames = new Set(
          workspaceList
            .filter((w) => w.github_repo_full_name !== null)
            .map((w) => w.github_repo_full_name as string),
        );
        const connectedIds = new Set(
          repoList
            .filter((r) => connectedNames.has(r.full_name))
            .map((r) => r.id),
        );
        setConnectedRepoIds(connectedIds);
      } catch {
        // Leave repos empty on error
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen]);

  const handleConnect = async (repo: RepoInfo) => {
    setCloningRepoId(repo.id);
    setErrorRepoId(null);

    try {
      const entry = await workspaceApi.connectWorkspace(
        repo.full_name,
        repo.name,
        repo.clone_url,
      );
      setConnectedRepoIds((prev) => new Set([...prev, repo.id]));
      setCloningRepoId(null);
      // Immediately update sidebar workspace list (D-05)
      useWorkspaceStore.getState().addWorkspace(entry);
    } catch {
      setErrorRepoId(repo.id);
      setCloningRepoId(null);
    }
  };

  // Filter repos by search query
  const filteredRepos = repos.filter((r) =>
    r.full_name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Group repos by owner, personal repos first
  const grouped = filteredRepos.reduce<Record<string, RepoInfo[]>>((acc, repo) => {
    const owner = repo.owner.login;
    if (!acc[owner]) acc[owner] = [];
    acc[owner].push(repo);
    return acc;
  }, {});

  const ownerOrder = Object.keys(grouped).sort((a, b) => {
    const userLogin = user?.login ?? '';
    if (a === userLogin) return -1;
    if (b === userLogin) return 1;
    return a.localeCompare(b);
  });

  return (
    <Modal size="2xl" isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader className="text-base font-semibold">Connect a Repository</ModalHeader>

        <ModalBody>
          <Input
            placeholder="Search repositories..."
            isClearable
            value={searchQuery}
            onValueChange={setSearchQuery}
            onClear={() => setSearchQuery('')}
            className="mb-2"
          />

          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : filteredRepos.length === 0 && searchQuery ? (
            <div className="flex justify-center py-8 text-default-400 text-sm">
              No repos match &apos;{searchQuery}&apos;
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="flex justify-center py-8 text-default-400 text-sm text-center">
              No repositories found. Make sure your GitHub account has accessible repos.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {ownerOrder.map((owner) => (
                <div key={owner}>
                  <div className="text-sm font-semibold text-default-500 px-2 py-1 sticky top-0 bg-content1">
                    {owner}
                  </div>
                  {grouped[owner].map((repo) => (
                    <div
                      key={repo.id}
                      className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-content2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm truncate">{repo.name}</span>
                        <span className="flex items-center gap-1 text-xs text-default-400 shrink-0">
                          {repo.private ? (
                            <>
                              <LockIcon />
                              Private
                            </>
                          ) : (
                            <>
                              <GlobeIcon />
                              Public
                            </>
                          )}
                        </span>
                      </div>

                      <div className="shrink-0 ml-2">
                        {cloningRepoId === repo.id ? (
                          <div className="flex items-center gap-2 text-sm text-default-400">
                            <Spinner size="sm" />
                            Cloning...
                          </div>
                        ) : connectedRepoIds.has(repo.id) ? (
                          <div className="flex items-center gap-1 text-sm text-primary">
                            <CheckIcon />
                            Connected
                          </div>
                        ) : errorRepoId === repo.id ? (
                          <Button
                            color="danger"
                            variant="flat"
                            size="sm"
                            onPress={() => void handleConnect(repo)}
                          >
                            Failed — Retry
                          </Button>
                        ) : (
                          <Button
                            color="primary"
                            variant="flat"
                            size="sm"
                            onPress={() => void handleConnect(repo)}
                            isDisabled={cloningRepoId !== null}
                          >
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
