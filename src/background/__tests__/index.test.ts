import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { MockTabAdapter } from "../../shared/adapter";
import { StorageManager, DEFAULT_SETTINGS } from "../../shared/storage";

// Setup Chrome global namespace mocks
const mockCommandsAddListener = vi.fn();
const mockRuntimeAddListener = vi.fn();
const mockAlarmsAddListener = vi.fn();
const mockAlarmsCreate = vi.fn();
const mockNotificationsCreate = vi.fn();
const mockSendMessage = vi.fn();

let commandListener: ((command: string) => Promise<void>) | null = null;
let messageListener: ((message: any, sender: any, sendResponse: (r: any) => void) => boolean) | null = null;
let alarmListener: ((alarm: { name: string }) => Promise<void>) | null = null;

mockCommandsAddListener.mockImplementation((cb) => {
  commandListener = cb;
});
mockRuntimeAddListener.mockImplementation((cb) => {
  messageListener = cb;
});
mockAlarmsAddListener.mockImplementation((cb) => {
  alarmListener = cb;
});

vi.stubGlobal("chrome", {
  commands: {
    onCommand: {
      addListener: mockCommandsAddListener,
    },
  },
  runtime: {
    onMessage: {
      addListener: mockRuntimeAddListener,
    },
    lastError: null,
  },
  alarms: {
    create: mockAlarmsCreate,
    onAlarm: {
      addListener: mockAlarmsAddListener,
    },
  },
  notifications: {
    create: mockNotificationsCreate,
  },
  tabs: {
    sendMessage: mockSendMessage,
    query: vi.fn((queryInfo, cb) => cb?.([])),
    update: vi.fn((tabId, updateProperties, cb) => cb?.({ id: tabId })),
    onActivated: { addListener: vi.fn() },
    onCreated: { addListener: vi.fn() },
    onRemoved: { addListener: vi.fn() },
  },
  windows: {
    update: vi.fn((windowId, updateProperties, cb) => cb?.({ id: windowId })),
  },
  storage: {
    sync: {
      get: vi.fn((key, cb) => cb?.({})),
      set: vi.fn((data, cb) => cb?.()),
    },
    local: {
      get: vi.fn((key, cb) => cb?.({})),
      set: vi.fn((data, cb) => cb?.()),
    },
  },
});

// We dynamically import index.ts to ensure mock registration happens first
let isRestrictedUrlFn: (url: string) => boolean;

describe("Background Service Worker Tests", () => {
  beforeAll(async () => {
    const mod = await import("../index");
    isRestrictedUrlFn = mod.isRestrictedUrl;
  });

  beforeEach(() => {
    mockNotificationsCreate.mockClear();
    mockSendMessage.mockClear();
  });

  describe("isRestrictedUrl Helper", () => {
    it("identifies chrome internal system URLs as restricted", () => {
      expect(isRestrictedUrlFn("chrome://settings")).toBe(true);
      expect(isRestrictedUrlFn("chrome-extension://abcdefg")).toBe(true);
      expect(isRestrictedUrlFn("about:blank")).toBe(true);
      expect(isRestrictedUrlFn("view-source:https://example.com")).toBe(true);
    });

    it("identifies Chrome Web Store URLs as restricted", () => {
      expect(isRestrictedUrlFn("https://chromewebstore.google.com/category/extensions")).toBe(true);
      expect(isRestrictedUrlFn("http://chromewebstore.google.com")).toBe(true);
    });

    it("allows standard, normal web pages", () => {
      expect(isRestrictedUrlFn("https://github.com/google")).toBe(false);
      expect(isRestrictedUrlFn("http://localhost:3000")).toBe(false);
      expect(isRestrictedUrlFn("https://news.ycombinator.com")).toBe(false);
    });

    it("handles invalid or empty URLs safely by restricting them", () => {
      expect(isRestrictedUrlFn("")).toBe(true);
      expect(isRestrictedUrlFn("not-a-url")).toBe(true);
    });
  });

  describe("Event Listeners and Command Router", () => {
    it("registers commands, messaging, and alarms listeners on start", () => {
      expect(mockCommandsAddListener).toHaveBeenCalledTimes(1);
      expect(mockRuntimeAddListener).toHaveBeenCalledTimes(1);
      expect(mockAlarmsAddListener).toHaveBeenCalledTimes(1);
      expect(mockAlarmsCreate).toHaveBeenCalledWith("mru-cleanup", { periodInMinutes: 60 });
    });

    it("handles switch-to-tab messaging cleanly", async () => {
      const sendResponse = vi.fn();
      
      // Trigger switcher message
      const keepChannelOpen = messageListener?.(
        { action: "switch-to-tab", tabId: 42, windowId: 1 },
        {},
        sendResponse
      );

      expect(keepChannelOpen).toBe(true);
      
      // Wait for promise resolution on microtask queue
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    it("ignores unrecognized message actions", () => {
      const sendResponse = vi.fn();
      const keepChannelOpen = messageListener?.(
        { action: "unrecognized-action" },
        {},
        sendResponse
      );
      expect(keepChannelOpen).toBeFalsy();
    });
  });
});
