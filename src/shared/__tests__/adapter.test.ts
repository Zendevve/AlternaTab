import { describe, it, expect } from "vitest";
import { MockTabAdapter, TabInfo } from "../adapter";

describe("MockTabAdapter Tests", () => {
  it("should add tabs and track active tab", async () => {
    const adapter = new MockTabAdapter();
    const tab1: TabInfo = { id: 1, windowId: 10, title: "Tab 1", url: "https://a.com", incognito: false };
    const tab2: TabInfo = { id: 2, windowId: 10, title: "Tab 2", url: "https://b.com", incognito: false };

    adapter.triggerCreated(tab1);
    adapter.triggerCreated(tab2);

    const openTabs = await adapter.getRecentTabs(10);
    expect(openTabs.length).toBe(2);
    expect(openTabs[0]).toEqual(tab1);

    await adapter.switchToTab(2, 10);
    const active = await adapter.getActiveTab();
    expect(active).toEqual(tab2);
  });

  it("should trigger event listeners correctly", async () => {
    const adapter = new MockTabAdapter();
    let activatedFired = false;
    let removedFired = false;

    adapter.onTabActivated((tabId, windowId) => {
      expect(tabId).toBe(1);
      expect(windowId).toBe(10);
      activatedFired = true;
    });

    adapter.onTabRemoved((tabId) => {
      expect(tabId).toBe(1);
      removedFired = true;
    });

    const tab1: TabInfo = { id: 1, windowId: 10, title: "Tab 1", url: "https://a.com", incognito: false };
    adapter.triggerCreated(tab1);
    adapter.triggerActivated(1, 10);
    adapter.triggerRemoved(1);

    expect(activatedFired).toBe(true);
    expect(removedFired).toBe(true);
  });
});
