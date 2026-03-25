export type VariableToken =
  | { type: 'literal'; text: string }
  | { type: 'variable'; text: string; key: string; resolved: boolean };

const VAR_REGEX = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

/**
 * Tokenize a string into literal and variable tokens.
 * Variable tokens carry whether they are resolved (key exists in vars map).
 * Invalid patterns like {{}} or {{ spaces }} are treated as literal text.
 */
export function tokenize(input: string, vars: Record<string, string>): VariableToken[] {
  const tokens: VariableToken[] = [];
  let last = 0;
  for (const m of input.matchAll(VAR_REGEX)) {
    if (m.index! > last) {
      tokens.push({ type: 'literal', text: input.slice(last, m.index!) });
    }
    tokens.push({
      type: 'variable',
      text: m[0],
      key: m[1],
      resolved: m[1] in vars,
    });
    last = m.index! + m[0].length;
  }
  if (last < input.length) {
    tokens.push({ type: 'literal', text: input.slice(last) });
  }
  return tokens;
}

/**
 * Substitute all {{variable}} references in a string.
 * Unresolved variables are left as-is (e.g. {{missing}} stays {{missing}}).
 */
export function substitute(s: string, vars: Record<string, string>): string {
  return s.replace(VAR_REGEX, (_, key) => vars[key] ?? `{{${key}}}`);
}

/**
 * Extract all variable names referenced in a string.
 * Only returns valid identifier-style variables: [a-zA-Z_][a-zA-Z0-9_]*
 */
export function extractVariables(s: string): string[] {
  return [...s.matchAll(VAR_REGEX)].map((m) => m[1]);
}

/**
 * Count the number of unique unresolved variable keys across multiple input strings.
 */
export function countUnresolved(fields: string[], vars: Record<string, string>): number {
  const all = fields.flatMap(extractVariables);
  return new Set(all.filter((k) => !(k in vars))).size;
}
