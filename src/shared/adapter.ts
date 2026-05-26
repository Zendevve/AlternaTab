export interface TabInfo {
  id: number;
  windowId: number;
  title: string;
  url: string;
  favIconUrl?: string;
  incognito: boolean;
}

export interface TabAdapter {
  getActiveTab(): Promise<TabInfo | null>;
  getRecentTabs(limit: number): Promise<TabInfo[]>;
  switchToTab(tabId: number, windowId: number): Promise<void>;
  onTabActivated(callback: (tabId: number, windowId: number) => void): void;
  onTabRemoved(callback: (tabId: number) => void): void;
  onTabCreated(callback: (tab: TabInfo) => void): void;
}

function mapTabToTabInfo(tab: chrome.tabs.Tab): TabInfo {
  return {
    id: tab.id || -1,
    windowId: tab.windowId || -1,
    title: tab.title || "",
    url: tab.url || "",
    favIconUrl: tab.favIconUrl,
    incognito: tab.incognito || false,
  };
}

export class ChromeTabAdapter implements TabAdapter {
  async getActiveTab(): Promise<TabInfo | null> {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
          resolve(null);
        } else {
          resolve(mapTabToTabInfo(tabs[0]));
        }
      });
    });
  }

  async getRecentTabs(limit: number): Promise<TabInfo[]> {
    return new Promise((resolve) => {
      chrome.tabs.query({}, (tabs) => {
        if (chrome.runtime.lastError || !tabs) {
          resolve([]);
        } else {
          resolve(tabs.map(mapTabToTabInfo).slice(0, limit));
        }
      });
    });
  }

  async switchToTab(tabId: number, windowId: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      chrome.tabs.update(tabId, { active: true }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        chrome.windows.update(windowId, { focused: true }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    });
  }

  onTabActivated(callback: (tabId: number, windowId: number) => void): void {
    chrome.tabs.onActivated.addListener((activeInfo) => {
      callback(activeInfo.tabId, activeInfo.windowId);
    });
  }

  onTabRemoved(callback: (tabId: number) => void): void {
    chrome.tabs.onRemoved.addListener((tabId) => {
      callback(tabId);
    });
  }

  onTabCreated(callback: (tab: TabInfo) => void): void {
    chrome.tabs.onCreated.addListener((tab) => {
      callback(mapTabToTabInfo(tab));
    });
  }
}

export class MockTabAdapter implements TabAdapter {
  public tabs: TabInfo[] = [];
  private activeTabId: number | null = null;
  private activeWindowId: number | null = null;

  private activatedListeners: Array<(tabId: number, windowId: number) => void> = [];
  private removedListeners: Array<(tabId: number) => void> = [];
  private createdListeners: Array<(tab: TabInfo) => void> = [];

  async getActiveTab(): Promise<TabInfo | null> {
    if (this.activeTabId === null) return null;
    const tab = this.tabs.find((t) => t.id === this.activeTabId);
    return tab || null;
  }

  async getRecentTabs(limit: number): Promise<TabInfo[]> {
    return this.tabs.slice(0, limit);
  }

  async switchToTab(tabId: number, windowId: number): Promise<void> {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (!tab) {
      throw new Error(`Tab with ID ${tabId} not found`);
    }
    this.activeTabId = tabId;
    this.activeWindowId = windowId;
    this.triggerActivated(tabId, windowId);
  }

  onTabActivated(callback: (tabId: number, windowId: number) => void): void {
    this.activatedListeners.push(callback);
  }

  onTabRemoved(callback: (tabId: number) => void): void {
    this.removedListeners.push(callback);
  }

  onTabCreated(callback: (tab: TabInfo) => void): void {
    this.createdListeners.push(callback);
  }

  // Simulated event dispatcher helpers for tests
  triggerActivated(tabId: number, windowId: number): void {
    this.activeTabId = tabId;
    this.activeWindowId = windowId;
    for (const listener of this.activatedListeners) {
      listener(tabId, windowId);
    }
  }

  triggerRemoved(tabId: number): void {
    this.tabs = this.tabs.filter((t) => t.id !== tabId);
    if (this.activeTabId === tabId) {
      this.activeTabId = this.tabs.length > 0 ? this.tabs[0].id : null;
    }
    for (const listener of this.removedListeners) {
      listener(tabId);
    }
  }

  triggerCreated(tab: TabInfo): void {
    this.tabs.push(tab);
    for (const listener of this.createdListeners) {
      listener(tab);
    }
  }
}
