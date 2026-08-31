import type { TabItem } from "../types/models";

export function compareTabTieBreakers(a: TabItem, b: TabItem, activeTabId?: number): number {
  if (activeTabId !== undefined) {
    if (a.id === activeTabId && b.id !== activeTabId) return -1;
    if (b.id === activeTabId && a.id !== activeTabId) return 1;
  }

  if (a.pinned !== b.pinned) {
    return a.pinned ? -1 : 1;
  }

  const aRecent = Math.max(a.lastActivatedAt, a.lastAccessed);
  const bRecent = Math.max(b.lastActivatedAt, b.lastAccessed);
  if (aRecent !== bRecent) {
    return bRecent - aRecent;
  }

  if (a.activationCount !== b.activationCount) {
    return b.activationCount - a.activationCount;
  }

  if (a.index !== b.index) {
    return a.index - b.index;
  }

  return a.id - b.id;
}

export function sortTabsByFrecency(tabs: TabItem[], activeTabId?: number): TabItem[] {
  return [...tabs].sort((a, b) => {
    if (Math.abs(a.frecencyScore - b.frecencyScore) > 0.0001) {
      return b.frecencyScore - a.frecencyScore;
    }
    return compareTabTieBreakers(a, b, activeTabId);
  });
}

export function sortTabsByTitle(tabs: TabItem[]): TabItem[] {
  return [...tabs].sort((a, b) => {
    const titleCmp = a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    if (titleCmp !== 0) return titleCmp;
    return a.index - b.index;
  });
}

export function sortTabsByDomain(tabs: TabItem[]): TabItem[] {
  return [...tabs].sort((a, b) => {
    const domainCmp = a.domain.localeCompare(b.domain, undefined, { sensitivity: "base" });
    if (domainCmp !== 0) return domainCmp;
    const titleCmp = a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    if (titleCmp !== 0) return titleCmp;
    return a.index - b.index;
  });
}

export function sortTabsByMRU(tabs: TabItem[]): TabItem[] {
  return [...tabs].sort((a, b) => {
    const aTime = Math.max(a.lastActivatedAt, a.lastAccessed);
    const bTime = Math.max(b.lastActivatedAt, b.lastAccessed);
    if (aTime !== bTime) return bTime - aTime;
    return a.index - b.index;
  });
}
