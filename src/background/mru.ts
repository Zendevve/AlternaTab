class MRUTracker {
  private mruList: number[] = [];

  constructor() {
    this.handleTabActivated = this.handleTabActivated.bind(this);
    this.handleTabRemoved = this.handleTabRemoved.bind(this);
  }

  public async initialize() {
    chrome.tabs.onActivated.addListener(this.handleTabActivated);
    chrome.tabs.onRemoved.addListener(this.handleTabRemoved);

    // Seed the MRU tracker with current tabs based on lastAccessed if available
    const tabs = await chrome.tabs.query({});
    tabs.sort((a, b) => {
      const aAccess = a.lastAccessed || 0;
      const bAccess = b.lastAccessed || 0;
      return bAccess - aAccess; // Descending order
    });

    this.mruList = tabs.map(t => t.id).filter((id): id is number => id !== undefined);
  }

  private handleTabActivated(activeInfo: any) {
    this.recordTabAccess(activeInfo.tabId);
  }

  private handleTabRemoved(tabId: number) {
    this.mruList = this.mruList.filter(id => id !== tabId);
  }

  private recordTabAccess(tabId: number) {
    this.mruList = this.mruList.filter(id => id !== tabId);
    this.mruList.unshift(tabId);
  }

  public getRank(tabId: number): number {
    const index = this.mruList.indexOf(tabId);
    return index !== -1 ? index : this.mruList.length;
  }
}

export const mruTracker = new MRUTracker();
