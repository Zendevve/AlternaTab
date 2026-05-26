import { TabAdapter, TabInfo } from "../shared/adapter";
import { StorageManager, MRUEntry } from "../shared/storage";

export class MRUTracker {
  private adapter: TabAdapter;
  private mruList: number[] = [];
  private incognitoMruList: number[] = [];
  private tabIncognitoMap: Map<number, boolean> = new Map();

  constructor(adapter: TabAdapter) {
    this.adapter = adapter;
  }

  async initialize(): Promise<void> {
    const storedMru = await StorageManager.getMRUHistory(false);
    const storedIncognitoMru = await StorageManager.getMRUHistory(true);

    this.mruList = storedMru.map((e) => e.tabId);
    this.incognitoMruList = storedIncognitoMru.map((e) => e.tabId);

    const openTabs = await this.adapter.getRecentTabs(100);
    const openTabIds = new Set(openTabs.map((t) => t.id));

    for (const tab of openTabs) {
      this.tabIncognitoMap.set(tab.id, tab.incognito);
    }

    this.mruList = this.mruList.filter((id) => openTabIds.has(id));
    this.incognitoMruList = this.incognitoMruList.filter((id) => openTabIds.has(id));

    for (const tab of openTabs) {
      if (tab.incognito) {
        if (!this.incognitoMruList.includes(tab.id)) {
          this.incognitoMruList.push(tab.id);
        }
      } else {
        if (!this.mruList.includes(tab.id)) {
          this.mruList.push(tab.id);
        }
      }
    }

    const activeTab = await this.adapter.getActiveTab();
    if (activeTab) {
      this.moveTabToTop(activeTab.id, activeTab.incognito);
    }

    await this.saveHistory();

    this.adapter.onTabActivated(async (tabId, windowId) => {
      let isIncognito = this.tabIncognitoMap.get(tabId);
      if (isIncognito === undefined) {
        const openTabs = await this.adapter.getRecentTabs(500);
        const found = openTabs.find((t) => t.id === tabId);
        if (found) {
          isIncognito = found.incognito;
          this.tabIncognitoMap.set(tabId, found.incognito);
        } else {
          isIncognito = false;
        }
      }
      this.moveTabToTop(tabId, isIncognito);
      await this.saveHistory();
    });

    this.adapter.onTabCreated((tab) => {
      this.tabIncognitoMap.set(tab.id, tab.incognito);
      this.prependTab(tab.id, tab.incognito);
      this.saveHistory();
    });

    this.adapter.onTabRemoved((tabId) => {
      const isIncognito = this.tabIncognitoMap.get(tabId) || false;
      this.tabIncognitoMap.delete(tabId);
      this.removeTab(tabId, isIncognito);
      this.saveHistory();
    });
  }

  async pruneStaleTabs(): Promise<void> {
    const openTabs = await this.adapter.getRecentTabs(500);
    const openTabIds = new Set(openTabs.map((t) => t.id));

    this.mruList = this.mruList.filter((id) => openTabIds.has(id));
    this.incognitoMruList = this.incognitoMruList.filter((id) => openTabIds.has(id));

    await this.saveHistory();
  }

  private moveTabToTop(tabId: number, isIncognito: boolean): void {
    const list = isIncognito ? this.incognitoMruList : this.mruList;
    const index = list.indexOf(tabId);
    if (index > -1) {
      list.splice(index, 1);
    }
    list.unshift(tabId);

    if (list.length > 50) {
      list.pop();
    }
  }

  private prependTab(tabId: number, isIncognito: boolean): void {
    const list = isIncognito ? this.incognitoMruList : this.mruList;
    if (!list.includes(tabId)) {
      list.unshift(tabId);
      if (list.length > 50) {
        list.pop();
      }
    }
  }

  private removeTab(tabId: number, isIncognito: boolean): void {
    const list = isIncognito ? this.incognitoMruList : this.mruList;
    const index = list.indexOf(tabId);
    if (index > -1) {
      list.splice(index, 1);
    }
  }

  private async saveHistory(): Promise<void> {
    const now = Date.now();
    const entries: MRUEntry[] = this.mruList.map((id, index) => ({
      tabId: id,
      windowId: 0,
      lastActive: now - index * 1000,
    }));
    await StorageManager.saveMRUHistory(entries, false);

    const incognitoEntries: MRUEntry[] = this.incognitoMruList.map((id, index) => ({
      tabId: id,
      windowId: 0,
      lastActive: now - index * 1000,
    }));
    await StorageManager.saveMRUHistory(incognitoEntries, true);
  }

  async getRecentTabs(limit: number = 50, isIncognito: boolean = false): Promise<TabInfo[]> {
    const openTabs = await this.adapter.getRecentTabs(100);
    const openTabsMap = new Map(openTabs.map((t) => [t.id, t]));

    const list = isIncognito ? this.incognitoMruList : this.mruList;
    const sorted: TabInfo[] = [];

    for (const id of list) {
      const tab = openTabsMap.get(id);
      if (tab) {
        sorted.push(tab);
      }
    }

    for (const tab of openTabs) {
      if (tab.incognito === isIncognito && !list.includes(tab.id)) {
        sorted.push(tab);
      }
    }

    return sorted.slice(0, limit);
  }

  getMruList(isIncognito: boolean = false): number[] {
    return isIncognito ? [...this.incognitoMruList] : [...this.mruList];
  }
}
