/**
 * Message passing between popup/background
 * Uses discriminated unions for type-safe runtime communication
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
  TOGGLE_PIN_TAB: 'TOGGLE_PIN_TAB',
  DUPLICATE_TAB: 'DUPLICATE_TAB',
  TOGGLE_MUTE_TAB: 'TOGGLE_MUTE_TAB',
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

export type SwitchTabRequest = {
  type: typeof MESSAGE_TYPES.SWITCH_TAB;
  tabId: number;
  windowId: number;
  url?: string;
  itemType?: LauncherItemType;
  sessionId?: string;
};

export type CloseTabRequest = {
  type: typeof MESSAGE_TYPES.CLOSE_TAB;
  tabId: number;
};

export type CopyUrlRequest = {
  type: typeof MESSAGE_TYPES.COPY_URL;
  url: string;
};

export type TogglePinTabRequest = {
  type: typeof MESSAGE_TYPES.TOGGLE_PIN_TAB;
  tabId: number;
};

export type DuplicateTabRequest = {
  type: typeof MESSAGE_TYPES.DUPLICATE_TAB;
  tabId: number;
};

export type ToggleMuteTabRequest = {
  type: typeof MESSAGE_TYPES.TOGGLE_MUTE_TAB;
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
  | TogglePinTabRequest
  | DuplicateTabRequest
  | ToggleMuteTabRequest
  | MoveToNewWindowRequest;

// ============================================
// Response Types
// ============================================

export type SearchAssetsResponse = Response<{ results: RankedItemResult[] }>;
export type SwitchTabResponse = Response<{ success: boolean }>;
export type CloseTabResponse = Response<{ success: boolean }>;
export type CopyUrlResponse = Response<{ success: boolean }>;
export type TogglePinTabResponse = Response<{ success: boolean, pinned: boolean }>;
export type DuplicateTabResponse = Response<{ success: boolean }>;
export type ToggleMuteTabResponse = Response<{ success: boolean, muted: boolean }>;
export type MoveToNewWindowResponse = Response<{ success: boolean }>;

export type ExtensionResponse =
  | SearchAssetsResponse
  | SwitchTabResponse
  | CloseTabResponse
  | CopyUrlResponse
  | TogglePinTabResponse
  | DuplicateTabResponse
  | ToggleMuteTabResponse
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
      return typeof msg.tabId === 'number' && typeof msg.windowId === 'number';
    case MESSAGE_TYPES.CLOSE_TAB:
      return typeof msg.tabId === 'number';
    case MESSAGE_TYPES.TOGGLE_PIN_TAB:
    case MESSAGE_TYPES.DUPLICATE_TAB:
    case MESSAGE_TYPES.TOGGLE_MUTE_TAB:
    case MESSAGE_TYPES.MOVE_TO_NEW_WINDOW:
      return typeof msg.tabId === 'number';
    case MESSAGE_TYPES.COPY_URL:
      return typeof msg.url === 'string';
    default:
      return false;
  }
}
