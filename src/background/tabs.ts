import { tabStore } from "../state/tabStore";
import type { Result } from "../types/result";
import { err, ok } from "../types/result";
import { extractDomain } from "../utils/domain";
import { sortTabsByDomain, sortTabsByMRU, sortTabsByTitle } from "../utils/sorting";
import { normalizeUrl } from "../utils/url";

export async function activateTab(tabId: number, windowId?: number): Promise<Result<void>> {
  try {
    if (typeof chrome === "undefined" || !chrome.tabs) {
      return err("CHROME_API_UNAVAILABLE", "Chrome tabs API is unavailable");
    }
    const tab = await chrome.tabs.get(tabId);
    await chrome.tabs.update(tabId, { active: true });
    const targetWinId = tab?.windowId || windowId;
    if (targetWinId && typeof chrome.windows !== "undefined" && chrome.windows.update) {
      try {
        await chrome.windows.update(targetWinId, { focused: true });
      } catch {
        // Window focus best effort
      }
    }
    tabStore.setActiveTab(tabId, targetWinId ?? -1);
    return ok(undefined);
  } catch (e) {
    return err("ACTIVATE_FAILED", e instanceof Error ? e.message : "Failed to activate tab");
  }
}

export async function closeTabs(tabIds: number[]): Promise<Result<void>> {
  try {
    if (typeof chrome === "undefined" || !chrome.tabs) {
      return err("CHROME_API_UNAVAILABLE", "Chrome tabs API is unavailable");
    }
    await chrome.tabs.remove(tabIds);
    for (const id of tabIds) {
      tabStore.removeTab(id);
    }
    return ok(undefined);
  } catch (e) {
    return err("CLOSE_FAILED", e instanceof Error ? e.message : "Failed to close tabs");
  }
}

export async function discardTabs(tabIds: number[]): Promise<Result<{ discardedCount: number }>> {
  try {
    if (typeof chrome === "undefined" || !chrome.tabs?.discard) {
      return err("DISCARD_UNSUPPORTED", "Tab discarding is unsupported in this environment");
    }

    let count = 0;
    for (const id of tabIds) {
      const tab = tabStore.getTab(id);
      if (!tab || tab.pinned || tab.discarded) continue;
      try {
        await chrome.tabs.discard(id);
        count++;
      } catch {
        // Individual tab discard error ignored
      }
    }
    await tabStore.refresh();
    return ok({ discardedCount: count });
  } catch (e) {
    return err("DISCARD_FAILED", e instanceof Error ? e.message : "Failed to discard tabs");
  }
}

export async function duplicateTab(tabId: number): Promise<Result<{ newTabId: number }>> {
  try {
    if (typeof chrome === "undefined" || !chrome.tabs?.duplicate) {
      return err("CHROME_API_UNAVAILABLE", "Tab duplication is unsupported");
    }
    const newTab = await chrome.tabs.duplicate(tabId);
    if (!newTab?.id) {
      return err("DUPLICATE_FAILED", "Failed to obtain new tab ID after duplication");
    }
    await tabStore.refresh();
    return ok({ newTabId: newTab.id });
  } catch (e) {
    return err("DUPLICATE_FAILED", e instanceof Error ? e.message : "Failed to duplicate tab");
  }
}

export async function toggleMuteTab(tabId: number): Promise<Result<{ muted: boolean }>> {
  try {
    const tab = tabStore.getTab(tabId);
    const targetMuted = tab ? !tab.muted : true;
    await chrome.tabs.update(tabId, { muted: targetMuted });
    await tabStore.refresh();
    return ok({ muted: targetMuted });
  } catch (e) {
    return err("MUTE_FAILED", e instanceof Error ? e.message : "Failed to toggle mute state");
  }
}

export async function togglePinTab(tabId: number): Promise<Result<{ pinned: boolean }>> {
  try {
    const tab = tabStore.getTab(tabId);
    const targetPinned = tab ? !tab.pinned : true;
    await chrome.tabs.update(tabId, { pinned: targetPinned });
    await tabStore.refresh();
    return ok({ pinned: targetPinned });
  } catch (e) {
    return err("PIN_FAILED", e instanceof Error ? e.message : "Failed to toggle pin state");
  }
}

