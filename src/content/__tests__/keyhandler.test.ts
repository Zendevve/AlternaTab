import { describe, it, expect, vi, beforeEach } from "vitest";
import { KeyHandler } from "../keyhandler";
import { TabInfo } from "../../shared/adapter";
import { UserSettings } from "../../shared/storage";

// Pure-Node mock implementations of Window and Events for blistering fast test execution
class MockEventTarget {
  private listeners: { [type: string]: Array<(e: any) => void> } = {};

  addEventListener(type: string, listener: any) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: any) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
  }

  dispatchEvent(event: any) {
    const list = this.listeners[event.type] || [];
    for (const listener of list) {
      listener(event);
    }
    return true;
  }
}

const mockWindow = new MockEventTarget() as any;

// Attach mock globals
global.window = mockWindow;

global.KeyboardEvent = class MockKeyboardEvent {
  type: string;
  key: string;
  altKey: boolean;
  shiftKey: boolean;
  preventDefault = vi.fn();
  stopPropagation = vi.fn();

  constructor(type: string, init?: any) {
    this.type = type;
    this.key = init?.key || "";
    this.altKey = init?.altKey || false;
    this.shiftKey = init?.shiftKey || false;
  }
} as any;

global.Event = class MockEvent {
  type: string;
  constructor(type: string) {
    this.type = type;
  }
} as any;

