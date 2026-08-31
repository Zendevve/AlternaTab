import type { TabFilter, TabGroupItem, TabItem } from "../types/models";
import { extractDomain } from "../utils/domain";
import { calculateFrecencyScore } from "../utils/frecency";
import { sortTabsByFrecency } from "../utils/sorting";
import { configStore } from "./configStore";
import { sessionStore } from "./sessionStore";

class TabStore {
  private tabs: Map<number, TabItem> = new Map();
  private groups: Map<number, TabGroupItem> = new Map();
  private activeTabId = -1;
  private focusedWindowId = -1;

  async init(): Promise<void> {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    if (typeof chrome === "undefined" || !chrome.tabs) return;

    try {
      const [rawTabs, windows] = await Promise.all([
        chrome.tabs.query({}),
        chrome.windows ? chrome.windows.getAll({ populate: false }) : Promise.resolve([]),
      ]);

      const focusedWindow = windows.find((w) => w.focused);
      if (focusedWindow?.id) {
        this.focusedWindowId = focusedWindow.id;
      }

      if (chrome.tabGroups) {
        try {
          const rawGroups = await chrome.tabGroups.query({});
          this.groups.clear();
          for (const g of rawGroups) {
            this.groups.set(g.id, {
              id: g.id,
              windowId: g.windowId,
              title: g.title,
              color: g.color,
              collapsed: g.collapsed,
            });
          }
        } catch {
          // Tab groups permission or capability not available
        }
      }

      this.tabs.clear();
      const now = Date.now();
      const halfLife = configStore.get().frecencyHalfLifeMinutes;

      for (const t of rawTabs) {
        if (!t.id) continue;
        if (t.active && (t.windowId === this.focusedWindowId || this.focusedWindowId === -1)) {
          this.activeTabId = t.id;
        }

        const url = t.url || "";
        const domain = extractDomain(url);
        const stats = sessionStore.getStats(url);
        const lastActivated = stats.lastActivatedAt || t.lastAccessed || now;
        const elapsedMinutes = Math.max(0, (now - lastActivated) / 60000);

        const score = calculateFrecencyScore(
          stats.activationCount,
          elapsedMinutes,
          {
            pinned: t.pinned ? 1.35 : 1.0,
            audible: t.audible ? 1.5 : 1.0,
            currentWindow: t.windowId === this.focusedWindowId ? 1.2 : 1.0,
          },
          halfLife,
        );

        const tabItem: TabItem = {
          id: t.id,
          windowId: t.windowId,
          index: t.index,
          title: t.title || domain || "New Tab",
          url,
          domain,
          favIconUrl: t.favIconUrl,
          pinned: !!t.pinned,
          audible: !!t.audible,
          muted: !!t.mutedInfo?.muted,
          discarded: !!t.discarded,
          groupId: t.groupId ?? -1,
          lastAccessed: t.lastAccessed || now,
          lastActivatedAt: lastActivated,
          activationCount: stats.activationCount,
          frecencyScore: score,
        };

        this.tabs.set(t.id, tabItem);
      }
    } catch {
      // Query error handled gracefully
    }
  }

  getTabs(filter?: TabFilter): {
    tabs: TabItem[];
    groups: TabGroupItem[];
    activeTabId: number;
    focusedWindowId: number;
  } {
    let result = Array.from(this.tabs.values());

    if (filter?.windowId !== undefined && filter.windowId > 0) {
      result = result.filter((t) => t.windowId === filter.windowId);
    } else if (filter?.scope === "window" && this.focusedWindowId > 0) {
      result = result.filter((t) => t.windowId === this.focusedWindowId);
    }

    if (filter?.groupId !== undefined && filter.groupId > 0) {
      result = result.filter((t) => t.groupId === filter.groupId);
    }

    result = sortTabsByFrecency(result, this.activeTabId);

    const groupList = Array.from(this.groups.values());

    return {
      tabs: result,
      groups: groupList,
      activeTabId: this.activeTabId,
      focusedWindowId: this.focusedWindowId,
    };
  }

  getTab(id: number): TabItem | undefined {
    return this.tabs.get(id);
  }

  removeTab(id: number): void {
    this.tabs.delete(id);
  }

  setActiveTab(tabId: number, windowId: number): void {
    this.activeTabId = tabId;
    this.focusedWindowId = windowId;
  }

  setFocusedWindow(windowId: number): void {
    this.focusedWindowId = windowId;
  }
}

export const tabStore = new TabStore();
