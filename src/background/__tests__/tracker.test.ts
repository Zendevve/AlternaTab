import { describe, it, expect, beforeEach } from "vitest";
import { MockTabAdapter } from "../../shared/adapter";
import { StorageManager, resetMemoryStore } from "../../shared/storage";
import { MRUTracker } from "../tracker";

describe("MRUTracker Tests", () => {
  beforeEach(() => {
    resetMemoryStore();
  });

  it("should initialize lists, sync open tabs, and focus active tab", async () => {
    const adapter = new MockTabAdapter();
    const tracker = new MRUTracker(adapter);

    const tab1 = { id: 1, windowId: 10, title: "Tab 1", url: "https://a.com", incognito: false };
    const tab2 = { id: 2, windowId: 10, title: "Tab 2", url: "https://b.com", incognito: false };

    adapter.triggerCreated(tab1);
    adapter.triggerCreated(tab2);
    adapter.triggerActivated(2, 10);

    await tracker.initialize();

    expect(tracker.getMruList(false)).toEqual([2, 1]);

    const recent = await tracker.getRecentTabs(10, false);
    expect(recent[0].id).toBe(2);
    expect(recent[1].id).toBe(1);
  });

  it("should handle tab activation, moving it to top of list", async () => {
    const adapter = new MockTabAdapter();
    const tracker = new MRUTracker(adapter);

    const tab1 = { id: 1, windowId: 10, title: "Tab 1", url: "https://a.com", incognito: false };
    const tab2 = { id: 2, windowId: 10, title: "Tab 2", url: "https://b.com", incognito: false };

    adapter.triggerCreated(tab1);
    adapter.triggerCreated(tab2);
    adapter.triggerActivated(1, 10);

    await tracker.initialize();
    expect(tracker.getMruList(false)).toEqual([1, 2]);

    adapter.triggerActivated(2, 10);
    expect(tracker.getMruList(false)).toEqual([2, 1]);

    const stored = await StorageManager.getMRUHistory(false);
    expect(stored.map((s) => s.tabId)).toEqual([2, 1]);
  });

  it("should handle tab creation and tab removal", async () => {
    const adapter = new MockTabAdapter();
    const tracker = new MRUTracker(adapter);

    const tab1 = { id: 1, windowId: 10, title: "Tab 1", url: "https://a.com", incognito: false };
    adapter.triggerCreated(tab1);
    adapter.triggerActivated(1, 10);

    await tracker.initialize();
    expect(tracker.getMruList(false)).toEqual([1]);

    const tab2 = { id: 2, windowId: 10, title: "Tab 2", url: "https://b.com", incognito: false };
    adapter.triggerCreated(tab2);
    expect(tracker.getMruList(false)).toEqual([2, 1]);

    adapter.triggerRemoved(1);
    expect(tracker.getMruList(false)).toEqual([2]);
  });

  it("should enforce the maximum limit of 50 tabs", async () => {
    const adapter = new MockTabAdapter();
    const tracker = new MRUTracker(adapter);

    await tracker.initialize();

    for (let i = 1; i <= 55; i++) {
      adapter.triggerCreated({ id: i, windowId: 10, title: `Tab ${i}`, url: `https://${i}.com`, incognito: false });
      adapter.triggerActivated(i, 10);
    }

    expect(tracker.getMruList(false).length).toBe(50);
    expect(tracker.getMruList(false)[0]).toBe(55);
  });

  it("should isolate incognito tabs securely", async () => {
    const adapter = new MockTabAdapter();
    const tracker = new MRUTracker(adapter);

    const tab1 = { id: 1, windowId: 10, title: "Tab 1", url: "https://a.com", incognito: false };
    const tab2 = { id: 2, windowId: 10, title: "Incognito Tab 2", url: "https://b.com", incognito: true };

    adapter.triggerCreated(tab1);
    adapter.triggerCreated(tab2);
    adapter.triggerActivated(1, 10);

    await tracker.initialize();

    expect(tracker.getMruList(false)).toEqual([1]);
    expect(tracker.getMruList(true)).toEqual([2]);

    adapter.triggerActivated(2, 10);
    expect(tracker.getMruList(false)).toEqual([1]);
    expect(tracker.getMruList(true)).toEqual([2]);

    const storedNormal = await StorageManager.getMRUHistory(false);
    const storedIncognito = await StorageManager.getMRUHistory(true);

    expect(storedNormal.map((s) => s.tabId)).toEqual([1]);
    expect(storedIncognito.map((s) => s.tabId)).toEqual([2]);
  });
});
