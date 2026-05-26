import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import { StorageManager, DEFAULT_SETTINGS, resetMemoryStore } from "../../shared/storage";

interface MockElement {
  id?: string;
  value?: string;
  textContent?: string;
  checked?: boolean;
  classList: {
    add: (cls: string) => void;
    remove: (cls: string) => void;
    contains: (cls: string) => boolean;
  };
  listeners: { [event: string]: Function[] };
  addEventListener: (event: string, cb: Function) => void;
  dispatchEvent: (event: string) => void;
}

// Stable persistent registry to keep event handlers active across tests
const mockElements: { [id: string]: MockElement } = {};
const classesMap = new Map<string, Set<string>>();

function getOrCreateMockElement(id: string): MockElement {
  if (mockElements[id]) return mockElements[id];
  const classes = new Set<string>();
  classesMap.set(id, classes);

  mockElements[id] = {
    id,
    value: "",
    textContent: "",
    checked: false,
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
    }
  };
  return mockElements[id];
}

describe("Options Page Unit Tests", () => {
  let docListeners: { [event: string]: Function[] } = {};
  let docAttribute: string | null = null;
  let docAttributeValue: string | null = null;
  let tabsCreated: Array<{ url: string }> = [];

  beforeAll(async () => {
    // 1. Pre-populate all required mock elements
    [
      "maxVisible",
      "maxVisibleValue",
      "activationModeHold",
      "activationModeToggle",
      "theme",
      "cardLayoutGrid",
      "cardLayoutList",
      "showWindowBadge",
      "configureShortcutsBtn",
      "toast"
    ].forEach(getOrCreateMockElement);

    // 2. Bind mock globals
    global.document = {
      getElementById: (id: string) => mockElements[id] || null,
      querySelectorAll: (selector: string) => [],
      addEventListener: (event: string, cb: Function) => {
        if (!docListeners[event]) docListeners[event] = [];
        docListeners[event].push(cb);
      },
      documentElement: {
        setAttribute: (attr: string, val: string) => {
          docAttribute = attr;
          docAttributeValue = val;
        }
      }
    } as any;

    global.window = {
      setTimeout: (cb: Function, delay: number) => {
        // Return dummy ID without executing cb instantly to prevent immediate toast removal
        return 123;
      },
      clearTimeout: vi.fn(),
      addEventListener: vi.fn(),
      open: vi.fn()
    } as any;

    global.chrome = {
      tabs: {
        create: (data: { url: string }) => {
          tabsCreated.push(data);
        }
      }
    } as any;

    // 3. Statically import Options script ONCE to bind events to our stable mocks
    await import("../index");
  });

  beforeEach(async () => {
    resetMemoryStore();
    tabsCreated.length = 0;
    docAttribute = null;
    docAttributeValue = null;

    // Seed default settings in mock storage
    await StorageManager.saveSettings(DEFAULT_SETTINGS);

    // Reset stable element attributes and event listeners
    Object.keys(mockElements).forEach((id) => {
      const el = mockElements[id];
      el.value = "";
      el.textContent = "";
      el.checked = false;
      el.listeners = {};
      classesMap.get(id)?.clear();
    });
  });

  it("should load settings and populate DOM inputs on DOMContentLoaded", async () => {
    // Assert DOMContentLoaded listener was registered
    expect(docListeners["DOMContentLoaded"]).toBeDefined();
    expect(docListeners["DOMContentLoaded"].length).toBeGreaterThan(0);

    // Fire DOMContentLoaded
    docListeners["DOMContentLoaded"].forEach((cb) => cb());

    // Allow promise ticks to resolve
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Verify initial values reflect DEFAULT_SETTINGS
    expect(mockElements.maxVisible.value).toBe(DEFAULT_SETTINGS.maxVisible.toString());
    expect(mockElements.maxVisibleValue.textContent).toBe(DEFAULT_SETTINGS.maxVisible.toString());
    expect(mockElements.activationModeHold.checked).toBe(true);
    expect(mockElements.theme.value).toBe(DEFAULT_SETTINGS.theme);
    expect(mockElements.cardLayoutGrid.checked).toBe(true);
    expect(mockElements.showWindowBadge.checked).toBe(true);
    expect(docAttribute).toBe("data-theme");
    expect(docAttributeValue).toBe(DEFAULT_SETTINGS.theme);
  });

  it("should auto-save settings when form elements trigger change events", async () => {
    docListeners["DOMContentLoaded"].forEach((cb) => cb());
    await new Promise((resolve) => setTimeout(resolve, 20));

    // 1. Change max visible slider value and trigger change event
    mockElements.maxVisible.value = "12";
    mockElements.maxVisible.dispatchEvent("change");
    await new Promise((resolve) => setTimeout(resolve, 20));

    let saved = await StorageManager.getSettings();
    expect(saved.maxVisible).toBe(12);

    // 2. Change layout selection to 'list' and trigger change event
    mockElements.cardLayoutGrid.checked = false;
    mockElements.cardLayoutList.checked = true;
    mockElements.cardLayoutList.dispatchEvent("change");
    await new Promise((resolve) => setTimeout(resolve, 20));

    saved = await StorageManager.getSettings();
    expect(saved.cardLayout).toBe("list");

    // 3. Change theme selection to 'dark' and trigger change event
    mockElements.theme.value = "dark";
    mockElements.theme.dispatchEvent("change");
    await new Promise((resolve) => setTimeout(resolve, 20));

    saved = await StorageManager.getSettings();
    expect(saved.theme).toBe("dark");
    expect(docAttributeValue).toBe("dark");

    // Verify visual success toast appeared
    expect(mockElements.toast.classList.contains("show")).toBe(true);
  });

  it("should redirect user to shortcuts page when configure shortcuts button is clicked", async () => {
    docListeners["DOMContentLoaded"].forEach((cb) => cb());
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Simulate click
    mockElements.configureShortcutsBtn.dispatchEvent("click");

    expect(tabsCreated.length).toBe(1);
    expect(tabsCreated[0].url).toBe("chrome://extensions/shortcuts");
  });
});
