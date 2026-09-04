import type { ExtensionConfig, PersistedTabStats, WorkspaceItem, WorkspaceTab } from "../types/models";
import { extractDomain } from "../utils/domain";
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

export const WORKSPACES_STORAGE_KEY = "alternatab_workspaces";

export async function loadWorkspaces(): Promise<WorkspaceItem[]> {
  try {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return [];
    const data = await chrome.storage.local.get(WORKSPACES_STORAGE_KEY);
    return (data[WORKSPACES_STORAGE_KEY] as WorkspaceItem[]) || [];
  } catch {
    return [];
  }
}

export async function saveWorkspace(name: string, windowId?: number): Promise<WorkspaceItem> {
  const existing = await loadWorkspaces();
  let queryFilter: chrome.tabs.QueryInfo = {};
  if (windowId && windowId > 0) {
    queryFilter = { windowId };
  } else if (typeof chrome !== "undefined" && chrome.windows?.getCurrent) {
    try {
      const currentWin = await chrome.windows.getCurrent();
      if (currentWin?.id) queryFilter = { windowId: currentWin.id };
    } catch {
      // Ignore
    }
  }

  const rawTabs = typeof chrome !== "undefined" && chrome.tabs?.query
    ? await chrome.tabs.query(queryFilter)
    : [];

  const tabs: WorkspaceTab[] = rawTabs
    .filter((t) => t.url && t.url.length > 0)
    .map((t) => ({
      title: t.title || extractDomain(t.url || ""),
      url: t.url || "",
      pinned: !!t.pinned,
      favIconUrl: t.favIconUrl,
      domain: extractDomain(t.url || ""),
    }));

  const now = Date.now();
  const workspace: WorkspaceItem = {
    id: "ws_" + now + "_" + Math.random().toString(36).slice(2, 7),
    name: name.trim() || "Workspace " + new Date(now).toLocaleDateString(),
    createdAt: now,
    updatedAt: now,
    tabs,
  };

  const updated = [workspace, ...existing.filter((w) => w.id !== workspace.id)];
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    await chrome.storage.local.set({ [WORKSPACES_STORAGE_KEY]: updated });
  }

  return workspace;
}

export async function deleteWorkspace(id: string): Promise<void> {
  const existing = await loadWorkspaces();
  const updated = existing.filter((w) => w.id !== id);
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    await chrome.storage.local.set({ [WORKSPACES_STORAGE_KEY]: updated });
  }
}

export async function restoreWorkspace(
  id: string,
  newWindow = false,
): Promise<{ openedCount: number }> {
  const existing = await loadWorkspaces();
  const workspace = existing.find((w) => w.id === id);
  if (!workspace || workspace.tabs.length === 0) {
    return { openedCount: 0 };
  }

  if (typeof chrome === "undefined" || !chrome.tabs?.create) {
    return { openedCount: 0 };
  }

  let targetWindowId: number | undefined;
  if (newWindow && chrome.windows?.create) {
    const firstTab = workspace.tabs[0];
    if (!firstTab) return { openedCount: 0 };
    const win = await chrome.windows.create({
      url: firstTab.url,
      focused: true,
    });
    targetWindowId = win?.id;
    for (let i = 1; i < workspace.tabs.length; i++) {
      const tabInfo = workspace.tabs[i];
      if (!tabInfo) continue;
      const created = await chrome.tabs.create({
        windowId: targetWindowId,
        url: tabInfo.url,
        pinned: tabInfo.pinned,
        active: false,
      });
      if (created?.id && chrome.tabs.discard) {
        try {
          await chrome.tabs.discard(created.id);
        } catch {}
      }
    }
    return { openedCount: workspace.tabs.length };
  }

  for (let i = 0; i < workspace.tabs.length; i++) {
    const tabInfo = workspace.tabs[i];
    if (!tabInfo) continue;
    const created = await chrome.tabs.create({
      url: tabInfo.url,
      pinned: tabInfo.pinned,
      active: i === 0,
    });
    if (i > 0 && created?.id && chrome.tabs.discard) {
      try {
        await chrome.tabs.discard(created.id);
      } catch {}
    }
  }

  return { openedCount: workspace.tabs.length };
}
