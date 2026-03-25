import { render, screen } from '@testing-library/react';
import { HeroUIProvider } from '@heroui/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue('pong'),
}));

vi.mock('../../stores/collectionStore', () => ({
  useCollectionStore: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      activeRequestId: null,
      workspaceId: null,
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('../../stores/requestStore', () => ({
  useRequestStore: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      method: 'GET',
      url: '',
      headers: [],
      queryParams: [],
      body: null,
      auth: null,
      response: { status: 'idle' },
      activeRequestMeta: null,
      setMethod: vi.fn(),
      setUrl: vi.fn(),
      setHeaders: vi.fn(),
      setQueryParams: vi.fn(),
      setBody: vi.fn(),
      setAuth: vi.fn(),
      sendRequest: vi.fn(),
      loadFromFile: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

import RequestEditor from './RequestEditor';

function renderEditor() {
  return render(
    <HeroUIProvider>
      <RequestEditor />
    </HeroUIProvider>
  );
}

describe('RequestEditor (APP-01)', () => {
  it('shows empty state when no request selected', () => {
    renderEditor();
    expect(screen.getByTestId('request-editor')).toBeInTheDocument();
    expect(screen.getByText(/select a request/i)).toBeInTheDocument();
  });

  it('has the request-editor test id', () => {
    renderEditor();
    expect(screen.getByTestId('request-editor')).toBeInTheDocument();
  });
});
