export type RawBrowserTab = chrome.tabs.Tab;

export type LauncherTab = {
  id: number;
  windowId: number;
  title: string;
  url: string;
  host: string;
  path: string;
  favIconUrl?: string;
  active: boolean;
  pinned: boolean;
  isCurrentTab: boolean;
  mruRank: number;
};

export type RankedTabResult = LauncherTab & {
  score: number;
  titleMatchIndices: number[];
  hostMatchIndices: number[];
  urlMatchIndices: number[];
  reasons?: string[];
};
