export interface WorkspaceTree {
  id: string;
  name: string;
  collections: CollectionItem[];
}

export interface CollectionItem {
  slug: string;
  name: string;
  children: TreeChild[];
}

export type TreeChild =
  | { type: 'folder'; slug: string; name: string; children: TreeChild[] }
  | { type: 'request'; slug: string; name: string; method: string };

export interface FolderItem {
  slug: string;
  name: string;
  children: TreeChild[];
}

export interface RequestItem {
  slug: string;
  name: string;
  method: string;
}

export interface RequestFile {
  name: string;
  method: string;
  url: string;
  headers: KeyValueEntry[];
  queryParams: KeyValueEntry[];
  body: RequestBody | null;
  auth: RequestAuth | null;
}

export interface KeyValueEntry {
  key: string;
  value: string;
  enabled: boolean;
}

export interface RequestBody {
  type: string;
  content: string;
}

export interface RequestAuth {
  type: string;
  token: string;
}
