export interface PluginQuery {
  prefix: string;
  query: string;
  raw: string;
}

const PLUGIN_PREFIX_RE = /^[a-z0-9_-]{1,12}\s+/i;

export function parsePluginQuery(input: string): PluginQuery | null {
  const trimmed = input.trimStart();
  if (!trimmed) return null;
  // Skip if it's already a scoped query like :h, @, #, *, >, =, ?, /, !
  if (/^[@#*>?\/=:!]/ .test(trimmed)) return null;
  // Also skip if starts with http or calc
  if (/^https?:\/\//i.test(trimmed)) return null;
  const m = trimmed.match(PLUGIN_PREFIX_RE);
  if (!m) return null;
  const fullMatch = m[0];
  const prefix = fullMatch.trim().toLowerCase();
  const query = trimmed.slice(fullMatch.length);
  // prefix must not be a known common word that is also a tab title fragment? We allow all
  // But require that remaining query may be empty (shows all plugin results) or non-empty
  if (!/^[a-z0-9_-]+$/.test(prefix)) return null;
  return { prefix, query, raw: trimmed };
}

export function isPluginQuery(input: string): boolean {
  return parsePluginQuery(input) !== null;
}

export function getPluginPrefix(input: string): string | null {
  const parsed = parsePluginQuery(input);
  return parsed?.prefix ?? null;
}
