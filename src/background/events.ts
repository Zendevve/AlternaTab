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

  if (chrome.commands) {
    chrome.commands.onCommand.addListener(async (command) => {
      if (command === "toggle-overlay" || command === "_execute_action") {
        await triggerToggleOverlay();
      }
    });
  }

  if (chrome.action?.onClicked) {
    chrome.action.onClicked.addListener(async () => {
      await triggerToggleOverlay();
    });
  }
}

export async function triggerToggleOverlay(): Promise<void> {
  let activeTab: chrome.tabs.Tab | undefined;
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    activeTab = tab;
  } catch {
    // Query error
  }

  if (!activeTab) {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      activeTab = tab;
    } catch {
      // Query error
    }
  }

  if (!activeTab) {
    try {
      const tabs = await chrome.tabs.query({ active: true });
      activeTab = tabs[0];
    } catch {
      // Query error
    }
  }

  const isRestricted =
    Boolean(activeTab?.url) &&
    (activeTab!.url!.startsWith("chrome://") ||
      activeTab!.url!.startsWith("chrome-extension://") ||
      activeTab!.url!.startsWith("https://chromewebstore.google.com") ||
      activeTab!.url!.startsWith("view-source:"));

  if (activeTab?.id && !isRestricted) {
    try {
      await chrome.tabs.sendMessage(activeTab.id, {
        type: "TOGGLE_ALTERNATAB_OVERLAY",
      });
      return;
    } catch {
      try {
        if (chrome.scripting) {
          await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ["content-scripts/content.js"],
          });
          const { promise: delayPromise, resolve: delayResolve } = Promise.withResolvers<void>();
          setTimeout(delayResolve, 50);
          await delayPromise;
          await chrome.tabs.sendMessage(activeTab.id, {
            type: "TOGGLE_ALTERNATAB_OVERLAY",
          });
          return;
        }
      } catch {
        // Dynamic injection failed
      }
    }
  }

  if (isRestricted) {
    try {
      if (typeof chrome.action?.openPopup === "function") {
        await chrome.action.openPopup();
        return;
      }
    } catch {
      // openPopup not supported or unavailable
    }

    try {
      const hudUrl = chrome.runtime.getURL("options.html?mode=hud");
      const existing = await chrome.tabs.query({ url: `${hudUrl}*` });
      const first = existing[0];
      if (first?.id) {
        await chrome.tabs.update(first.id, { active: true });
        if (first.windowId) {
          await chrome.windows.update(first.windowId, { focused: true });
        }
        return;
      }

      await chrome.tabs.create({
        url: hudUrl,
      });
    } catch {
      // Standalone HUD creation error handled
    }
  }
}
