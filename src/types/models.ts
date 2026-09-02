export interface TabItem {
  id: number;
  windowId: number;
  index: number;

  title: string;
  url: string;
  domain: string;

  favIconUrl?: string;

  pinned: boolean;
  audible: boolean;
  muted: boolean;
  discarded: boolean;

  groupId: number;

  lastAccessed: number;
  lastActivatedAt: number;
  activationCount: number;

  frecencyScore: number;
}

export type TabGroupColor =
  | "grey"
  | "blue"
  | "red"
  | "yellow"
  | "green"
  | "pink"
  | "purple"
  | "cyan"
  | "orange";

export interface TabGroupItem {
  id: number;
  windowId: number;
  title?: string;
  color: TabGroupColor;
  collapsed: boolean;
}

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  domain: string;
}
export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  domain: string;
  lastVisitTime?: number;
  visitCount?: number;
  typedCount?: number;
}

export interface DownloadItem {
  id: number;
  url: string;
  filename: string;
  domain: string;
  mime?: string;
  state?: string;
  fileSize?: number;
  startTime: string;
  endTime?: string;
}

export interface RecentlyClosedItem {
  sessionId: string;
  title: string;
  url: string;
  domain: string;
  favIconUrl?: string;
  lastModified?: number;
  tabId?: number;
  windowId?: number;
}

export interface PluginItem {
  id: string;
  prefix: string;
  title: string;
  description: string;
  enabled: boolean;
  code: string;
  sourceUrl?: string;
  createdAt: number;
}

export interface PluginResultItem {
  id: string;
  pluginId: string;
  title: string;
  subtitle?: string;
  url?: string;
  domain?: string;
}

export interface SearchTemplateItem {
  id: string;
  title: string;
  category: string;
  urlTemplate: string;
  keywords: string[];
  icon?: string;
  domain?: string;
}

export interface SearchTemplateResultItem {
  id: string;
  templateId: string;
  title: string;
  url: string;
  domain: string;
  query: string;
}

export interface WindowItem {
  id: number;
  focused: boolean;
  incognito: boolean;
  tabCount: number;
  title?: string;
}

export type LauncherKind = "tab" | "group" | "bookmark" | "history" | "closed" | "download" | "window" | "command";

export interface LauncherItem {
  kind: LauncherKind;
  id: string;
  title: string;
  url?: string;
  domain?: string;
}

export interface PersistedTabStats {
  identityKey: string;
  activationCount: number;
  lastActivatedAt: number;
}

export type KeyboardProfile = "standard" | "vim" | "emacs";

export type ThemeVariant = "light" | "dark" | "oled" | "system";

export type SearchScope = "all" | "window" | "tabs-only" | "groups" | "bookmarks" | "commands" | "history" | "downloads" | "closed" | "windows" | "plugins" | "templates";

export interface ExtensionConfig {
  version: string;
  hotkey: string;
  keyboardProfile: KeyboardProfile;
  theme: ThemeVariant;
  blurRadiusPx: number;
  showDomainAccents: boolean;
  domainColors: Record<string, string>;
  searchScopeDefault: "all" | "window" | "tabs-only";
  frecencyHalfLifeMinutes: number;
  maxRenderedItems: number;
  closeOnBlur: boolean;
  enableVimMode: boolean;
  defaultSearchEngine: "google" | "duckduckgo" | "bing" | "custom";
  customSearchTemplate: string;
  enableMruCycle: boolean;
}
export type CommandId =
  | "close-duplicates"
  | "group-domain"
  | "suspend-inactive"
  | "close-left"
  | "close-right"
  | "close-other"
  | "mute-all"
  | "pin-toggle"
  | "split-window"
  | "merge-windows"
  | "sort-title"
  | "sort-domain"
  | "sort-mru"
  | "restore-tab"
  | "export-session"
  | "copy-urls"
  | "reload-all"
  | "toggle-theme"
  | "toggle-vim"
  | "open-settings"
  | "new-tab"
  | "new-window"
  | "new-incognito-window"
  | "bookmark-this"
  | "copy-url"
  | "duplicate-tab"
  | "clear-browsing-data";

export interface CommandItem {
  id: CommandId;
  title: string;
  category: "Tab" | "Window" | "Group" | "Session" | "Navigation" | "System" | "Preferences";
  shortcutHint?: string;
  keywords?: string[];
}

export interface CommandPack {
  id: string;
  title: string;
  commands: Array<{ id: CommandId; title: string; alias: string; chain?: CommandId[] }>;
}


export interface TabFilter {
  windowId?: number;
  groupId?: number;
  scope?: SearchScope;
}
