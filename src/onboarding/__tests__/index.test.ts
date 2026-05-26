import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import { StorageManager, DEFAULT_SETTINGS, resetMemoryStore } from "../../shared/storage";

interface MockElement {
  id?: string;
  value?: string;
  textContent?: string;
  className?: string;
  checked?: boolean;
  attributes: { [key: string]: string };
  classList: {
    add: (cls: string) => void;
    remove: (cls: string) => void;
    contains: (cls: string) => boolean;
    clear: () => void;
  };
  listeners: { [event: string]: Function[] };
  addEventListener: (event: string, cb: Function) => void;
  dispatchEvent: (event: any) => void;
  setAttribute: (key: string, val: string) => void;
  getAttribute: (key: string) => string | null;
  innerHTML?: string;
  children: MockElement[];
  appendChild: (child: MockElement) => void;
  querySelectorAll: (selector: string) => MockElement[];
}

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
    className: "",
    checked: false,
    attributes: {},
    classList: {
      add: (cls) => {
        classes.add(cls);
        mockElements[id].className = Array.from(classes).join(" ");
      },
      remove: (cls) => {
        classes.delete(cls);
        mockElements[id].className = Array.from(classes).join(" ");
      },
      contains: (cls) => classes.has(cls),
      clear: () => {
        classes.clear();
        mockElements[id].className = "";
      }
    },
    listeners: {},
    addEventListener(event, cb) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(cb);
    },
    dispatchEvent(event) {
      const eventType = typeof event === "string" ? event : event.key ? "keydown" : event.type;
      const listeners = this.listeners[eventType || ""];
      if (listeners) {
        listeners.forEach((cb) => cb(event));
      }
    },
    setAttribute(key, val) {
      this.attributes[key] = val;
    },
    getAttribute(key) {
      return this.attributes[key] || null;
    },
    innerHTML: "",
    children: [],
    appendChild(child) {
      this.children.push(child);
    },
    querySelectorAll(selector) {
      return this.children;
    }
  };
  return mockElements[id];
}

describe("Onboarding Page Unit Tests", () => {
  let docListeners: { [event: string]: Function[] } = {};
  let tabsCreated: Array<{ url: string }> = [];

  beforeAll(async () => {
    // 1. Scaffold all onboarding elements
    [
      "slide-1",
      "slide-2",
      "slide-3",
      "btn-back",
      "btn-next",
      "toast-saved",
      "btn-open-shortcuts",
      "playground-sandbox",
      "simulated-list",
      "simulated-overlay",
      "switch-toast",
      "mode-hold",
      "mode-toggle"
    ].forEach(getOrCreateMockElement);

    // Mock progress dots
    const progressDot1 = getOrCreateMockElement("step-dot-1");
    const progressDot2 = getOrCreateMockElement("step-dot-2");
    const progressDot3 = getOrCreateMockElement("step-dot-3");

    // 2. Wire document overrides
    global.document = {
      getElementById: (id: string) => mockElements[id] || null,
      querySelector: (selector: string) => {
        if (selector === ".steps-indicator") return mockElements["simulated-overlay"];
        if (selector === '[data-step="1"]') return progressDot1;
        if (selector === '[data-step="2"]') return progressDot2;
        if (selector === '[data-step="3"]') return progressDot3;
        return null;
      },
      addEventListener: (event: string, cb: Function) => {
        if (!docListeners[event]) docListeners[event] = [];
        docListeners[event].push(cb);
      },
      createElement: (tag: string) => {
        // Create an anonymous mock element
        return getOrCreateMockElement(`el-${Math.random().toString(36).substr(2, 9)}`);
      }
    } as any;

    global.window = {
      addEventListener: vi.fn(),
      setTimeout: (cb: Function) => cb()
    } as any;

    global.chrome = {
      tabs: {
        create: (data: { url: string }) => {
          tabsCreated.push(data);
        }
      }
    } as any;

    // Load onboarding controller bundle script
    await import("../index");
  });

  beforeEach(async () => {
    resetMemoryStore();
    tabsCreated.length = 0;
    await StorageManager.saveSettings(DEFAULT_SETTINGS);

    // Reset mocks
    Object.keys(mockElements).forEach((id) => {
      const el = mockElements[id];
      el.value = "";
      el.textContent = "";
      el.innerHTML = "";
      el.checked = false;
      el.attributes = {};
      el.children = [];
      el.listeners = {}; // Clear event listeners to prevent cross-test duplication
      el.classList.clear();
    });

    // Populate initial modes
    mockElements["mode-hold"] = getOrCreateMockElement("mode-hold");
    mockElements["mode-toggle"] = getOrCreateMockElement("mode-toggle");
  });

  it("should initialize default modes and slides correctly on DOMContentLoaded", async () => {
    // Assert DOMContentLoaded listener exists
    expect(docListeners["DOMContentLoaded"]).toBeDefined();
    docListeners["DOMContentLoaded"].forEach((cb) => cb());
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Holds mode card should be selected by default
    expect(mockElements["mode-hold"].classList.contains("selected")).toBe(true);
    expect(mockElements["mode-hold"].getAttribute("aria-checked")).toBe("true");
    expect(mockElements["mode-toggle"].classList.contains("selected")).toBe(false);
  });

  it("should auto-save activationMode changes to sync storage", async () => {
    docListeners["DOMContentLoaded"].forEach((cb) => cb());
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Simulate clicking toggle mode
    mockElements["mode-toggle"].dispatchEvent("click");
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Verify settings updated
    const settings = await StorageManager.getSettings();
    expect(settings.activationMode).toBe("toggle");
    expect(mockElements["mode-toggle"].classList.contains("selected")).toBe(true);
    expect(mockElements["mode-hold"].classList.contains("selected")).toBe(false);
  });

  it("should navigate slides when next and back buttons are clicked", async () => {
    docListeners["DOMContentLoaded"].forEach((cb) => cb());
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Default step is 1, next goes to 2
    mockElements["btn-next"].dispatchEvent("click");
    expect(mockElements["slide-1"].classList.contains("active")).toBe(false);
    expect(mockElements["slide-2"].classList.contains("active")).toBe(true);

    // Click back goes back to 1
    mockElements["btn-back"].dispatchEvent("click");
    expect(mockElements["slide-1"].classList.contains("active")).toBe(true);
    expect(mockElements["slide-2"].classList.contains("active")).toBe(false);
  });

  it("should trigger shortcuts redirect button correctly", async () => {
    docListeners["DOMContentLoaded"].forEach((cb) => cb());
    await new Promise((resolve) => setTimeout(resolve, 20));

    mockElements["btn-open-shortcuts"].dispatchEvent("click");
    expect(tabsCreated.length).toBe(1);
    expect(tabsCreated[0].url).toBe("chrome://extensions/shortcuts");
  });

  it("should simulate key cycle in the sandbox playground", async () => {
    docListeners["DOMContentLoaded"].forEach((cb) => cb());
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Focus and fire Alt+Q keydown on playground-sandbox
    const qEvent = {
      key: "q",
      altKey: true,
      preventDefault: vi.fn()
    };
    mockElements["playground-sandbox"].dispatchEvent(qEvent);

    expect(qEvent.preventDefault).toHaveBeenCalled();
  });
});
