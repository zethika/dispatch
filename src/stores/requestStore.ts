import { create } from 'zustand';
import * as httpApi from '../api/http';
import type { HttpResponse } from '../api/http';
import type { KeyValueEntry, RequestBody, RequestAuth, RequestFile } from '../types/collections';

export type ResponseState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: HttpResponse }
  | { status: 'error'; message: string };

interface ActiveRequestMeta {
  workspaceId: string;
  collectionSlug: string;
  parentPath: string[];
  slug: string;
}

interface RequestStore {
  // Draft fields
  method: string;
  url: string;
  headers: KeyValueEntry[];
  queryParams: KeyValueEntry[];
  body: RequestBody | null;
  auth: RequestAuth | null;
  // Response lifecycle
  response: ResponseState;
  // Tracks which request file is loaded (needed for save)
  activeRequestMeta: ActiveRequestMeta | null;

  // Actions
  loadFromFile: (file: RequestFile, meta: ActiveRequestMeta) => void;
  setMethod: (m: string) => void;
  setUrl: (u: string) => void;
  setHeaders: (h: KeyValueEntry[]) => void;
  setQueryParams: (p: KeyValueEntry[]) => void;
  setBody: (b: RequestBody | null) => void;
  setAuth: (a: RequestAuth | null) => void;
  sendRequest: () => Promise<void>;
  clearResponse: () => void;
}

export const useRequestStore = create<RequestStore>((set, get) => ({
  // Initial state
  method: 'GET',
  url: '',
  headers: [],
  queryParams: [],
  body: null,
  auth: null,
  response: { status: 'idle' },
  activeRequestMeta: null,

  loadFromFile: (file: RequestFile, meta: ActiveRequestMeta) => {
    set({
      method: file.method,
      url: file.url,
      headers: file.headers,
      queryParams: file.queryParams,
      body: file.body,
      auth: file.auth,
      response: { status: 'idle' },
      activeRequestMeta: meta,
    });
  },

  setMethod: (m: string) => set({ method: m }),
  setUrl: (u: string) => set({ url: u }),
  setHeaders: (h: KeyValueEntry[]) => set({ headers: h }),
  setQueryParams: (p: KeyValueEntry[]) => set({ queryParams: p }),
  setBody: (b: RequestBody | null) => set({ body: b }),
  setAuth: (a: RequestAuth | null) => set({ auth: a }),

  sendRequest: async () => {
    const { method, url, headers, queryParams, body, auth } = get();
    set({ response: { status: 'loading' } });
    try {
      const data = await httpApi.sendRequest({ method, url, headers, queryParams, body, auth });
      set({ response: { status: 'success', data } });
    } catch (e) {
      set({ response: { status: 'error', message: String(e) } });
    }
  },

  clearResponse: () => set({ response: { status: 'idle' } }),
}));