describe("KeyHandler", () => {
  let mockTabs: TabInfo[];
  let defaultSettings: UserSettings;
  let onSwitch: ReturnType<typeof vi.fn>;
  let onDismiss: ReturnType<typeof vi.fn>;
  let onRender: ReturnType<typeof vi.fn>;
  let keyHandler: KeyHandler;

  beforeEach(() => {
    mockTabs = [
      { id: 10, windowId: 1, title: "Tab A", url: "a.com", incognito: false },
      { id: 20, windowId: 1, title: "Tab B", url: "b.com", incognito: false },
      { id: 30, windowId: 1, title: "Tab C", url: "c.com", incognito: false },
      { id: 40, windowId: 1, title: "Tab D", url: "d.com", incognito: false },
    ];

    defaultSettings = {
      maxVisible: 9,
      activationMode: "hold",
      theme: "auto",
      cardLayout: "list",
      showWindowBadge: true,
    };

    onSwitch = vi.fn();
    onDismiss = vi.fn();
    onRender = vi.fn();

    vi.spyOn(window, "addEventListener");
    vi.spyOn(window, "removeEventListener");

    keyHandler = new KeyHandler({ onSwitch, onDismiss, onRender });
  });

  it("should open and preselect the second tab in the list", () => {
    keyHandler.open(mockTabs, defaultSettings);

    expect(keyHandler.isOpen).toBe(true);
    expect(keyHandler.isAltHeld).toBe(true);
    expect(keyHandler.activeSelectionIndex).toBe(1); // Preselect last active tab
    expect(onRender).toHaveBeenCalledWith(mockTabs, 1);
    expect(window.addEventListener).toHaveBeenCalledWith("keydown", expect.any(Function), true);
  });

  it("should preselect first tab if only one exists", () => {
    keyHandler.open([mockTabs[0]], defaultSettings);
    expect(keyHandler.activeSelectionIndex).toBe(0);
  });

  it("should close and remove event listeners cleanly", () => {
    keyHandler.open(mockTabs, defaultSettings);
    keyHandler.close();

    expect(keyHandler.isOpen).toBe(false);
    expect(keyHandler.isAltHeld).toBe(false);
    expect(window.removeEventListener).toHaveBeenCalledWith("keydown", expect.any(Function), true);
  });

  it("should cycle selection forward on cycleSelection(1)", () => {
    keyHandler.open(mockTabs, defaultSettings);
    expect(keyHandler.activeSelectionIndex).toBe(1);

    keyHandler.cycleSelection(1);
    expect(keyHandler.activeSelectionIndex).toBe(2);

    keyHandler.cycleSelection(2); // (2 + 2) % 4 = 0
    expect(keyHandler.activeSelectionIndex).toBe(0);
  });

  it("should cycle selection backward on cycleSelection(-1)", () => {
    keyHandler.open(mockTabs, defaultSettings);
    expect(keyHandler.activeSelectionIndex).toBe(1);

    keyHandler.cycleSelection(-1);
    expect(keyHandler.activeSelectionIndex).toBe(0);

    keyHandler.cycleSelection(-1); // Wrap around to end index
    expect(keyHandler.activeSelectionIndex).toBe(3);
  });

  it("should trigger confirmSelection on Enter or Space press", () => {
    keyHandler.open(mockTabs, defaultSettings);

    const eventEnter = new KeyboardEvent("keydown", { key: "Enter" });
    window.dispatchEvent(eventEnter);

    expect(onSwitch).toHaveBeenCalledWith(20, 1);
  });

  it("should cycle selection on Alt+Q keydown", () => {
    keyHandler.open(mockTabs, defaultSettings);
    expect(keyHandler.activeSelectionIndex).toBe(1);

    const eventAltQ = new KeyboardEvent("keydown", {
      key: "q",
      altKey: true,
    });
    window.dispatchEvent(eventAltQ);

    expect(keyHandler.activeSelectionIndex).toBe(2);
  });

  it("should cycle backward on Alt+Shift+Q keydown", () => {
    keyHandler.open(mockTabs, defaultSettings);
    expect(keyHandler.activeSelectionIndex).toBe(1);

    const eventAltShiftQ = new KeyboardEvent("keydown", {
      key: "Q",
      altKey: true,
      shiftKey: true,
    });
    window.dispatchEvent(eventAltShiftQ);

    expect(keyHandler.activeSelectionIndex).toBe(0);
  });

  it("should cycle on ArrowUp and ArrowDown in list layout", () => {
    keyHandler.open(mockTabs, defaultSettings);
    expect(keyHandler.activeSelectionIndex).toBe(1);

    const eventArrowDown = new KeyboardEvent("keydown", { key: "ArrowDown" });
    window.dispatchEvent(eventArrowDown);
    expect(keyHandler.activeSelectionIndex).toBe(2);

    const eventArrowUp = new KeyboardEvent("keydown", { key: "ArrowUp" });
    window.dispatchEvent(eventArrowUp);
    expect(keyHandler.activeSelectionIndex).toBe(1);
  });

  it("should jump rows on ArrowUp and ArrowDown in grid layout", () => {
    const settingsGrid = { ...defaultSettings, cardLayout: "grid" as const };
    keyHandler.open(mockTabs, settingsGrid);
    expect(keyHandler.activeSelectionIndex).toBe(1);

    const eventArrowDown = new KeyboardEvent("keydown", { key: "ArrowDown" });
    window.dispatchEvent(eventArrowDown);
    expect(keyHandler.activeSelectionIndex).toBe(0); // (1 + 3) % 4 = 0

    const eventArrowUp = new KeyboardEvent("keydown", { key: "ArrowUp" });
    window.dispatchEvent(eventArrowUp);
    expect(keyHandler.activeSelectionIndex).toBe(1); // (0 - 3 + 4) % 4 = 1
  });

  it("should trigger confirmSelection on Alt release when in Hold Mode", () => {
    keyHandler.open(mockTabs, defaultSettings);

    const eventAltRelease = new KeyboardEvent("keyup", { key: "Alt" });
    window.dispatchEvent(eventAltRelease);

    expect(onSwitch).toHaveBeenCalledWith(20, 1);
  });

  it("should NOT trigger confirmSelection on Alt release when in Toggle Mode", () => {
    const settingsToggle = { ...defaultSettings, activationMode: "toggle" as const };
    keyHandler.open(mockTabs, settingsToggle);

    const eventAltRelease = new KeyboardEvent("keyup", { key: "Alt" });
    window.dispatchEvent(eventAltRelease);

    expect(onSwitch).not.toHaveBeenCalled();
  });

  it("should trigger onDismiss on Escape key press", () => {
    keyHandler.open(mockTabs, defaultSettings);

    const eventEscape = new KeyboardEvent("keydown", { key: "Escape" });
    window.dispatchEvent(eventEscape);

    expect(onDismiss).toHaveBeenCalled();
  });

  it("should trigger onDismiss on window blur event", () => {
    keyHandler.open(mockTabs, defaultSettings);

    const eventBlur = new Event("blur");
    window.dispatchEvent(eventBlur);

    expect(onDismiss).toHaveBeenCalled();
  });
});
