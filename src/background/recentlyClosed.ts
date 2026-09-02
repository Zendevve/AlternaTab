import type { RecentlyClosedItem } from "../types/models";
import { extractDomain } from "../utils/domain";

export async function getRecentlyClosed(maxResults = 25): Promise<RecentlyClosedItem[]> {
  if (typeof chrome === "undefined" || !chrome.sessions?.getRecentlyClosed) {
    return [];
  }
  try {
    const sessions = await chrome.sessions.getRecentlyClosed({ maxResults } as any);
    const out: RecentlyClosedItem[] = [];
    for (const s of sessions) {
      const tab = (s as any).tab as chrome.tabs.Tab | undefined;
      if (tab?.url) {
        out.push({
          sessionId: (s as any).tab?.sessionId ?? tab.url + ":" + (tab.id ?? Math.random()),
          title: tab.title || tab.url,
          url: tab.url,
          domain: extractDomain(tab.url),
          favIconUrl: tab.favIconUrl,
          lastModified: s.lastModified ?? Date.now(),
          tabId: tab.id,
          windowId: tab.windowId,
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}
