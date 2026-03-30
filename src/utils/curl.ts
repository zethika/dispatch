import type { KeyValueEntry, RequestBody, RequestAuth } from '../types/collections';
import { substitute } from './variables';

/**
 * Build a cURL command string from the current request state with variable substitution.
 */
export function buildCurlString(
  method: string,
  url: string,
  headers: KeyValueEntry[],
  body: RequestBody | null,
  auth: RequestAuth | null,
  vars: Record<string, string>,
): string {
  const resolvedUrl = substitute(url, vars);
  const parts: string[] = ['curl'];

  // Method (omit -X GET since it's the default)
  if (method !== 'GET') {
    parts.push(`-X ${method}`);
  }

  // URL
  parts.push(`'${resolvedUrl}'`);

  // Auth header
  if (auth && auth.token) {
    const resolvedToken = substitute(auth.token, vars);
    parts.push(`-H 'Authorization: Bearer ${resolvedToken}'`);
  }

  // Headers
  for (const h of headers) {
    if (!h.enabled) continue;
    const resolvedKey = substitute(h.key, vars);
    const resolvedValue = substitute(h.value, vars);
    parts.push(`-H '${resolvedKey}: ${resolvedValue}'`);
  }

  // Body
  if (body && body.content) {
    const resolvedContent = substitute(body.content, vars);
    if (body.type === 'json') {
      // Add Content-Type if not already set
      const hasContentType = headers.some(
        (h) => h.enabled && h.key.toLowerCase() === 'content-type',
      );
      if (!hasContentType) {
        parts.push(`-H 'Content-Type: application/json'`);
      }
    }
    // Escape single quotes in body by ending quote, adding escaped quote, resuming
    const escaped = resolvedContent.replace(/'/g, `'\\''`);
    parts.push(`-d '${escaped}'`);
  }

  return parts.join(' \\\n  ');
}
