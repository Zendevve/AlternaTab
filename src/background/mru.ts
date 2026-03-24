/**
 * MRU (Most Recently Used) Tracker with persistence
 *
 * Uses chrome.storage.session to persist MRU state across service worker restarts.
 * This is critical for MV3 where service workers are ephemeral.
 */

const STORAGE_KEY = 'mru_list';
const MAX_MRU_SIZE = 100;

class MRUTracker {
  private mruList: number[] = [];

  constructor() {
    this.handleTabActivated = this.handleTabActivated.bind(this);
    this.handleTabRemoved = this.handleTabRemoved.bind(this);
  }

  public async initialize() {
    chrome.tabs.onActivated.addListener(this.handleTabActivated);
    chrome.tabs.onRemoved.addListener(this.handleTabRemoved);

    // Try to hydrate from persistent storage
    await this.hydrate();

    // If no persisted data, seed from current tabs based on lastAccessed
    if (this.mruList.length === 0) {
      await this.seedFromTabs();
    }
  }

  /**
   * Hydrate MRU list from chrome.storage.session
   * Falls back to seeding from tabs if storage is empty or invalid
   */
  private async hydrate(): Promise<void> {
    try {
      const result = await chrome.storage.session.get(STORAGE_KEY);
      if (result[STORAGE_KEY] && Array.isArray(result[STORAGE_KEY])) {
        this.mruList = result[STORAGE_KEY];
        // Prune invalid tab IDs after hydration
        await this.pruneInvalidTabs();
      }
    } catch (error) {
      console.warn('[MRU] Failed to hydrate from storage:', error);
    }
  }

  /**
   * Persist MRU list to chrome.storage.session
   */
  private async persist(): Promise<void> {
    try {
      await chrome.storage.session.set({ [STORAGE_KEY]: this.mruList });
    } catch (error) {
      console.warn('[MRU] Failed to persist to storage:', error);
    }
  }

  /**
   * Seed MRU list from current tabs sorted by lastAccessed
   */
  private async seedFromTabs(): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({});
      tabs.sort((a, b) => {
        const aAccess = a.lastAccessed || 0;
        const bAccess = b.lastAccessed || 0;
        return bAccess - aAccess; // Descending order (most recent first)
      });

      this.mruList = tabs
        .map(t => t.id)
        .filter((id): id is number => id !== undefined)
        .slice(0, MAX_MRU_SIZE);

      await this.persist();
    } catch (error) {
      console.warn('[MRU] Failed to seed from tabs:', error);
    }
  }

  /**
   * Prune invalid tab IDs that no longer exist
   */
  private async pruneInvalidTabs(): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({});
      const validIds = new Set(tabs.map(t => t.id).filter((id): id is number => id !== undefined));

      const beforeCount = this.mruList.length;
      this.mruList = this.mruList.filter(id => validIds.has(id));

      if (this.mruList.length !== beforeCount) {
        await this.persist();
      }
    } catch (error) {
      console.warn('[MRU] Failed to prune invalid tabs:', error);
    }
  }

  private handleTabActivated(activeInfo: chrome.tabs.TabActiveInfo) {
    this.recordTabAccess(activeInfo.tabId);
  }

  private handleTabRemoved(tabId: number) {
    this.mruList = this.mruList.filter(id => id !== tabId);
    this.persist();
  }

  private recordTabAccess(tabId: number): void {
    // Remove if already exists
    this.mruList = this.mruList.filter(id => id !== tabId);
    // Add to front
    this.mruList.unshift(tabId);
    // Enforce max size
    if (this.mruList.length > MAX_MRU_SIZE) {
      this.mruList = this.mruList.slice(0, MAX_MRU_SIZE);
    }
    this.persist();
  }

  public getRank(tabId: number): number {
    const index = this.mruList.indexOf(tabId);
    return index !== -1 ? index : this.mruList.length;
  }
}

export const mruTracker = new MRUTracker();
