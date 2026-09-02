import { defineExtensionMessaging } from "@webext-core/messaging";
import type {
  BookmarkItem,
  CommandItem,
  DownloadItem,
  ExtensionConfig,
  HistoryItem,
  RecentlyClosedItem,
  TabFilter,
  TabGroupItem,
  TabItem,
  WindowItem,
} from "./models";
import type { Result } from "./result";

export interface ProtocolMap {
  getTabs(filter?: TabFilter): {
    tabs: TabItem[];
    groups: TabGroupItem[];
    activeTabId: number;
    focusedWindowId: number;
  };
  getConfig(): ExtensionConfig;
  getCommands(): CommandItem[];
  activateTab(data: { tabId: number; windowId: number }): Result<void>;
  closeTabs(data: { tabIds: number[] }): Result<void>;
  discardTabs(data: { tabIds: number[] }): Result<{ discardedCount: number }>;
  duplicateTab(data: { tabId: number }): Result<{ newTabId: number }>;
  toggleMuteTab(data: { tabId: number }): Result<{ muted: boolean }>;
  togglePinTab(data: { tabId: number }): Result<{ pinned: boolean }>;
  moveTabToNewWindow(data: { tabId: number }): Result<{ windowId: number; tabId: number }>;
  groupTabsByDomain(data: { windowId?: number }): Result<{ groupedCount: number }>;
  deduplicateTabs(data: { windowId?: number }): Result<{ closedCount: number }>;
  closeInactiveTabs(data: { maxAgeMinutes: number }): Result<{ closedCount: number }>;
  updateConfig(data: Partial<ExtensionConfig>): Result<ExtensionConfig>;
  resetConfig(): Result<ExtensionConfig>;
  restoreClosedTab(): Result<{ restored: boolean }>;
  exportSession(): Result<{ json: string }>;
  reloadAllTabs(data?: { windowId?: number }): Result<{ reloadedCount: number }>;
  getBookmarks(): BookmarkItem[];
  fetchFavicon(data: { url: string }): { dataUrl: string | null };
  getHistory(data?: { query?: string; maxResults?: number }): HistoryItem[];
  getDownloads(data?: { query?: string; maxResults?: number }): DownloadItem[];
  getRecentlyClosed(data?: { maxResults?: number }): RecentlyClosedItem[];
  getWindows(): WindowItem[];
  deleteHistoryEntry(data: { url: string }): Result<void>;
  openDownload(data: { downloadId: number }): Result<void>;
  showDownloadInFolder(data: { downloadId: number }): Result<void>;
  openUrl(data: { url: string }): Result<void>;
  focusWindow(data: { windowId: number }): Result<void>;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
