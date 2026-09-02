import type { SearchTemplateItem, SearchTemplateResultItem } from "../../types/models";
import bundledData from "../../data/searchTemplates.json";

const bundledTemplates: SearchTemplateItem[] = bundledData as SearchTemplateItem[];

// Build Map for O(1) lookup
const templateMap = new Map<string, SearchTemplateItem>();
for (const t of bundledTemplates) {
  templateMap.set(t.id.toLowerCase(), t);
  // also index by keywords? For now only id
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
export function mergeTemplates(bundled: SearchTemplateItem[], custom: SearchTemplateItem[]): Map<string, SearchTemplateItem> {
  const map = new Map<string, SearchTemplateItem>();
  for (const t of bundled) map.set(t.id.toLowerCase(), t);
  for (const t of custom) map.set(t.id.toLowerCase(), t); // custom wins
  return map;
}

export function searchTemplatesByQuery(query: string): SearchTemplateItem[] {
  if (!query) return bundledTemplates.slice(0, 10);
  const q = query.toLowerCase();
  return bundledTemplates.filter(
    (t) =>
      t.id.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      t.keywords.some((k) => k.toLowerCase().includes(q))
  ).slice(0, 10);
}
