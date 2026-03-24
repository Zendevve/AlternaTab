import { LauncherTab } from '../shared/types';
import { ExtensionMessage, MESSAGE_TYPES } from '../shared/messages';
import { mruTracker } from './mru';

export function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === MESSAGE_TYPES.GET_TABS) {
      handleGetTabs().then(sendResponse);
      return true; // Indicate async response
    }

    if (message.type === MESSAGE_TYPES.SWITCH_TAB) {
      handleSwitchTab(message.tabId, message.windowId).then(sendResponse);
      return true;
    }

    if (message.type === MESSAGE_TYPES.CLOSE_TAB) {
      handleCloseTab(message.tabId).then(sendResponse);
      return true;
    }

    return false;
  });
}

async function handleGetTabs() {
  const rawTabs = await chrome.tabs.query({});
  const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentTabId = activeTabs.length > 0 ? activeTabs[0].id : undefined;

  const tabs: LauncherTab[] = rawTabs
    .filter((tab) => tab.id !== undefined && tab.windowId !== undefined)
    .map((tab) => {
      let host = '';
      let path = '';
      try {
        if (tab.url) {
          const urlObj = new URL(tab.url);
          host = urlObj.hostname;
          path = urlObj.pathname + urlObj.search;
        }
      } catch (e) {
        // Handle invalid URLs like chrome://
        host = tab.url || '';
      }

      return {
        id: tab.id!,
        windowId: tab.windowId!,
        title: tab.title || 'Untitled Tab',
        url: tab.url || '',
        host,
        path,
        favIconUrl: tab.favIconUrl,
        active: tab.active,
        pinned: tab.pinned,
        isCurrentTab: tab.id === currentTabId,
        mruRank: mruTracker.getRank(tab.id!)
      };
    });

  return { tabs };
}

async function handleSwitchTab(tabId: number, windowId: number) {
  try {
    await chrome.tabs.update(tabId, { active: true });
    await chrome.windows.update(windowId, { focused: true });

    // Auto-close launcher if we switched successfully and launcher is in a popup
    const currentWindow = await chrome.windows.getCurrent();
    if (currentWindow.type === 'popup') {
      await chrome.windows.remove(currentWindow.id!);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to switch tab', error);
    return { success: false, error: String(error) };
  }
}

async function handleCloseTab(tabId: number) {
  try {
    await chrome.tabs.remove(tabId);
    return { success: true };
  } catch (error) {
    console.error('Failed to close tab', error);
    return { success: false, error: String(error) };
  }
}
