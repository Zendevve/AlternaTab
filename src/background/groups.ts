import { tabStore } from "../state/tabStore";
import type { Result } from "../types/result";
import { err, ok } from "../types/result";
import { extractDomain, getDomainColor } from "../utils/domain";

export async function groupTabsByDomain(
  windowId?: number,
): Promise<Result<{ groupedCount: number }>> {
  try {
    if (typeof chrome === "undefined" || !chrome.tabs?.group || !chrome.tabGroups) {
      return err("GROUPS_UNSUPPORTED", "Chrome tabGroups API is unavailable");
    }

    const queryFilter = windowId && windowId > 0 ? { windowId } : {};
    const tabs = await chrome.tabs.query(queryFilter);

    // Collect domain -> tab IDs (excluding pinned or internal tabs without domain)
    const domainMap = new Map<string, number[]>();
    for (const tab of tabs) {
      if (!tab.id || tab.pinned) continue;
      const domain = extractDomain(tab.url || "");
      if (!domain) continue;

      const ids = domainMap.get(domain) ?? [];
      ids.push(tab.id);
      domainMap.set(domain, ids);
    }

    // Existing groups in window(s)
    const existingGroups = await chrome.tabGroups.query(queryFilter);
    const existingGroupMap = new Map<string, number>();
    for (const g of existingGroups) {
      if (g.title) {
        existingGroupMap.set(g.title.toLowerCase(), g.id);
      }
    }

    let groupedCount = 0;

    for (const [domain, tabIds] of domainMap.entries()) {
      const firstId = tabIds[0];
      if (firstId === undefined) continue;

      const nonNullTabIds: [number, ...number[]] = [firstId, ...tabIds.slice(1)];

      try {
        const existingId = existingGroupMap.get(domain);
        if (existingId !== undefined) {
          await chrome.tabs.group({ tabIds: nonNullTabIds, groupId: existingId });
        } else {
          const newGroupId = await chrome.tabs.group({ tabIds: nonNullTabIds });
          await chrome.tabGroups.update(newGroupId, {
            title: domain,
            color: getDomainColor(domain),
          });
        }
        groupedCount += tabIds.length;
      } catch {
        // Individual grouping error ignored
      }
    }

    await tabStore.refresh();
    return ok({ groupedCount });
  } catch (e) {
    return err("GROUP_FAILED", e instanceof Error ? e.message : "Failed to group tabs by domain");
  }
}
