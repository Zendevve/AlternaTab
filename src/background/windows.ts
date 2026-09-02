import { tabStore } from "../state/tabStore";
import type { Result } from "../types/result";
import { err, ok } from "../types/result";

export async function splitTabToNewWindow(
  tabId: number,
): Promise<Result<{ windowId: number; tabId: number }>> {
  try {
    if (typeof chrome === "undefined" || !chrome.windows?.create) {
      return err("CHROME_API_UNAVAILABLE", "Chrome windows API is unavailable");
    }

    const newWindow = await chrome.windows.create({ tabId });
    if (!newWindow?.id) {
      return err("SPLIT_FAILED", "Failed to create new window for tab");
    }

    await tabStore.refresh();
    return ok({ windowId: newWindow.id, tabId });
  } catch (e) {
    return err("SPLIT_FAILED", e instanceof Error ? e.message : "Failed to split window");
  }
}

export async function mergeAllWindows(
  targetWindowId: number,
): Promise<Result<{ movedCount: number }>> {
  try {
    if (typeof chrome === "undefined" || !chrome.windows || !chrome.tabs) {
      return err("CHROME_API_UNAVAILABLE", "Chrome API is unavailable");
    }

    const allWindows = await chrome.windows.getAll({ populate: false });
    let movedCount = 0;

    for (const win of allWindows) {
      if (!win.id || win.id === targetWindowId) continue;

      const tabs = await chrome.tabs.query({ windowId: win.id });
      const tabIds = tabs.map((t) => t.id).filter((id): id is number => typeof id === "number");

      if (tabIds.length > 0) {
        try {
          await chrome.tabs.move(tabIds, { windowId: targetWindowId, index: -1 });
          movedCount += tabIds.length;
        } catch {
          // Tab move failure on restricted tab ignored
        }
      }
    }

    await tabStore.refresh();
    return ok({ movedCount });
  } catch (e) {
    return err("MERGE_FAILED", e instanceof Error ? e.message : "Failed to merge windows");
  }
}

export async function getWindows(): Promise<import("../types/models").WindowItem[]> {
  if (typeof chrome === "undefined" || !chrome.windows?.getAll) {
    return [];
  }
  try {
    const wins = await chrome.windows.getAll({ populate: true } as any);
    return wins.map((w) => ({
      id: w.id ?? -1,
      focused: !!w.focused,
      incognito: !!w.incognito,
      tabCount: (w as any).tabs ? (((w as any).tabs as chrome.tabs.Tab[]).length) : 0,
      title: w.id ? `Window ${w.id}` : "Window",
    }));
  } catch {
    return [];
  }
}
