import type { PluginItem, PluginResultItem } from "../types/models";

const STORAGE_KEY = "alternatab_plugins";
const PLUGIN_TIMEOUT_MS = 2000;

function getStorage(): chrome.storage.StorageArea {
  if (typeof chrome !== "undefined" && chrome.storage?.local) return chrome.storage.local;
  // fallback mock for tests
  return {
    get: async () => ({}),
    set: async () => {},
  } as any;
}

export async function loadPlugins(): Promise<PluginItem[]> {
  try {
    const data = await getStorage().get(STORAGE_KEY);
    const list = (data as any)[STORAGE_KEY] as PluginItem[] | undefined;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function savePlugins(plugins: PluginItem[]): Promise<void> {
  await getStorage().set({ [STORAGE_KEY]: plugins });
}

function hashCode(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function parsePluginMeta(code: string): { prefix: string; title: string; description: string } | null {
  // Try to extract prefix/title/description via regex, fallback to id derived
  const prefixMatch = code.match(/prefix\s*[:=]\s*["']([^"']+)["']/);
  const titleMatch = code.match(/title\s*[:=]\s*["']([^"']+)["']/);
  const descMatch = code.match(/description\s*[:=]\s*["']([^"']+)["']/);
  if (prefixMatch?.[1]) {
    return {
      prefix: prefixMatch[1].trim(),
      title: titleMatch?.[1]?.trim() || `Plugin ${prefixMatch[1]}`,
      description: descMatch?.[1]?.trim() || `Prefix ${prefixMatch[1]}`,
    };
  }
  return null;
}

export async function registerPlugin(code: string, sourceUrl?: string): Promise<PluginItem> {
  if (!code || code.trim().length < 20) throw new Error("Plugin code too short");
  const meta = parsePluginMeta(code);
  if (!meta) throw new Error("Could not parse plugin prefix/title — ensure code contains prefix: \"gh\"");
  const prefix = meta.prefix.toLowerCase();
  if (!/^[a-z0-9_-]{1,12}$/.test(prefix)) throw new Error("Invalid prefix — use 1-12 alphanumerics");
  const plugins = await loadPlugins();
  if (plugins.some((p) => p.prefix === prefix)) throw new Error(`Prefix "${prefix}" already registered`);
  const id = `${prefix}-${hashCode(code).slice(0, 6)}`;
  const item: PluginItem = {
    id,
    prefix,
    title: meta.title,
    description: meta.description,
    enabled: true,
    code,
    sourceUrl,
    createdAt: Date.now(),
  };
  // Validate by trying to import
  await validatePluginCode(code);
  plugins.push(item);
  await savePlugins(plugins);
  return item;
}

async function validatePluginCode(code: string): Promise<void> {
  // Quick syntax check via data url import without running
  const dataUrl = `data:text/javascript,${encodeURIComponent(code)}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), PLUGIN_TIMEOUT_MS);
  try {
    const mod: any = await import(/* @vite-ignore */ dataUrl);
    if (!mod || (typeof mod.run !== "function" && typeof mod.default?.run !== "function" && typeof mod.default !== "function")) {
      // allow plugins that export run or default.run, but don't fail hard — some plugins may be simple
    }
  } catch (e) {
    throw new Error(`Plugin validation failed: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    clearTimeout(t);
  }
}

export async function deletePlugin(id: string): Promise<void> {
  const plugins = await loadPlugins();
  const next = plugins.filter((p) => p.id !== id);
  if (next.length === plugins.length) throw new Error("Plugin not found");
  await savePlugins(next);
}

export async function togglePlugin(id: string, enabled: boolean): Promise<PluginItem> {
  const plugins = await loadPlugins();
  const idx = plugins.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error("Plugin not found");
  const updated = { ...plugins[idx]!, enabled };
  plugins[idx] = updated;
  await savePlugins(plugins);
  return updated;
}

export async function getPluginByPrefix(prefix: string): Promise<PluginItem | null> {
  const plugins = await loadPlugins();
  return plugins.find((p) => p.prefix === prefix.toLowerCase() && p.enabled) ?? null;
}

export interface PluginApi {
  fetch: typeof fetch;
  tabs: {
    query: (q: chrome.tabs.QueryInfo) => Promise<chrome.tabs.Tab[]>;
    create: (o: chrome.tabs.CreateProperties) => Promise<chrome.tabs.Tab>;
  };
  storage: {
    get: (keys: string | string[]) => Promise<Record<string, unknown>>;
    set: (obj: Record<string, unknown>) => Promise<void>;
  };
}

function createPluginApi(): PluginApi {
  return {
    fetch: (input, init) => fetch(input as any, init as any),
    tabs: {
      query: async (q) => {
        if (typeof chrome !== "undefined" && chrome.tabs?.query) return chrome.tabs.query(q);
        return [];
      },
      create: async (o) => {
        if (typeof chrome !== "undefined" && chrome.tabs?.create) return chrome.tabs.create(o as any);
        throw new Error("tabs.create unavailable");
      },
    },
    storage: {
      get: async (keys) => {
        if (typeof chrome !== "undefined" && chrome.storage?.local?.get) {
          const k = Array.isArray(keys) ? keys : [keys];
          return chrome.storage.local.get(k);
        }
        return {};
      },
      set: async (obj) => {
        if (typeof chrome !== "undefined" && chrome.storage?.local?.set) await chrome.storage.local.set(obj);
      },
    },
  };
}

export async function runPlugin(prefix: string, query: string): Promise<PluginResultItem[]> {
  const plugin = await getPluginByPrefix(prefix);
  if (!plugin) throw new Error(`Plugin "${prefix}" not found or disabled`);
  const dataUrl = `data:text/javascript,${encodeURIComponent(plugin.code)}`;
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Plugin "${prefix}" timed out after ${PLUGIN_TIMEOUT_MS}ms`)), PLUGIN_TIMEOUT_MS),
  );
  try {
    const mod: any = await Promise.race([import(/* @vite-ignore */ dataUrl), timeoutPromise]);
    const runFn: ((q: string, api: PluginApi) => any) | undefined =
      typeof mod.run === "function" ? mod.run : typeof mod.default?.run === "function" ? mod.default.run : typeof mod.default === "function" ? mod.default : undefined;
    if (!runFn) throw new Error(`Plugin "${prefix}" missing export run(query, api)`);
    const api = createPluginApi();
    const result = await Promise.race([Promise.resolve(runFn(query, api)), timeoutPromise]);
    const elapsed = (typeof performance !== "undefined" ? performance.now() : Date.now()) - start;
    if (typeof console !== "undefined" && elapsed > 100) {
      console.warn(`[plugins] ${prefix} p95 fallback: run took ${elapsed.toFixed(1)}ms for query "${query}"`);
    }
    if (!Array.isArray(result)) {
      // allow single item
      if (result && typeof result === "object" && (result as any).title) {
        const single = result as PluginResultItem;
        return [{ ...single, pluginId: plugin.id, id: single.id ?? `${plugin.id}:${query}` }];
      }
      return [];
    }
    return result.map((r: any, idx: number) => ({
      id: r.id ?? `${plugin.id}:${idx}:${query}`,
      pluginId: plugin.id,
      title: r.title ?? r.url ?? `Result ${idx + 1}`,
      subtitle: r.subtitle ?? r.description,
      url: r.url,
      domain: r.domain ?? (r.url ? (() => { try { return new URL(r.url).hostname; } catch { return undefined; } })() : undefined),
    }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return [
      {
        id: `${plugin.id}:error`,
        pluginId: plugin.id,
        title: `Plugin '${plugin.prefix}' failed: ${msg}`,
        subtitle: plugin.description,
      },
    ];
  }
}
