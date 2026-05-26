import { describe, it, expect, beforeEach } from "vitest";
import { StorageManager, resetMemoryStore, DEFAULT_SETTINGS, UserSettings, MRUEntry } from "../storage";

describe("StorageManager Tests", () => {
  beforeEach(() => {
    resetMemoryStore();
  });

  it("should retrieve default settings if none exist", async () => {
    const settings = await StorageManager.getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it("should save and retrieve user settings correctly", async () => {
    const newSettings: UserSettings = {
      maxVisible: 12,
      activationMode: "toggle",
      theme: "dark",
      cardLayout: "list",
      showWindowBadge: false,
    };
    await StorageManager.saveSettings(newSettings);
    const settings = await StorageManager.getSettings();
    expect(settings).toEqual(newSettings);
  });

  it("should return empty regular history if none exist", async () => {
    const history = await StorageManager.getMRUHistory(false);
    expect(history).toEqual([]);
  });

  it("should save and retrieve regular history correctly", async () => {
    const history: MRUEntry[] = [
      { tabId: 1, windowId: 10, lastActive: 1000 },
      { tabId: 2, windowId: 10, lastActive: 2000 },
    ];
    await StorageManager.saveMRUHistory(history, false);
    const retrieved = await StorageManager.getMRUHistory(false);
    expect(retrieved).toEqual(history);
  });

  it("should return empty incognito history if none exist", async () => {
    const history = await StorageManager.getMRUHistory(true);
    expect(history).toEqual([]);
  });

  it("should save and retrieve incognito history correctly", async () => {
    const history: MRUEntry[] = [
      { tabId: 3, windowId: 20, lastActive: 3000 },
    ];
    await StorageManager.saveMRUHistory(history, true);
    const retrieved = await StorageManager.getMRUHistory(true);
    expect(retrieved).toEqual(history);
  });
});
