import { ChromeTabAdapter } from "../shared/adapter";
import { StorageManager } from "../shared/storage";
import { MRUTracker } from "./tracker";

// Helper to determine if url is restricted from content scripts injection
export function isRestrictedUrl(url: string): boolean {
  if (!url) return true;
  const restrictedPrefixes = ["chrome://", "chrome-extension://", "view-source:", "about:", "chrome-error://"];
  if (restrictedPrefixes.some(prefix => url.startsWith(prefix))) {
    return true;
  }
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "chromewebstore.google.com" || parsed.hostname.endsWith(".chrome.com")) {
      return true;
    }
  } catch (e) {
    // Treat invalid URLs as restricted for safety
    return true;
  }
  return false;
}

const adapter = new ChromeTabAdapter();
const tracker = new MRUTracker(adapter);

// Initialize tracker
tracker.initialize().catch((err) => {
  console.error("MRUTracker initialization failed:", err);
});

// Open onboarding walkthrough on first install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: "src/onboarding/index.html" });
  }
});

// Setup command router
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-switcher") {
    try {
      const activeTab = await adapter.getActiveTab();
      if (!activeTab) return;

      if (isRestrictedUrl(activeTab.url)) {
        chrome.notifications.create("restricted-page-warning", {
          type: "basic",
          iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
          title: "alternaTab Switcher Restricted",
          message: "Google Chrome restricts content scripts on system pages (chrome://) and the Chrome Web Store.",
          priority: 2
        });
        return;
      }

      const settings = await StorageManager.getSettings();
      const recentTabs = await tracker.getRecentTabs(settings.maxVisible, activeTab.incognito);

      chrome.tabs.sendMessage(activeTab.id, {
        action: "toggle-switcher",
        tabs: recentTabs,
        settings: settings
      }, () => {
        if (chrome.runtime.lastError) {
          console.warn("Content script warning:", chrome.runtime.lastError.message);
        }
      });
    } catch (e) {
      console.error("Failed to run toggle command:", e);
    }
  }
});

// Listen for runtime messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "switch-to-tab") {
    const { tabId, windowId } = message;
    adapter.switchToTab(tabId, windowId)
      .then(() => sendResponse({ success: true }))
      .catch((err) => {
        console.error("Failed to switch tab:", err);
        sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) });
      });
    return true; // Keep channel open for async response
  }
});

// Hourly database pruning alarm
chrome.alarms.create("mru-cleanup", { periodInMinutes: 60 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "mru-cleanup") {
    try {
      await tracker.pruneStaleTabs();
      console.log("MRU list periodic pruning complete.");
    } catch (err) {
      console.error("Hourly tracker cleanup alarm failed:", err);
    }
  }
});