export async function closeTabsLeft(
  tabId: number,
  windowId: number,
): Promise<Result<{ closedCount: number }>> {
  try {
    const tabsInWindow = await chrome.tabs.query({ windowId });
    const targetTab = tabsInWindow.find((t) => t.id === tabId);
    if (!targetTab) {
      return err("TAB_NOT_FOUND", "Selected tab could not be found");
    }

    const idsToClose = tabsInWindow
      .filter((t) => t.id && t.index < targetTab.index && !t.pinned)
      .map((t) => t.id as number);

    if (idsToClose.length > 0) {
      await chrome.tabs.remove(idsToClose);
      await tabStore.refresh();
    }
    return ok({ closedCount: idsToClose.length });
  } catch (e) {
    return err("CLOSE_LEFT_FAILED", e instanceof Error ? e.message : "Failed to close tabs left");
  }
}

export async function closeTabsRight(
  tabId: number,
  windowId: number,
): Promise<Result<{ closedCount: number }>> {
  try {
    const tabsInWindow = await chrome.tabs.query({ windowId });
    const targetTab = tabsInWindow.find((t) => t.id === tabId);
    if (!targetTab) {
      return err("TAB_NOT_FOUND", "Selected tab could not be found");
    }

    const idsToClose = tabsInWindow
      .filter((t) => t.id && t.index > targetTab.index && !t.pinned)
      .map((t) => t.id as number);

    if (idsToClose.length > 0) {
      await chrome.tabs.remove(idsToClose);
      await tabStore.refresh();
    }
    return ok({ closedCount: idsToClose.length });
  } catch (e) {
    return err("CLOSE_RIGHT_FAILED", e instanceof Error ? e.message : "Failed to close tabs right");
  }
}

export async function closeOtherTabs(
  tabId: number,
  windowId: number,
): Promise<Result<{ closedCount: number }>> {
  try {
    const tabsInWindow = await chrome.tabs.query({ windowId });
    const idsToClose = tabsInWindow
      .filter((t) => t.id && t.id !== tabId && !t.pinned)
      .map((t) => t.id as number);

    if (idsToClose.length > 0) {
      await chrome.tabs.remove(idsToClose);
      await tabStore.refresh();
    }
    return ok({ closedCount: idsToClose.length });
  } catch (e) {
    return err("CLOSE_OTHER_FAILED", e instanceof Error ? e.message : "Failed to close other tabs");
  }
}

export async function muteAllAudio(): Promise<Result<{ mutedCount: number }>> {
  try {
    const audibleTabs = await chrome.tabs.query({ audible: true });
    let count = 0;
    for (const tab of audibleTabs) {
      if (tab.id) {
        await chrome.tabs.update(tab.id, { muted: true });
        count++;
      }
    }
    await tabStore.refresh();
    return ok({ mutedCount: count });
  } catch (e) {
    return err("MUTE_ALL_FAILED", e instanceof Error ? e.message : "Failed to mute audio");
  }
}

export async function deduplicateTabs(windowId?: number): Promise<Result<{ closedCount: number }>> {
  try {
    const queryFilter = windowId && windowId > 0 ? { windowId } : {};
    const tabs = await chrome.tabs.query(queryFilter);

    // Group tabs by normalized URL
    const urlGroups = new Map<string, chrome.tabs.Tab[]>();
    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;
      const norm = normalizeUrl(tab.url);
      if (!norm) continue;
      const group = urlGroups.get(norm) ?? [];
      group.push(tab);
      urlGroups.set(norm, group);
    }

    const idsToClose: number[] = [];

    for (const group of urlGroups.values()) {
      if (group.length <= 1) continue;

      // Retention order: active > pinned > lowest index
      group.sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return a.index - b.index;
      });

      // Keep index 0, close the rest
      for (let i = 1; i < group.length; i++) {
        const item = group[i];
        if (item?.id) idsToClose.push(item.id);
      }
    }

    if (idsToClose.length > 0) {
      await chrome.tabs.remove(idsToClose);
      await tabStore.refresh();
    }

    return ok({ closedCount: idsToClose.length });
  } catch (e) {
    return err("DEDUP_FAILED", e instanceof Error ? e.message : "Failed to deduplicate tabs");
  }
}

