/**
 * Message passing between popup/background
 * Uses discriminated unions for type-safe runtime communication
 */

import { LauncherTab } from './types';

// ============================================
// Message Types (Discriminated Union)
// ============================================

export const MESSAGE_TYPES = {
  GET_TABS: 'GET_TABS',
  SWITCH_TAB: 'SWITCH_TAB',
  CLOSE_TAB: 'CLOSE_TAB',
  COPY_URL: 'COPY_URL',
} as const;

// ============================================
// Response Types (Ok/Err pattern)
// ============================================

export type Ok<T> = {
  ok: true;
  data: T;
};

export type Err = {
  ok: false;
  error: string;
};

export type Response<T> = Ok<T> | Err;

// Helper constructors
export const ok = <T>(data: T): Ok<T> => ({ ok: true, data });
export const err = (error: string): Err => ({ ok: false, error });

// ============================================
// Request Types
// ============================================

export type GetTabsRequest = {
  type: typeof MESSAGE_TYPES.GET_TABS;
};

export type SwitchTabRequest = {
  type: typeof MESSAGE_TYPES.SWITCH_TAB;
  tabId: number;
  windowId: number;
};

export type CloseTabRequest = {
  type: typeof MESSAGE_TYPES.CLOSE_TAB;
  tabId: number;
};

export type CopyUrlRequest = {
  type: typeof MESSAGE_TYPES.COPY_URL;
  url: string;
};

export type ExtensionMessage =
  | GetTabsRequest
  | SwitchTabRequest
  | CloseTabRequest
  | CopyUrlRequest;

// ============================================
// Response Types
// ============================================

export type GetTabsResponse = Response<{ tabs: LauncherTab[] }>;
export type SwitchTabResponse = Response<{ success: boolean }>;
export type CloseTabResponse = Response<{ success: boolean }>;
export type CopyUrlResponse = Response<{ success: boolean }>;

export type ExtensionResponse =
  | GetTabsResponse
  | SwitchTabResponse
  | CloseTabResponse
  | CopyUrlResponse;

// ============================================
// Runtime Validation
// ============================================

/**
 * Validates incoming message has required fields for each type
 */
export function validateMessage(message: unknown): message is ExtensionMessage {
  if (!message || typeof message !== 'object') return false;

  const msg = message as Record<string, unknown>;

  if (!msg.type || typeof msg.type !== 'string') return false;

  switch (msg.type) {
    case MESSAGE_TYPES.GET_TABS:
      return true;
    case MESSAGE_TYPES.SWITCH_TAB:
      return typeof msg.tabId === 'number' && typeof msg.windowId === 'number';
    case MESSAGE_TYPES.CLOSE_TAB:
      return typeof msg.tabId === 'number';
    case MESSAGE_TYPES.COPY_URL:
      return typeof msg.url === 'string';
    default:
      return false;
  }
}
