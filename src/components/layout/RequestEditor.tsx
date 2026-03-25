import { Tab, Tabs } from '@heroui/react';
import { useEffect, useRef } from 'react';
import { loadRequest, saveRequest } from '../../api/http';
import AuthEditor from '../../features/http/AuthEditor';
import BodyEditor from '../../features/http/BodyEditor';
import KeyValueEditor from '../../features/http/KeyValueEditor';
import UrlBar from '../../features/http/UrlBar';
import { useCollectionStore } from '../../stores/collectionStore';
import { useRequestStore } from '../../stores/requestStore';

export default function RequestEditor() {
  const activeRequestId = useCollectionStore((s) => s.activeRequestId);
  const workspaceId = useCollectionStore((s) => s.workspaceId);

  const headers = useRequestStore((s) => s.headers);
  const queryParams = useRequestStore((s) => s.queryParams);
  const body = useRequestStore((s) => s.body);
  const auth = useRequestStore((s) => s.auth);
  const method = useRequestStore((s) => s.method);
  const url = useRequestStore((s) => s.url);
  const activeRequestMeta = useRequestStore((s) => s.activeRequestMeta);
  const setHeaders = useRequestStore((s) => s.setHeaders);
  const setQueryParams = useRequestStore((s) => s.setQueryParams);
  const setBody = useRequestStore((s) => s.setBody);
  const setAuth = useRequestStore((s) => s.setAuth);

  // Track whether a request has been loaded (to skip auto-save on first render)
  const hasLoadedRef = useRef(false);

  // Load the request when activeRequestId changes
  useEffect(() => {
    if (!activeRequestId || !workspaceId) {
      hasLoadedRef.current = false;
      return;
    }

    // Parse activeRequestId: "collectionSlug/parentPath.../slug"
    const segments = activeRequestId.split('/');
    const collectionSlug = segments[0];
    const slug = segments[segments.length - 1];
    const parentPath = segments.slice(1, segments.length - 1);

    hasLoadedRef.current = false;

    loadRequest({ workspaceId, collectionSlug, parentPath, slug })
      .then((file) => {
        useRequestStore.getState().loadFromFile(file, {
          workspaceId,
          collectionSlug,
          parentPath,
          slug,
        });
        hasLoadedRef.current = true;
      })
      .catch((err) => {
        console.error('Failed to load request:', err);
      });
  }, [activeRequestId, workspaceId]);

  // Debounced auto-save when draft fields change
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hasLoadedRef.current || !activeRequestMeta) return;

    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      if (!activeRequestMeta) return;
      saveRequest({
        ...activeRequestMeta,
        request: {
          name: activeRequestMeta.slug,
          method,
          url,
          headers,
          queryParams,
          body,
          auth,
        },
      }).catch((err) => {
        console.error('Failed to auto-save request:', err);
      });
    }, 500);

    return () => {
      if (saveTimerRef.current !== null) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [method, url, headers, queryParams, body, auth, activeRequestMeta]);

  if (!activeRequestId) {
    return (
      <div
        data-testid="request-editor"
        className="flex flex-col h-full items-center justify-center"
      >
        <p className="text-sm text-default-400">Select a request from the sidebar</p>
      </div>
    );
  }

  return (
    <div data-testid="request-editor" className="flex flex-col h-full p-4 gap-3">
      <UrlBar />

      <div className="overflow-y-auto flex-1">
        <Tabs variant="underlined" aria-label="Request tabs">
          <Tab key="params" title="Params">
            <div className="pt-2">
              <KeyValueEditor
                entries={queryParams}
                onChange={setQueryParams}
                keyPlaceholder="Parameter"
                valuePlaceholder="Value"
              />
            </div>
          </Tab>
          <Tab key="headers" title="Headers">
            <div className="pt-2">
              <KeyValueEditor
                entries={headers}
                onChange={setHeaders}
                keyPlaceholder="Header"
                valuePlaceholder="Value"
              />
            </div>
          </Tab>
          <Tab key="body" title="Body">
            <div className="pt-2">
              <BodyEditor body={body} onChange={setBody} />
            </div>
          </Tab>
          <Tab key="auth" title="Auth">
            <div className="pt-2">
              <AuthEditor auth={auth} onChange={setAuth} />
            </div>
          </Tab>
        </Tabs>
      </div>
    </div>
  );
}