export async function suspendInactiveTabs(
  maxAgeMinutes = 30,
): Promise<Result<{ closedCount: number }>> {
  try {
    if (!chrome.tabs?.discard) {
      return err("DISCARD_UNSUPPORTED", "Discard API unsupported");
    }

    const tabs = await chrome.tabs.query({});
    const now = Date.now();
    const thresholdMs = maxAgeMinutes * 60 * 1000;
    let count = 0;

    for (const tab of tabs) {
      if (!tab.id || tab.active || tab.pinned || tab.discarded) continue;
      const lastAccessed = tab.lastAccessed ?? now;
      if (now - lastAccessed >= thresholdMs) {
        try {
          await chrome.tabs.discard(tab.id);
          count++;
        } catch {
          // Ignore individual discard failures
        }
      }
    }

    await tabStore.refresh();
    return ok({ closedCount: count });
  } catch (e) {
    return err("SUSPEND_FAILED", e instanceof Error ? e.message : "Failed to suspend tabs");
  }
}

export async function reloadAllTabs(windowId?: number): Promise<Result<{ reloadedCount: number }>> {
  try {
    const queryFilter = windowId && windowId > 0 ? { windowId } : {};
    const tabs = await chrome.tabs.query(queryFilter);
    let count = 0;

    for (const tab of tabs) {
      if (tab.id) {
        try {
          await chrome.tabs.reload(tab.id);
          count++;
        } catch {
          // Continue on individual reload error
        }
      }
    }

    return ok({ reloadedCount: count });
  } catch (e) {
    return err("RELOAD_FAILED", e instanceof Error ? e.message : "Failed to reload tabs");
  }
}

export async function restoreClosedTab(): Promise<Result<{ restored: boolean }>> {
  try {
    if (!chrome.sessions?.restore) {
      return err("SESSIONS_UNSUPPORTED", "Sessions API is unavailable");
    }
    const session = await chrome.sessions.restore();
    await tabStore.refresh();
    return ok({ restored: !!session });
  } catch (e) {
    return err("RESTORE_FAILED", e instanceof Error ? e.message : "No restorable session found");
  }
}

export async function exportSessionJson(): Promise<Result<{ json: string }>> {
  try {
    const [windows, rawTabs] = await Promise.all([
      chrome.windows.getAll({ populate: false }),
      chrome.tabs.query({}),
    ]);

    const sessionData = {
      version: 1,
      exportedAt: Date.now(),
      windows: windows.map((w) => ({
        windowId: w.id,
        tabs: rawTabs
          .filter((t) => t.windowId === w.id)
          .map((t) => ({
            title: t.title || "",
            url: t.url || "",
            pinned: !!t.pinned,
          })),
      })),
    };

    return ok({ json: JSON.stringify(sessionData, null, 2) });
  } catch (e) {
    return err("EXPORT_FAILED", e instanceof Error ? e.message : "Failed to export session");
  }
}

export async function copyUrlsMarkdown(windowId?: number): Promise<Result<{ markdown: string }>> {
  try {
    const queryFilter = windowId && windowId > 0 ? { windowId } : {};
    const tabs = await chrome.tabs.query(queryFilter);
    const lines = tabs
      .filter((t) => t.url && t.url.length > 0)
      .map((t) => `- [${t.title || extractDomain(t.url || "")}](${t.url})`);

    return ok({ markdown: lines.join("\n") });
  } catch (e) {
    return err("COPY_URLS_FAILED", e instanceof Error ? e.message : "Failed to format tab URLs");
  }
}

export async function sortWindowTabs(
  windowId: number,
  mode: "title" | "domain" | "mru",
): Promise<Result<void>> {
  try {
    const tabs = tabStore.getTabs({ windowId }).tabs;
    let sorted = [...tabs];

    if (mode === "title") {
      sorted = sortTabsByTitle(sorted);
    } else if (mode === "domain") {
      sorted = sortTabsByDomain(sorted);
    } else if (mode === "mru") {
      sorted = sortTabsByMRU(sorted);
    }

    for (let targetIndex = 0; targetIndex < sorted.length; targetIndex++) {
      const tab = sorted[targetIndex];
      if (tab) {
        await chrome.tabs.move(tab.id, { index: targetIndex });
      }
    }

    await tabStore.refresh();
    return ok(undefined);
  } catch (e) {
    return err("SORT_FAILED", e instanceof Error ? e.message : "Failed to sort tabs");
  }
}
