/**
 * Message passing between launcher/background.
 * Uses discriminated unions for type-safe runtime communication.
 */

import { RankedItemResult, LauncherItemType } from './types';

// ============================================
// Message Types (Discriminated Union)
// ============================================

export const MESSAGE_TYPES = {
  SEARCH_ASSETS: 'SEARCH_ASSETS',
  SWITCH_TAB: 'SWITCH_TAB',
  CLOSE_TAB: 'CLOSE_TAB',
  COPY_URL: 'COPY_URL',
  PIN_TAB: 'PIN_TAB',
  UNPIN_TAB: 'UNPIN_TAB',
  DUPLICATE_TAB: 'DUPLICATE_TAB',
  MUTE_TAB: 'MUTE_TAB',
  UNMUTE_TAB: 'UNMUTE_TAB',
  MOVE_TO_NEW_WINDOW: 'MOVE_TO_NEW_WINDOW',
} as const;

// ============================================
// Response Types (Success/Failure pattern)
// ============================================

export type Success<T> = {
  ok: true;
  data: T;
};

export type Failure = {
  ok: false;
  error: string;
  code?: string;
};

export type Response<T> = Success<T> | Failure;

// Helper constructors
export const success = <T>(data: T): Success<T> => ({ ok: true, data });
export const failure = (error: string, code?: string): Failure => ({ ok: false, error, code });

// ============================================
// Request Types
// ============================================

export type SearchAssetsRequest = {
  type: typeof MESSAGE_TYPES.SEARCH_ASSETS;
  query: string;
};

type OpenTabSwitchRequest = {
  type: typeof MESSAGE_TYPES.SWITCH_TAB;
  itemType?: 'tab';
  tabId: number;
  windowId: number;
};

type ClosedTabSwitchRequest = {
  type: typeof MESSAGE_TYPES.SWITCH_TAB;
  itemType: 'closed_tab';
  sessionId: string;
};

type AssetSwitchRequest = {
  type: typeof MESSAGE_TYPES.SWITCH_TAB;
  itemType: Extract<LauncherItemType, 'bookmark' | 'history'>;
  url: string;
};

export type SwitchTabRequest = OpenTabSwitchRequest | ClosedTabSwitchRequest | AssetSwitchRequest;

export type CloseTabRequest = {
  type: typeof MESSAGE_TYPES.CLOSE_TAB;
  tabId: number;
};

export type CopyUrlRequest = {
  type: typeof MESSAGE_TYPES.COPY_URL;
  url: string;
};

export type PinTabRequest = {
  type: typeof MESSAGE_TYPES.PIN_TAB;
  tabId: number;
};

export type UnpinTabRequest = {
  type: typeof MESSAGE_TYPES.UNPIN_TAB;
  tabId: number;
};

export type DuplicateTabRequest = {
  type: typeof MESSAGE_TYPES.DUPLICATE_TAB;
  tabId: number;
};

export type MuteTabRequest = {
  type: typeof MESSAGE_TYPES.MUTE_TAB;
  tabId: number;
};

export type UnmuteTabRequest = {
  type: typeof MESSAGE_TYPES.UNMUTE_TAB;
  tabId: number;
};

export type MoveToNewWindowRequest = {
  type: typeof MESSAGE_TYPES.MOVE_TO_NEW_WINDOW;
  tabId: number;
};

export type ExtensionMessage =
  | SearchAssetsRequest
  | SwitchTabRequest
  | CloseTabRequest
  | CopyUrlRequest
  | PinTabRequest
  | UnpinTabRequest
  | DuplicateTabRequest
  | MuteTabRequest
  | UnmuteTabRequest
  | MoveToNewWindowRequest;

// ============================================
// Response Types
// ============================================

export type SearchAssetsPayload = {
  query: string;
  results: RankedItemResult[];
};

export type SearchAssetsResponse = Response<SearchAssetsPayload>;
export type SwitchTabResponse = Response<{ success: boolean }>;
export type CloseTabResponse = Response<{ success: boolean }>;
export type CopyUrlResponse = Response<{ success: boolean }>;
export type PinTabResponse = Response<{ success: boolean; pinned: true }>;
export type UnpinTabResponse = Response<{ success: boolean; pinned: false }>;
export type DuplicateTabResponse = Response<{ success: boolean }>;
export type MuteTabResponse = Response<{ success: boolean; muted: true }>;
export type UnmuteTabResponse = Response<{ success: boolean; muted: false }>;
export type MoveToNewWindowResponse = Response<{ success: boolean }>;

export type ExtensionResponse =
  | SearchAssetsResponse
  | SwitchTabResponse
  | CloseTabResponse
  | CopyUrlResponse
  | PinTabResponse
  | UnpinTabResponse
  | DuplicateTabResponse
  | MuteTabResponse
  | UnmuteTabResponse
  | MoveToNewWindowResponse;

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
    case MESSAGE_TYPES.SEARCH_ASSETS:
      return typeof msg.query === 'string';
    case MESSAGE_TYPES.SWITCH_TAB:
      if (msg.itemType === 'closed_tab') {
        return typeof msg.sessionId === 'string';
      }
      if (msg.itemType === 'bookmark' || msg.itemType === 'history') {
        return typeof msg.url === 'string';
      }
      return typeof msg.tabId === 'number' && typeof msg.windowId === 'number';
    case MESSAGE_TYPES.CLOSE_TAB:
    case MESSAGE_TYPES.PIN_TAB:
    case MESSAGE_TYPES.UNPIN_TAB:
    case MESSAGE_TYPES.DUPLICATE_TAB:
    case MESSAGE_TYPES.MUTE_TAB:
    case MESSAGE_TYPES.UNMUTE_TAB:
    case MESSAGE_TYPES.MOVE_TO_NEW_WINDOW:
      return typeof msg.tabId === 'number';
    case MESSAGE_TYPES.COPY_URL:
      return typeof msg.url === 'string';
    default:
      return false;
  }
}
