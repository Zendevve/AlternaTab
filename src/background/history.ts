import type { HistoryItem } from "../types/models";
import { extractDomain } from "../utils/domain";

export async function getHistoryItems(maxResults = 200): Promise<HistoryItem[]> {
  if (typeof chrome === "undefined" || !chrome.history?.search) {
    return [];
  }
  try {
    const results = await chrome.history.search({ text: "", maxResults, startTime: 0 });
    return results
      .filter((r) => r.url)
      .map((r) => ({
        id: r.id ?? r.url!,
        url: r.url!,
        title: r.title || r.url!,
        domain: extractDomain(r.url!),
        lastVisitTime: r.lastVisitTime,
        visitCount: r.visitCount,
        typedCount: r.typedCount,
      }));
  } catch {
    return [];
  }
}

export async function searchHistoryItems(query: string, maxResults = 50): Promise<HistoryItem[]> {
  if (!query?.trim()) return getHistoryItems(maxResults);
  if (typeof chrome === "undefined" || !chrome.history?.search) return [];
  try {
    const results = await chrome.history.search({ text: query, maxResults, startTime: 0 });
    return results
      .filter((r) => r.url)
      .map((r) => ({
        id: r.id ?? r.url!,
        url: r.url!,
        title: r.title || r.url!,
        domain: extractDomain(r.url!),
        lastVisitTime: r.lastVisitTime,
        visitCount: r.visitCount,
        typedCount: r.typedCount,
      }));
  } catch {
    return [];
  }
}

export async function deleteHistoryEntry(url: string): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.history?.deleteUrl) {
    throw new Error("History API unavailable");
  }
  await chrome.history.deleteUrl({ url });
}
