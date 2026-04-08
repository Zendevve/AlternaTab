export type RawBrowserTab = chrome.tabs.Tab;

export type LauncherItemType = 'tab' | 'bookmark' | 'history' | 'closed_tab';

export type LauncherItem = {
  // Base properties
  id: string | number;
  type: LauncherItemType;
  title: string;
  url: string;
  host: string;
  path: string;
  favIconUrl?: string;

  // Scoring
  mruRank?: number; // Only for open tabs

  // Specific properties
  tabId?: number;
  windowId?: number;
  sessionId?: string;
  bookmarkId?: string;

  // Tab-specific visual state
  active?: boolean;
  pinned?: boolean;
  muted?: boolean;
  isCurrentTab?: boolean;
};

export type RankedItemResult = LauncherItem & {
  score: number;
  titleMatchIndices: number[];
  hostMatchIndices: number[];
  urlMatchIndices: number[];
  reasons?: string[];
};
