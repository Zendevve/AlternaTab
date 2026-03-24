/**
 * Tab management and message handling
 * Uses typed message router with structured error responses
 */

import {
  success,
  failure,
  SwitchTabResponse,
  CloseTabResponse,
  CopyUrlResponse,
  TogglePinTabResponse,
  DuplicateTabResponse,
  ToggleMuteTabResponse,
  MoveToNewWindowResponse
} from '../shared/messages';
import { logger } from '../shared/logger';

// ============================================
// Handlers
// ============================================

// ============================================

export async function handleSwitchTab(
  tabId: number,
  windowId: number,
  url?: string,
  itemType?: string,
  sessionId?: string
): Promise<SwitchTabResponse> {
  try {
    if (itemType === 'closed_tab' && sessionId) {
      await chrome.sessions.restore(sessionId);
      return success({ success: true });
    }

    if ((itemType === 'bookmark' || itemType === 'history') && url) {
      await chrome.tabs.create({ url, active: true });
      return success({ success: true });
    }

    // Validate tab exists
    const tab = await chrome.tabs.get(tabId);
    if (!tab.id) {
      return failure('Tab no longer exists', 'TAB_NOT_FOUND');
    }

    await chrome.tabs.update(tabId, { active: true });
    await chrome.windows.update(windowId, { focused: true });

    // Auto-close launcher if we switched successfully and launcher is in a popup
    const currentWindow = await chrome.windows.getCurrent();
    if (currentWindow.type === 'popup') {
      await chrome.windows.remove(currentWindow.id!);
    }

    return success({ success: true });
  } catch (error) {
    logger.error('Failed to switch tab:', error);
    return failure(`Failed to switch tab: ${String(error)}`, 'SWITCH_TAB_FAILED');
  }
}

export async function handleCloseTab(tabId: number): Promise<CloseTabResponse> {
  try {
    await chrome.tabs.remove(tabId);
    return success({ success: true });
  } catch (error) {
    logger.error('Failed to close tab:', error);
    return failure(`Failed to close tab: ${String(error)}`, 'CLOSE_TAB_FAILED');
  }
}

export async function handleCopyUrl(url: string): Promise<CopyUrlResponse> {
  try {
    if (!url) {
      return failure('No URL provided', 'NO_URL_PROVIDED');
    }

    await navigator.clipboard.writeText(url);
    return success({ success: true });
  } catch (error) {
    logger.error('Failed to copy URL:', error);
    return failure(`Failed to copy URL: ${String(error)}`, 'COPY_URL_FAILED');
  }
}

export async function handleTogglePin(tabId: number): Promise<TogglePinTabResponse> {
  try {
    const tab = await chrome.tabs.get(tabId);
    const pinState = !tab.pinned;
    await chrome.tabs.update(tabId, { pinned: pinState });
    return success({ success: true, pinned: pinState });
  } catch (error) {
    logger.error('Failed to toggle pin:', error);
    return failure(`Failed to toggle pin: ${String(error)}`, 'TOGGLE_PIN_FAILED');
  }
}

export async function handleDuplicate(tabId: number): Promise<DuplicateTabResponse> {
  try {
    await chrome.tabs.duplicate(tabId);
    return success({ success: true });
  } catch (error) {
    logger.error('Failed to duplicate tab:', error);
    return failure(`Failed to duplicate tab: ${String(error)}`, 'DUPLICATE_TAB_FAILED');
  }
}

export async function handleToggleMute(tabId: number): Promise<ToggleMuteTabResponse> {
  try {
    const tab = await chrome.tabs.get(tabId);
    const muteState = !tab.mutedInfo?.muted;
    await chrome.tabs.update(tabId, { muted: muteState });
    return success({ success: true, muted: muteState });
  } catch (error) {
    logger.error('Failed to toggle mute:', error);
    return failure(`Failed to toggle mute: ${String(error)}`, 'TOGGLE_MUTE_FAILED');
  }
}

export async function handleMoveToNewWindow(tabId: number): Promise<MoveToNewWindowResponse> {
  try {
    await chrome.windows.create({ tabId });
    return success({ success: true });
  } catch (error) {
    logger.error('Failed to move tab to new window:', error);
    return failure(`Failed to move tab: ${String(error)}`, 'MOVE_TAB_FAILED');
  }
}
