/**
 * Tab management and message handling
 * Uses typed message router with structured error responses
 */

import {
  success,
  failure,
  SwitchTabRequest,
  SwitchTabResponse,
  CloseTabResponse,
  CopyUrlResponse,
  PinTabResponse,
  UnpinTabResponse,
  DuplicateTabResponse,
  MuteTabResponse,
  UnmuteTabResponse,
  MoveToNewWindowResponse
} from '../shared/messages';
import { logger } from '../shared/logger';

export async function handleSwitchTab(request: SwitchTabRequest): Promise<SwitchTabResponse> {
  try {
    if (request.itemType === 'closed_tab') {
      await chrome.sessions.restore(request.sessionId);
      return success({ success: true });
    }

    if (request.itemType === 'bookmark' || request.itemType === 'history') {
      await chrome.tabs.create({ url: request.url, active: true });
      return success({ success: true });
    }

    if (!('tabId' in request) || !('windowId' in request)) {
      return failure('Invalid switch tab request', 'INVALID_SWITCH_PAYLOAD');
    }

    const tab = await chrome.tabs.get(request.tabId);
    if (!tab.id) {
      return failure('Tab no longer exists', 'TAB_NOT_FOUND');
    }

    await chrome.tabs.update(request.tabId, { active: true });
    await chrome.windows.update(request.windowId, { focused: true });

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
    const tab = await chrome.tabs.get(tabId);
    if (!tab.id) {
      return failure('Tab no longer exists', 'TAB_NOT_FOUND');
    }

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

export async function handlePinTab(tabId: number): Promise<PinTabResponse> {
  try {
    await chrome.tabs.update(tabId, { pinned: true });
    return success({ success: true, pinned: true });
  } catch (error) {
    logger.error('Failed to pin tab:', error);
    return failure(`Failed to pin tab: ${String(error)}`, 'PIN_TAB_FAILED');
  }
}

export async function handleUnpinTab(tabId: number): Promise<UnpinTabResponse> {
  try {
    await chrome.tabs.update(tabId, { pinned: false });
    return success({ success: true, pinned: false });
  } catch (error) {
    logger.error('Failed to unpin tab:', error);
    return failure(`Failed to unpin tab: ${String(error)}`, 'UNPIN_TAB_FAILED');
  }
}

export async function handleDuplicateTab(tabId: number): Promise<DuplicateTabResponse> {
  try {
    await chrome.tabs.duplicate(tabId);
    return success({ success: true });
  } catch (error) {
    logger.error('Failed to duplicate tab:', error);
    return failure(`Failed to duplicate tab: ${String(error)}`, 'DUPLICATE_TAB_FAILED');
  }
}

export async function handleMuteTab(tabId: number): Promise<MuteTabResponse> {
  try {
    await chrome.tabs.update(tabId, { muted: true });
    return success({ success: true, muted: true });
  } catch (error) {
    logger.error('Failed to mute tab:', error);
    return failure(`Failed to mute tab: ${String(error)}`, 'MUTE_TAB_FAILED');
  }
}

export async function handleUnmuteTab(tabId: number): Promise<UnmuteTabResponse> {
  try {
    await chrome.tabs.update(tabId, { muted: false });
    return success({ success: true, muted: false });
  } catch (error) {
    logger.error('Failed to unmute tab:', error);
    return failure(`Failed to unmute tab: ${String(error)}`, 'UNMUTE_TAB_FAILED');
  }
}

export async function handleMoveToNewWindow(tabId: number): Promise<MoveToNewWindowResponse> {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.id) {
      return failure('Tab no longer exists', 'TAB_NOT_FOUND');
    }

    await chrome.windows.create({ tabId });
    return success({ success: true });
  } catch (error) {
    logger.error('Failed to move tab to new window:', error);
    return failure(`Failed to move tab: ${String(error)}`, 'MOVE_TAB_FAILED');
  }
}
