import { describe, it, expect } from 'vitest';
import { parseCurl, buildCurlString } from './curl';

describe('parseCurl', () => {
  it('parses simple GET', () => {
    const result = parseCurl('curl https://api.example.com');
    expect(result).toEqual({ method: 'GET', url: 'https://api.example.com', headers: {}, body: null });
  });

  it('parses POST with headers and body', () => {
    const result = parseCurl('curl -X POST https://api.example.com -H "Content-Type: application/json" -d \'{"key":"value"}\'');
    expect(result).not.toBeNull();
    expect(result!.method).toBe('POST');
    expect(result!.headers['Content-Type']).toBe('application/json');
    expect(result!.body).toBe('{"key":"value"}');
  });

  it('parses Authorization header', () => {
    const result = parseCurl('curl -H "Authorization: Bearer tok123" https://api.example.com');
    expect(result).not.toBeNull();
    expect(result!.headers['Authorization']).toBe('Bearer tok123');
  });

  it('returns null for non-curl input', () => {
    expect(parseCurl('not a curl command')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseCurl('')).toBeNull();
  });
});

describe('buildCurlString', () => {
  it('builds simple GET', () => {
    const result = buildCurlString('GET', 'https://example.com/api', [], null, null, {});
    expect(result).toContain('curl -X GET');
    expect(result).toContain('"https://example.com/api"');
  });

  it('resolves variables in URL', () => {
    const result = buildCurlString('GET', 'https://{{host}}/api', [], null, null, { host: 'example.com' });
    expect(result).toContain('"https://example.com/api"');
    expect(result).not.toContain('{{host}}');
  });

  it('includes enabled headers', () => {
    const headers = [
      { key: 'X-Custom', value: 'val', enabled: true },
      { key: 'X-Disabled', value: 'skip', enabled: false },
    ];
    const result = buildCurlString('GET', 'https://example.com', headers, null, null, {});
    expect(result).toContain('-H "X-Custom: val"');
    expect(result).not.toContain('X-Disabled');
  });

  it('includes auth as Authorization header', () => {
    const auth = { type: 'bearer', token: '{{token}}' };
    const result = buildCurlString('GET', 'https://example.com', [], null, auth, { token: 'abc123' });
    expect(result).toContain('-H "Authorization: Bearer abc123"');
  });

  it('includes body with single-quote escaping', () => {
    const body = { type: 'json', content: '{"key": "it\'s fine"}' };
    const result = buildCurlString('POST', 'https://example.com', [], body, null, {});
    expect(result).toContain('-d ');
    expect(result).toContain('-H "Content-Type: application/json"');
  });
});
