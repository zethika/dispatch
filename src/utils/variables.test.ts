import { describe, it, expect } from 'vitest';
import { tokenize, substitute, extractVariables, countUnresolved } from './variables';

describe('tokenize', () => {
  it('with no variables returns single literal token', () => {
    const tokens = tokenize('hello world', {});
    expect(tokens).toEqual([{ type: 'literal', text: 'hello world' }]);
  });

  it('with resolved variable returns resolved variable token', () => {
    const tokens = tokenize('{{host}}', { host: 'localhost' });
    expect(tokens).toEqual([
      { type: 'variable', text: '{{host}}', key: 'host', resolved: true },
    ]);
  });

  it('with missing variable returns unresolved variable token', () => {
    const tokens = tokenize('{{missing}}', {});
    expect(tokens).toEqual([
      { type: 'variable', text: '{{missing}}', key: 'missing', resolved: false },
    ]);
  });

  it('with mixed text returns correct token sequence', () => {
    const tokens = tokenize('https://{{host}}/api/{{version}}', {
      host: 'api.example.com',
    });
    expect(tokens).toHaveLength(4);
    expect(tokens[0]).toEqual({ type: 'literal', text: 'https://' });
    expect(tokens[1]).toEqual({
      type: 'variable',
      text: '{{host}}',
      key: 'host',
      resolved: true,
    });
    expect(tokens[2]).toEqual({ type: 'literal', text: '/api/' });
    expect(tokens[3]).toEqual({
      type: 'variable',
      text: '{{version}}',
      key: 'version',
      resolved: false,
    });
  });

  it('ignores {{}} (empty braces) — treated as literal text', () => {
    const tokens = tokenize('test {{}} end', {});
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual({ type: 'literal', text: 'test {{}} end' });
  });

  it('ignores {{ spaces }} — treated as literal text', () => {
    const tokens = tokenize('test {{ spaces }} end', {});
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual({ type: 'literal', text: 'test {{ spaces }} end' });
  });

  it('returns empty array for empty string', () => {
    const tokens = tokenize('', {});
    expect(tokens).toHaveLength(0);
  });

  it('handles multiple sequential variables', () => {
    const tokens = tokenize('{{a}}{{b}}', { a: '1', b: '2' });
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toMatchObject({ type: 'variable', key: 'a', resolved: true });
    expect(tokens[1]).toMatchObject({ type: 'variable', key: 'b', resolved: true });
  });
});

describe('substitute', () => {
  it('replaces resolved variables', () => {
    expect(substitute('https://{{host}}/path', { host: 'api.example.com' })).toBe(
      'https://api.example.com/path',
    );
  });

  it('leaves unresolved variables as {{key}}', () => {
    expect(substitute('{{missing}}/path', {})).toBe('{{missing}}/path');
  });

  it('with empty vars map returns original string with all {{...}} intact', () => {
    const original = 'https://{{host}}/{{version}}/endpoint';
    expect(substitute(original, {})).toBe(original);
  });

  it('replaces multiple occurrences of the same variable', () => {
    expect(substitute('{{base}}/{{base}}/end', { base: 'api' })).toBe('api/api/end');
  });

  it('handles string with no variables', () => {
    expect(substitute('no vars here', {})).toBe('no vars here');
  });
});

describe('extractVariables', () => {
  it('returns all variable names from a string', () => {
    const vars = extractVariables('https://{{host}}/{{version}}');
    expect(vars).toEqual(['host', 'version']);
  });

  it('returns empty array for string with no variables', () => {
    expect(extractVariables('no vars here')).toEqual([]);
  });

  it('returns duplicate variable names (not deduplicated)', () => {
    const vars = extractVariables('{{a}} and {{a}} again');
    expect(vars).toEqual(['a', 'a']);
  });

  it('does not include invalid patterns like {{}} or {{ spaces }}', () => {
    const vars = extractVariables('{{}} and {{ spaces }}');
    expect(vars).toHaveLength(0);
  });

  it('supports underscores in variable names', () => {
    const vars = extractVariables('{{API_KEY}} and {{_private}}');
    expect(vars).toEqual(['API_KEY', '_private']);
  });
});

describe('countUnresolved', () => {
  it('returns unique count of variables not in vars map', () => {
    const count = countUnresolved(['{{a}}', '{{b}}', '{{c}}'], { a: '1' });
    expect(count).toBe(2);
  });

  it('with all resolved returns 0', () => {
    const count = countUnresolved(['{{a}}', '{{b}}'], { a: '1', b: '2' });
    expect(count).toBe(0);
  });

  it('with duplicate unresolved names counts once (Set behavior)', () => {
    const count = countUnresolved(['{{missing}}/{{missing}}', '{{missing}}'], {});
    expect(count).toBe(1);
  });

  it('with empty fields array returns 0', () => {
    expect(countUnresolved([], {})).toBe(0);
  });

  it('ignores resolved variables and only counts unresolved', () => {
    const count = countUnresolved(['{{resolved}} and {{unresolved}}'], { resolved: 'yes' });
    expect(count).toBe(1);
  });
});
