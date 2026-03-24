import { LauncherTab } from './types';

export const MESSAGE_TYPES = {
  GET_TABS: 'GET_TABS',
  SWITCH_TAB: 'SWITCH_TAB',
  CLOSE_TAB: 'CLOSE_TAB',
  COPY_URL: 'COPY_URL',
} as const;

export type GetTabsRequest = {
  type: typeof MESSAGE_TYPES.GET_TABS;
};

export type GetTabsResponse = {
  tabs: LauncherTab[];
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

export type ExtensionMessage = GetTabsRequest | SwitchTabRequest | CloseTabRequest;
