import type { SearchTemplateItem } from "../types/models";
import { getBundledTemplates } from "../utils/search/templates";

const STORAGE_KEY = "alternatab_custom_templates";

function getStorage(): chrome.storage.StorageArea {
  if (typeof chrome !== "undefined" && chrome.storage?.local) return chrome.storage.local;
  return {
    get: async () => ({}),
    set: async () => {},
  } as any;
}

export async function loadCustomTemplates(): Promise<SearchTemplateItem[]> {
  try {
    const data = await getStorage().get(STORAGE_KEY);
    const list = (data as any)[STORAGE_KEY] as SearchTemplateItem[] | undefined;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function saveCustomTemplates(templates: SearchTemplateItem[]): Promise<void> {
  await getStorage().set({ [STORAGE_KEY]: templates });
}

export async function getAllTemplates(): Promise<SearchTemplateItem[]> {
  const bundled = getBundledTemplates();
  const custom = await loadCustomTemplates();
  const map = new Map<string, SearchTemplateItem>();
  for (const t of bundled) map.set(t.id.toLowerCase(), t);
  for (const t of custom) map.set(t.id.toLowerCase(), t);
  return Array.from(map.values());
}

export async function getMergedTemplateMap(): Promise<Map<string, SearchTemplateItem>> {
  const bundled = getBundledTemplates();
  const custom = await loadCustomTemplates();
  const map = new Map<string, SearchTemplateItem>();
  for (const t of bundled) map.set(t.id.toLowerCase(), t);
  for (const t of custom) map.set(t.id.toLowerCase(), t);
  return map;
}

function validateTemplate(t: SearchTemplateItem): void {
  if (!t.id || !/^[a-z0-9_-]{1,20}$/i.test(t.id)) throw new Error("Invalid template id — use 1-20 alphanumerics, dash/underscore");
  if (!t.title || t.title.trim().length < 2) throw new Error("Title required");
  if (!t.urlTemplate || !t.urlTemplate.includes("{q}")) throw new Error("urlTemplate must contain {q}");
  try {
    const testUrl = t.urlTemplate.replace("{q}", "test");
    new URL(testUrl);
  } catch {
    throw new Error("Invalid urlTemplate");
  }
  if (!t.category) t.category = "custom";
  if (!Array.isArray(t.keywords)) t.keywords = [];
}

export async function addCustomTemplate(item: SearchTemplateItem): Promise<SearchTemplateItem> {
  validateTemplate(item);
  const custom = await loadCustomTemplates();
  const lower = item.id.toLowerCase();
  if (custom.some((c) => c.id.toLowerCase() === lower)) throw new Error(`Template id "${item.id}" already exists`);
  // Also check bundled? Allow override, but for add we should allow override? For now allow override via custom wins
  const normalized: SearchTemplateItem = {
    id: item.id.toLowerCase(),
    title: item.title.trim(),
    category: item.category || "custom",
    urlTemplate: item.urlTemplate.trim(),
    keywords: item.keywords || [],
    icon: item.icon,
    domain: item.domain || (() => { try { return new URL(item.urlTemplate.replace("{q}", "test")).hostname; } catch { return undefined; } })(),
  };
  custom.push(normalized);
  await saveCustomTemplates(custom);
  return normalized;
}

export async function deleteCustomTemplate(id: string): Promise<void> {
  const custom = await loadCustomTemplates();
  const next = custom.filter((c) => c.id.toLowerCase() !== id.toLowerCase());
  if (next.length === custom.length) throw new Error("Template not found");
  await saveCustomTemplates(next);
}

export async function updateCustomTemplate(id: string, patch: Partial<SearchTemplateItem>): Promise<SearchTemplateItem> {
  const custom = await loadCustomTemplates();
  const idx = custom.findIndex((c) => c.id.toLowerCase() === id.toLowerCase());
  if (idx === -1) throw new Error("Template not found");
  const existing = custom[idx]!;
  const updated: SearchTemplateItem = { ...existing, ...patch, id: existing.id };
  validateTemplate(updated);
  custom[idx] = updated;
  await saveCustomTemplates(custom);
  return updated;
}
