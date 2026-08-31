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

export interface PersistedTabStats {
  identityKey: string;
  activationCount: number;
  lastActivatedAt: number;
}

export type KeyboardProfile = "standard" | "vim" | "emacs";

export type ThemeVariant = "light" | "dark" | "oled" | "system";

export type SearchScope = "all" | "window" | "tabs-only" | "groups" | "bookmarks" | "commands";

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
  | "open-settings";

export interface CommandItem {
  id: CommandId;
  title: string;
  category: "Tab" | "Window" | "Group" | "Session" | "Navigation" | "System" | "Preferences";
  shortcutHint?: string;
  keywords?: string[];
}

export interface TabFilter {
  windowId?: number;
  groupId?: number;
  scope?: SearchScope;
}
