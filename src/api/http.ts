import { invoke } from '@tauri-apps/api/core';
import type { KeyValueEntry, RequestBody, RequestAuth, RequestFile } from '../types/collections';

export interface HttpResponse {
  status: number;
  duration_ms: number;
  headers: KeyValueEntry[];
  body: string;
}

export async function sendRequest(params: {
  method: string;
  url: string;
  headers: KeyValueEntry[];
  queryParams: KeyValueEntry[];
  body: RequestBody | null;
  auth: RequestAuth | null;
}): Promise<HttpResponse> {
  return invoke<HttpResponse>('send_request', params);
}

export async function loadRequest(params: {
  workspaceId: string;
  collectionSlug: string;
  parentPath: string[];
  slug: string;
}): Promise<RequestFile> {
  return invoke<RequestFile>('load_request', params);
}

export async function saveRequest(params: {
  workspaceId: string;
  collectionSlug: string;
  parentPath: string[];
  slug: string;
  request: RequestFile;
}): Promise<void> {
  return invoke<void>('save_request', params);
}
