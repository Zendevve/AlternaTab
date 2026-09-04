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
        let activeTab: chrome.tabs.Tab | undefined;
        try {
          const [tab] = await chrome.tabs.query({
            active: true,
            lastFocusedWindow: true,
          });
          activeTab = tab;
        } catch {
          // Tab query error
        }

        const isRestricted =
          !activeTab?.url ||
          activeTab.url.startsWith("chrome://") ||
          activeTab.url.startsWith("chrome-extension://") ||
          activeTab.url.startsWith("https://chromewebstore.google.com") ||
          activeTab.url.startsWith("view-source:");

        if (!isRestricted && activeTab?.id) {
          try {
            await chrome.tabs.sendMessage(activeTab.id, {
              type: "TOGGLE_ALTERNATAB_OVERLAY",
            });
            return;
          } catch {
            // Message failed, fall through to fallback HUD
          }
        }

        // Fallback: open popup or HUD options tab
        try {
          if (typeof chrome.action?.openPopup === "function") {
            await chrome.action.openPopup();
            return;
          }
        } catch {
          // openPopup not supported or unavailable
        }

        try {
          await chrome.tabs.create({
            url: chrome.runtime.getURL("options.html?mode=hud"),
          });
        } catch {
          // Standalone HUD creation error handled
        }
      }
    });
  }
}
