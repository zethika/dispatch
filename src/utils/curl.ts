import { toJsonString } from 'curlconverter';
import { substitute } from './variables';
import type { KeyValueEntry, RequestBody, RequestAuth } from '../types/collections';

export interface ParsedCurl {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | null;
}

export function parseCurl(curlCommand: string): ParsedCurl | null {
  if (!curlCommand || !curlCommand.trimStart().startsWith('curl ')) {
    return null;
  }
  try {
    const json = JSON.parse(toJsonString(curlCommand));
    return {
      method: (json.method ?? 'GET').toUpperCase(),
      url: json.url ?? '',
      headers: json.headers ?? {},
      body:
        typeof json.data === 'string'
          ? json.data
          : json.data
            ? JSON.stringify(json.data)
            : null,
    };
  } catch {
    return null;
  }
}

export function buildCurlString(
  method: string,
  url: string,
  headers: KeyValueEntry[],
  body: RequestBody | null,
  auth: RequestAuth | null,
  vars: Record<string, string>,
): string {
  const resolvedUrl = substitute(url, vars);
  const parts: string[] = [`curl -X ${method} "${resolvedUrl}"`];

  if (auth?.token) {
    parts.push(`  -H "Authorization: Bearer ${substitute(auth.token, vars)}"`);
  }

  if (body?.type === 'json' && body.content) {
    parts.push('  -H "Content-Type: application/json"');
  }

  for (const h of headers.filter((h) => h.enabled)) {
    parts.push(`  -H "${substitute(h.key, vars)}: ${substitute(h.value, vars)}"`);
  }

  if (body?.content) {
    const data = substitute(body.content, vars);
    parts.push(`  -d '${data.replace(/'/g, "'\\''")}'`);
  }

  return parts.join(' \\\n');
}
