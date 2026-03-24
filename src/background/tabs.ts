/**
 * Tab management and message handling
 * Uses typed message router with structured error responses
 */

import { LauncherTab } from '../shared/types';
import {
  MESSAGE_TYPES,
  validateMessage,
  ok,
  err,
  GetTabsResponse,
  SwitchTabResponse,
  CloseTabResponse,
  CopyUrlResponse
} from '../shared/messages';
import { mruTracker } from './mru';

// ============================================
// Typed Message Router
// ============================================

export function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: GetTabsResponse | SwitchTabResponse | CloseTabResponse | CopyUrlResponse) => void
  ) => {
    // Validate incoming message
    if (!validateMessage(message)) {
      console.warn('[Background] Invalid message received:', message);
      sendResponse(err('Invalid message format'));
      return false;
    }

    // Route to handler
    switch (message.type) {
      case MESSAGE_TYPES.GET_TABS:
        handleGetTabs()
          .then(response => sendResponse(response))
          .catch(e => sendResponse(err(String(e))));
        return true;

      case MESSAGE_TYPES.SWITCH_TAB:
        handleSwitchTab(message.tabId, message.windowId)
          .then(response => sendResponse(response))
          .catch(e => sendResponse(err(String(e))));
        return true;

      case MESSAGE_TYPES.CLOSE_TAB:
        handleCloseTab(message.tabId)
          .then(response => sendResponse(response))
          .catch(e => sendResponse(err(String(e))));
        return true;

      case MESSAGE_TYPES.COPY_URL:
        handleCopyUrl(message.url)
          .then(response => sendResponse(response))
          .catch(e => sendResponse(err(String(e))));
        return true;

      default:
        // Should never reach here due to validateMessage
        sendResponse(err('Unknown message type'));
        return false;
    }
  });
}

// ============================================
// Handlers
// ============================================

async function handleGetTabs(): Promise<GetTabsResponse> {
  try {
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

    return ok({ tabs });
  } catch (error) {
    console.error('[Background] Failed to get tabs:', error);
    return err(`Failed to get tabs: ${String(error)}`);
  }
}

async function handleSwitchTab(tabId: number, windowId: number): Promise<SwitchTabResponse> {
  try {
    // Validate tab exists
    const tab = await chrome.tabs.get(tabId);
    if (!tab.id) {
      return err('Tab no longer exists');
    }

    await chrome.tabs.update(tabId, { active: true });
    await chrome.windows.update(windowId, { focused: true });

    // Auto-close launcher if we switched successfully and launcher is in a popup
    const currentWindow = await chrome.windows.getCurrent();
    if (currentWindow.type === 'popup') {
      await chrome.windows.remove(currentWindow.id!);
    }

    return ok({ success: true });
  } catch (error) {
    console.error('[Background] Failed to switch tab:', error);
    return err(`Failed to switch tab: ${String(error)}`);
  }
}

async function handleCloseTab(tabId: number): Promise<CloseTabResponse> {
  try {
    await chrome.tabs.remove(tabId);
    return ok({ success: true });
  } catch (error) {
    console.error('[Background] Failed to close tab:', error);
    return err(`Failed to close tab: ${String(error)}`);
  }
}

async function handleCopyUrl(url: string): Promise<CopyUrlResponse> {
  try {
    if (!url) {
      return err('No URL provided');
    }

    await navigator.clipboard.writeText(url);
    return ok({ success: true });
  } catch (error) {
    console.error('[Background] Failed to copy URL:', error);
    return err(`Failed to copy URL: ${String(error)}`);
  }
}
