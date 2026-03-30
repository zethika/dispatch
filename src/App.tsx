import { useEffect } from 'react';
import { toast, Toaster } from 'sonner';
import { getCurrentWindow } from '@tauri-apps/api/window';
import TopBar from './components/layout/TopBar';
import Sidebar from './components/layout/Sidebar';
import RightPanel from './components/layout/RightPanel';
import ShortcutCheatsheet from './features/shortcuts/ShortcutCheatsheet';
import { ensureDefaultWorkspace } from './api/collections';
import { useCollectionStore } from './stores/collectionStore';
import { useAuthStore } from './stores/authStore';
import { useWorkspaceStore } from './stores/workspaceStore';
import { useRequestStore } from './stores/requestStore';
import { useEnvironmentStore } from './stores/environmentStore';
import { useUiStore } from './stores/uiStore';
import { useSyncStore } from './stores/syncStore';
import { buildCurlString } from './utils/curl';

function flashElement(shortcutId: string) {
  const el = document.querySelector(`[data-shortcut-id="${shortcutId}"]`);
  if (!el) return;
  el.classList.add('ring-2', 'ring-primary', 'ring-offset-1', 'rounded');
  setTimeout(() => {
    el.classList.remove('ring-2', 'ring-primary', 'ring-offset-1', 'rounded');
  }, 300);
}

export default function App() {
  const { workspaceId, loadWorkspace } = useCollectionStore();
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (workspaceId) return;
    ensureDefaultWorkspace()
      .then((id) => {
        // Load the workspace registry so WorkspaceSwitcher populates
        void useWorkspaceStore.getState().loadWorkspaces();
        return loadWorkspace(id);
      })
      .catch(console.error);
  }, [workspaceId, loadWorkspace]);

  // SYNC-03: Pull from remote when macOS window regains focus (D-08)
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getCurrentWindow()
      .onFocusChanged(({ payload: focused }) => {
        if (focused) {
          const { activeWorkspaceId, workspaces } = useWorkspaceStore.getState();
          const workspace = workspaces.find((w) => w.id === activeWorkspaceId);
          if (workspace && !workspace.is_local && workspace.clone_url) {
            void useSyncStore.getState().triggerPull(workspace.id);
          }
        }
      })
      .then((fn) => {
        unlisten = fn;
      });
    return () => unlisten?.();
  }, []);

  // Global keyboard shortcuts (D-10: fire from anywhere including text inputs)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+Enter — send request (KEY-01)
      if (e.metaKey && !e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        void useRequestStore.getState().sendRequest();
        flashElement('send-button');
        return;
      }
      // Cmd+N — new request (KEY-02)
      if (e.metaKey && !e.shiftKey && e.key === 'n') {
        e.preventDefault();
        const { collections, activeRequestId } = useCollectionStore.getState();
        const collSlug = activeRequestId?.split('/')[0] ?? collections[0]?.slug;
        if (collSlug) {
          void useCollectionStore.getState().createRequest(collSlug, [], 'New Request');
        }
        flashElement('new-request');
        return;
      }
      // Cmd+Shift+N — new collection (KEY-03)
      if (e.metaKey && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        void useCollectionStore.getState().createCollection('New Collection');
        flashElement('sidebar-area');
        return;
      }
      // Cmd+K — open search (KEY-04)
      if (e.metaKey && !e.shiftKey && e.key === 'k') {
        e.preventDefault();
        useUiStore.getState().setSearchOpen(true);
        flashElement('search-icon');
        return;
      }
      // Cmd+E — cycle environment (KEY-05)
      if (e.metaKey && !e.shiftKey && e.key === 'e') {
        e.preventDefault();
        const envStore = useEnvironmentStore.getState();
        const envs = envStore.environments;
        const wsId = useCollectionStore.getState().workspaceId;
        if (envs.length > 0 && wsId) {
          const currentSlug = envStore.activeEnvSlug;
          const currentIdx = envs.findIndex((env) => env.slug === currentSlug);
          const nextIdx = (currentIdx + 1) % envs.length;
          void envStore.setActiveEnvironment(wsId, envs[nextIdx].slug);
          toast.success(`Environment: ${envs[nextIdx].name}`);
        }
        flashElement('env-selector');
        return;
      }
      // Cmd+Shift+C — copy as cURL (KEY-06)
      if (e.metaKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        const req = useRequestStore.getState();
        if (req.activeRequestMeta) {
          const vars = useEnvironmentStore.getState().activeEnvVariables;
          const curlStr = buildCurlString(req.method, req.url, req.headers, req.body, req.auth, vars);
          void navigator.clipboard.writeText(curlStr);
          toast.success('Copied as cURL');
        }
        flashElement('url-bar');
        return;
      }
      // Cmd+W — close request (KEY-07)
      if (e.metaKey && !e.shiftKey && e.key === 'w') {
        e.preventDefault();
        useCollectionStore.getState().setActiveRequest(null);
        flashElement('active-tab');
        return;
      }
      // Cmd+S — force sync (KEY-08)
      if (e.metaKey && !e.shiftKey && e.key === 's') {
        e.preventDefault();
        const wsId = useCollectionStore.getState().workspaceId;
        if (wsId) {
          void useSyncStore.getState().triggerSync(wsId);
        }
        flashElement('sync-chip');
        return;
      }
      // Cmd+/ — cheatsheet (D-11)
      if (e.metaKey && e.key === '/') {
        e.preventDefault();
        useUiStore.getState().setCheatsheetOpen(true);
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <RightPanel />
      </div>
      <Toaster position="bottom-right" richColors />
      <ShortcutCheatsheet />
    </div>
  );
}
