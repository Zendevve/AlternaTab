import type { ExtensionConfig, PersistedTabStats } from "../types/models";
import { normalizeUrl } from "../utils/url";
import { DEFAULT_CONFIG, validateConfig } from "../utils/validation";

const CONFIG_STORAGE_KEY = "alternatab_config";
const STATS_STORAGE_KEY = "alternatab_tab_stats";
const SCHEMA_VERSION_KEY = "alternatab_schema_version";
const CURRENT_SCHEMA_VERSION = 1;

export function getTabIdentityKey(url: string): string {
  const normalized = normalizeUrl(url);
  return normalized.length > 0 ? normalized : "empty_tab";
}

function getSessionStorage(): chrome.storage.StorageArea {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.session) {
    return chrome.storage.session;
  }
  return chrome.storage.local;
}

export async function loadStoredConfig(): Promise<ExtensionConfig> {
  try {
    const data = await chrome.storage.local.get([CONFIG_STORAGE_KEY, SCHEMA_VERSION_KEY]);
    const candidate = data[CONFIG_STORAGE_KEY];
    const validation = validateConfig(candidate);
    return validation.config;
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveStoredConfig(
  configUpdate: Partial<ExtensionConfig>,
): Promise<ExtensionConfig> {
  const current = await loadStoredConfig();
  const merged = { ...current, ...configUpdate };
  const validation = validateConfig(merged);

  await chrome.storage.local.set({
    [CONFIG_STORAGE_KEY]: validation.config,
    [SCHEMA_VERSION_KEY]: CURRENT_SCHEMA_VERSION,
  });

  return validation.config;
}

export async function resetStoredConfig(): Promise<ExtensionConfig> {
  const fresh = { ...DEFAULT_CONFIG };
  await chrome.storage.local.set({
    [CONFIG_STORAGE_KEY]: fresh,
    [SCHEMA_VERSION_KEY]: CURRENT_SCHEMA_VERSION,
  });
  return fresh;
}

export async function loadTabStats(): Promise<Record<string, PersistedTabStats>> {
  try {
    const storage = getSessionStorage();
    const data = await storage.get(STATS_STORAGE_KEY);
    return (data[STATS_STORAGE_KEY] as Record<string, PersistedTabStats>) || {};
  } catch {
    return {};
  }
}

export async function updateTabActivationStat(
  url: string,
): Promise<{ activationCount: number; lastActivatedAt: number }> {
  const key = getTabIdentityKey(url);
  const stats = await loadTabStats();
  const existing = stats[key] ?? {
    identityKey: key,
    activationCount: 0,
    lastActivatedAt: Date.now(),
  };

  const updated: PersistedTabStats = {
    identityKey: key,
    activationCount: existing.activationCount + 1,
    lastActivatedAt: Date.now(),
  };

  stats[key] = updated;

  try {
    const storage = getSessionStorage();
    await storage.set({ [STATS_STORAGE_KEY]: stats });
  } catch {
    // Session storage write error handled gracefully
  }

  return {
    activationCount: updated.activationCount,
    lastActivatedAt: updated.lastActivatedAt,
  };
}
