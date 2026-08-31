import { sessionStore } from "../state/sessionStore";
import { tabStore } from "../state/tabStore";

let listenersRegistered = false;

export function registerBackgroundEvents(): void {
  if (listenersRegistered || typeof chrome === "undefined") return;
  listenersRegistered = true;

  // Tabs events
  if (chrome.tabs) {
    chrome.tabs.onCreated.addListener(() => {
      tabStore.refresh();
    });

    chrome.tabs.onRemoved.addListener((tabId) => {
      tabStore.removeTab(tabId);
    });

    chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
      if (changeInfo.status === "complete" || changeInfo.title || changeInfo.url) {
        tabStore.refresh();
      }
    });

    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      tabStore.setActiveTab(activeInfo.tabId, activeInfo.windowId);
      try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab?.url) {
          await sessionStore.recordActivation(tab.url);
        }
      } catch {
        // Tab get error ignored
      }
      await tabStore.refresh();
    });
  }

  // Windows events
  if (chrome.windows) {
    chrome.windows.onCreated.addListener(() => {
      tabStore.refresh();
    });

    chrome.windows.onRemoved.addListener(() => {
      tabStore.refresh();
    });

    chrome.windows.onFocusChanged.addListener((windowId) => {
      if (windowId > 0) {
        tabStore.setFocusedWindow(windowId);
      }
    });
  }

  // Tab Groups events
  if (chrome.tabGroups) {
    chrome.tabGroups.onCreated.addListener(() => {
      tabStore.refresh();
    });
    chrome.tabGroups.onUpdated.addListener(() => {
      tabStore.refresh();
    });
    chrome.tabGroups.onRemoved.addListener(() => {
      tabStore.refresh();
    });
  }

  // Commands events
  if (chrome.commands) {
    chrome.commands.onCommand.addListener(async (command) => {
      if (command === "toggle-overlay") {
        try {
          const [activeTab] = await chrome.tabs.query({
            active: true,
            lastFocusedWindow: true,
          });
          if (activeTab?.id) {
            await chrome.tabs.sendMessage(activeTab.id, {
              type: "TOGGLE_ALTERNATAB_OVERLAY",
            });
          }
        } catch {
          // Send message failure on restricted or unloaded page
        }
      }
    });
  }
}
