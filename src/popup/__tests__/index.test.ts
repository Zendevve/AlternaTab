import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import { StorageManager, DEFAULT_SETTINGS, resetMemoryStore, MRUEntry } from "../../shared/storage";

interface MockElement {
  id?: string;
  classList: {
    add: (cls: string) => void;
    remove: (cls: string) => void;
    contains: (cls: string) => boolean;
  };
  listeners: { [event: string]: Function[] };
  addEventListener: (event: string, cb: Function) => void;
  dispatchEvent: (event: string) => void;
  getAttribute: (attr: string) => string | null;
  textContent?: string;
}

// Stable persistent registries
const mockElements: { [id: string]: MockElement } = {};
const classesMap = new Map<string, Set<string>>();
let themeButtons: MockElement[] = [];
let layoutButtons: MockElement[] = [];

function getOrCreateMockElement(id: string, attrs: { [k: string]: string } = {}): MockElement {
  if (mockElements[id]) return mockElements[id];
  const classes = new Set<string>();
  classesMap.set(id, classes);

  mockElements[id] = {
    id,
    textContent: "",
    classList: {
      add: (cls) => classes.add(cls),
      remove: (cls) => classes.delete(cls),
      contains: (cls) => classes.has(cls)
    },
    listeners: {},
    addEventListener(event, cb) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(cb);
    },
    dispatchEvent(event) {
      if (this.listeners[event]) {
        this.listeners[event].forEach((cb) => cb());
      }
    },
    getAttribute: (attr) => attrs[attr] || null
  };
  return mockElements[id];
}

describe("Popup Page Unit Tests", () => {
  let docListeners: { [event: string]: Function[] } = {};
  let optionsPageOpened = false;
  let tabsCreated: Array<{ url: string }> = [];

  beforeAll(async () => {
    // 1. Pre-populate stable UI card buttons
    themeButtons = [
      getOrCreateMockElement("theme-light", { "data-value": "light" }),
      getOrCreateMockElement("theme-dark", { "data-value": "dark" }),
      getOrCreateMockElement("theme-auto", { "data-value": "auto" })
    ];

    layoutButtons = [
      getOrCreateMockElement("layout-grid", { "data-value": "grid" }),
      getOrCreateMockElement("layout-list", { "data-value": "list" })
    ];

    // Populated main container controls
    getOrCreateMockElement("trackedCount");
    getOrCreateMockElement("openOptionsBtn");
    getOrCreateMockElement("openShortcutsBtn");

    // 2. Setup stable global document query mocks
    global.document = {
      getElementById: (id: string) => mockElements[id] || null,
      querySelectorAll: (selector: string) => {
        if (selector.includes("themeGroup")) return themeButtons;
        if (selector.includes("layoutGroup")) return layoutButtons;
        return [];
      },
      addEventListener: (event: string, cb: Function) => {
        if (!docListeners[event]) docListeners[event] = [];
        docListeners[event].push(cb);
      }
    } as any;

    global.chrome = {
      runtime: {
        openOptionsPage: () => {
          optionsPageOpened = true;
        }
      },
      tabs: {
        create: (data: { url: string }) => {
          tabsCreated.push(data);
        }
      }
    } as any;

    // 3. Statically import Popup module once
    await import("../index");
  });

  beforeEach(async () => {
    resetMemoryStore();
    optionsPageOpened = false;
    tabsCreated.length = 0;

    // Seed default settings and mock history
    await StorageManager.saveSettings(DEFAULT_SETTINGS);
    const mockHistory: MRUEntry[] = [
      { tabId: 101, windowId: 1, lastActive: Date.now() },
      { tabId: 102, windowId: 1, lastActive: Date.now() },
      { tabId: 103, windowId: 1, lastActive: Date.now() }
    ];
    await StorageManager.saveMRUHistory(mockHistory, false);

    // Reset element visual attributes and event listeners
    Object.keys(mockElements).forEach((id) => {
      const el = mockElements[id];
      el.textContent = "";
      el.listeners = {};
      classesMap.get(id)?.clear();
    });

    // Handle default classes setup
    themeButtons[2].classList.add("active"); // default theme is 'auto'
    layoutButtons[0].classList.add("active"); // default layout is 'grid'
  });

  it("should initialize popup options and tracked metrics correctly", async () => {
    expect(docListeners["DOMContentLoaded"]).toBeDefined();
    docListeners["DOMContentLoaded"].forEach((cb) => cb());
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Verify MRU History count rendered correctly
    expect(mockElements.trackedCount.textContent).toBe("3 tabs");

    // Verify correct default buttons are active (theme: 'auto', layout: 'grid')
    expect(themeButtons[0].classList.contains("active")).toBe(false); // light
    expect(themeButtons[1].classList.contains("active")).toBe(false); // dark
    expect(themeButtons[2].classList.contains("active")).toBe(true);  // auto (default)

    expect(layoutButtons[0].classList.contains("active")).toBe(true);  // grid (default)
    expect(layoutButtons[1].classList.contains("active")).toBe(false); // list
  });

  it("should update sync storage and toggles when quick action buttons are clicked", async () => {
    docListeners["DOMContentLoaded"].forEach((cb) => cb());
    await new Promise((resolve) => setTimeout(resolve, 20));

    // 1. Click 'dark' theme button
    themeButtons[1].dispatchEvent("click");
    await new Promise((resolve) => setTimeout(resolve, 20));

    let saved = await StorageManager.getSettings();
    expect(saved.theme).toBe("dark");
    expect(themeButtons[1].classList.contains("active")).toBe(true);
    expect(themeButtons[2].classList.contains("active")).toBe(false);

    // 2. Click 'list' layout button
    layoutButtons[1].dispatchEvent("click");
    await new Promise((resolve) => setTimeout(resolve, 20));

    saved = await StorageManager.getSettings();
    expect(saved.cardLayout).toBe("list");
    expect(layoutButtons[1].classList.contains("active")).toBe(true);
    expect(layoutButtons[0].classList.contains("active")).toBe(false);
  });

  it("should launch options dashboard and keyboard shortcuts configure pages on click", async () => {
    docListeners["DOMContentLoaded"].forEach((cb) => cb());
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Click open options dashboard
    mockElements.openOptionsBtn.dispatchEvent("click");
    expect(optionsPageOpened).toBe(true);

    // Click configure hotkeys shortcuts redirect
    mockElements.openShortcutsBtn.dispatchEvent("click");
    expect(tabsCreated.length).toBe(1);
    expect(tabsCreated[0].url).toBe("chrome://extensions/shortcuts");
  });
});
