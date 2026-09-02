import type { SearchTemplateItem, SearchTemplateResultItem } from "../../types/models";
import bundledData from "../../data/searchTemplates.json";

const bundledTemplates: SearchTemplateItem[] = bundledData as SearchTemplateItem[];

// Build Map for O(1) lookup
const templateMap = new Map<string, SearchTemplateItem>();
for (const t of bundledTemplates) {
  templateMap.set(t.id.toLowerCase(), t);
  if (t.aliases) {
    for (const a of t.aliases) {
      templateMap.set(a.toLowerCase(), t);
    }
  }
}

export function getBundledTemplates(): SearchTemplateItem[] {
  return bundledTemplates;
}

export function getTemplate(id: string): SearchTemplateItem | undefined {
  return templateMap.get(id.toLowerCase());
}

export function expandTemplate(template: SearchTemplateItem, query: string): string {
  return template.urlTemplate.replace("{q}", encodeURIComponent(query));
}

export interface ParsedBang {
  templateId: string;
  template: SearchTemplateItem;
  query: string;
  raw: string;
}

// Parse bang queries: "!yt cats" or "cats !yt" or "!yt"
export function parseBangQuery(input: string): ParsedBang | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Leading bang: "!yt cats" or "!yt"
  if (trimmed.startsWith("!")) {
    const rest = trimmed.slice(1);
    const spaceIdx = rest.search(/\s/);
    let templateId: string;
    let query: string;
    if (spaceIdx === -1) {
      templateId = rest.toLowerCase();
      query = "";
    } else {
      templateId = rest.slice(0, spaceIdx).toLowerCase();
      query = rest.slice(spaceIdx + 1).trim();
    }
    const template = getTemplate(templateId);
    if (!template) return null;
    return { templateId, template, query, raw: trimmed };
  }
  // Trailing bang: "cats !yt"
  // Find last occurrence of " !"
  const trailingMatch = trimmed.match(/\s!([a-z0-9_-]+)\s*$/i);
  if (trailingMatch) {
    const templateId = trailingMatch[1]!.toLowerCase();
    const template = getTemplate(templateId);
    if (!template) return null;
    const query = trimmed.slice(0, trailingMatch.index).trim();
    return { templateId, template, query, raw: trimmed };
  }
  return null;
}

export function isBangQuery(input: string): boolean {
  return parseBangQuery(input) !== null;
}

export const isQuicklinkQuery = isBangQuery;

export function listQuicklinks(): SearchTemplateItem[] {
  return getBundledTemplates().filter((t) => t.category === "quicklink" || true);
}

export function getTemplateResult(parsed: ParsedBang): SearchTemplateResultItem {
  const url = expandTemplate(parsed.template, parsed.query);
  let domain: string;
  try {
    domain = new URL(url).hostname;
  } catch {
    domain = parsed.template.domain ?? "search";
  }
  return {
    id: `template:${parsed.templateId}:${parsed.query}`,
    templateId: parsed.templateId,
    title: parsed.query ? `Search ${parsed.template.title}: ${parsed.query}` : `Search ${parsed.template.title}`,
    url,
    domain,
    query: parsed.query,
  };
}

// For merging custom templates over bundled
export function mergeTemplates(
  bundled: SearchTemplateItem[],
  custom: SearchTemplateItem[],
): Map<string, SearchTemplateItem> {
  const map = new Map<string, SearchTemplateItem>();
  for (const t of bundled) {
    map.set(t.id.toLowerCase(), t);
    if (t.aliases) {
      for (const a of t.aliases) map.set(a.toLowerCase(), t);
    }
  }
  for (const t of custom) {
    map.set(t.id.toLowerCase(), t); // custom wins
    if (t.aliases) {
      for (const a of t.aliases) map.set(a.toLowerCase(), t);
    }
  }
  return map;
}

export interface BangMatchItem {
  template: SearchTemplateItem;
  matchedAlias: string;
  allAliases: string[];
}

export function findMatchingBangs(
  input: string,
  custom?: SearchTemplateItem[],
  limit = 30,
): BangMatchItem[] {
  const allTemplates = custom ? [...custom, ...bundledTemplates] : bundledTemplates;
  const seen = new Set<string>();
  const uniqueTemplates: SearchTemplateItem[] = [];
  for (const t of allTemplates) {
    const key = t.domain || t.title.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueTemplates.push(t);
    }
  }

  const raw = input.trim();
  const clean = raw.startsWith("!") ? raw.slice(1).toLowerCase().trim() : raw.toLowerCase().trim();

  if (!clean) {
    return uniqueTemplates.slice(0, limit).map((t) => ({
      template: t,
      matchedAlias: t.aliases?.[0] || t.id,
      allAliases: t.aliases || [t.id],
    }));
  }

  const results: { item: BangMatchItem; score: number }[] = [];

  for (const t of uniqueTemplates) {
    const aliases = t.aliases || [t.id];
    const exactAlias = aliases.find((a) => a.toLowerCase() === clean);
    if (exactAlias) {
      results.push({
        item: { template: t, matchedAlias: exactAlias, allAliases: aliases },
        score: 100,
      });
      continue;
    }
    const prefixAlias = aliases.find((a) => a.toLowerCase().startsWith(clean));
    if (prefixAlias) {
      results.push({
        item: { template: t, matchedAlias: prefixAlias, allAliases: aliases },
        score: 80 - (prefixAlias.length - clean.length),
      });
      continue;
    }
    if (t.title.toLowerCase().startsWith(clean)) {
      results.push({
        item: { template: t, matchedAlias: aliases[0] || t.id, allAliases: aliases },
        score: 60,
      });
      continue;
    }
    if (t.domain?.toLowerCase().includes(clean)) {
      results.push({
        item: { template: t, matchedAlias: aliases[0] || t.id, allAliases: aliases },
        score: 50,
      });
      continue;
    }
    if (
      t.title.toLowerCase().includes(clean) ||
      t.keywords.some((k) => k.toLowerCase().includes(clean))
    ) {
      results.push({
        item: { template: t, matchedAlias: aliases[0] || t.id, allAliases: aliases },
        score: 30,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit).map((r) => r.item);
}

export function searchTemplatesByQuery(query: string): SearchTemplateItem[] {
  if (!query) return bundledTemplates.slice(0, 10);
  const q = query.toLowerCase();
  return bundledTemplates
    .filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        (t.aliases && t.aliases.some((a) => a.toLowerCase().includes(q))) ||
        t.title.toLowerCase().includes(q) ||
        t.keywords.some((k) => k.toLowerCase().includes(q)),
    )
    .slice(0, 10);
}
