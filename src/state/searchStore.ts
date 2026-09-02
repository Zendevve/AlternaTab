import { createMemo, createSignal } from "solid-js";
import type {
  BookmarkItem,
  CommandItem,
  DownloadItem,
  HistoryItem,
  RecentlyClosedItem,
  SearchScope,
  TabGroupItem,
  TabItem,
  WindowItem,
} from "../types/models";
import {
  dedupHistoryWithTabs,
  parseQuery,
  searchBookmarks,
  searchCommands,
  searchDownloads,
  searchGroups,
  searchHistory,
  searchRecentlyClosed,
  searchTabs,
  searchWindows,
} from "../utils/search";

export function createSearchStore() {
  const [query, setQuery] = createSignal("");
  const [scope, setScope] = createSignal<SearchScope>("all");
  const [tabs, setTabs] = createSignal<TabItem[]>([]);
  const [groups, setGroups] = createSignal<TabGroupItem[]>([]);
  const [bookmarks, setBookmarks] = createSignal<BookmarkItem[]>([]);
  const [commands, setCommands] = createSignal<CommandItem[]>([]);
  const [history, setHistory] = createSignal<HistoryItem[]>([]);
  const [downloads, setDownloads] = createSignal<DownloadItem[]>([]);
  const [recentlyClosed, setRecentlyClosed] = createSignal<RecentlyClosedItem[]>([]);
  const [windows, setWindows] = createSignal<WindowItem[]>([]);
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [activeTabId, setActiveTabId] = createSignal<number>(-1);
  const [focusedWindowId, setFocusedWindowId] = createSignal<number>(-1);

  const parsed = createMemo(() => parseQuery(query()));

  const effectiveScope = createMemo<SearchScope>(() => {
    const p = parsed();
    if (p.scope === "tabs") return "tabs-only";
    if (p.scope === "groups") return "groups";
    if (p.scope === "bookmarks") return "bookmarks";
    if (p.scope === "commands") return "commands";
    if (p.scope === "history") return "history";
    if (p.scope === "downloads") return "downloads";
    if (p.scope === "closed") return "closed";
    if (p.scope === "windows") return "windows";
    return scope();
  });

  const filteredTabs = createMemo(() => {
    const p = parsed();
    const currentScope = effectiveScope();
    let source = tabs();

    if (currentScope === "window" && focusedWindowId() > 0) {
      source = source.filter((t) => t.windowId === focusedWindowId());
    }

    if (
      currentScope === "groups" ||
      currentScope === "bookmarks" ||
      currentScope === "commands" ||
      currentScope === "history" ||
      currentScope === "downloads" ||
      currentScope === "closed" ||
      currentScope === "windows"
    ) {
      return [];
    }

    return searchTabs(source, p.query);
  });

  const filteredCommands = createMemo(() => {
    const p = parsed();
    const currentScope = effectiveScope();
    if (currentScope !== "commands" && p.scope !== "commands") {
      return [];
    }
    return searchCommands(commands(), p.query);
  });

  const filteredGroups = createMemo(() => {
    const p = parsed();
    const currentScope = effectiveScope();
    if (currentScope !== "groups" && p.scope !== "groups") {
      return [];
    }
    return searchGroups(groups(), p.query);
  });

  const filteredBookmarks = createMemo(() => {
    const p = parsed();
    const currentScope = effectiveScope();
    if (currentScope !== "bookmarks" && p.scope !== "bookmarks") {
      return [];
    }
    return searchBookmarks(bookmarks(), p.query);
  });

  const filteredHistory = createMemo(() => {
    const p = parsed();
    const currentScope = effectiveScope();
    if (currentScope !== "history" && p.scope !== "history" && currentScope !== "all") {
      return [];
    }
    const deduped = dedupHistoryWithTabs(history(), tabs());
    return searchHistory(deduped, p.query);
  });

  const filteredDownloads = createMemo(() => {
    const p = parsed();
    const currentScope = effectiveScope();
    if (currentScope !== "downloads" && p.scope !== "downloads" && currentScope !== "all") {
      return [];
    }
    return searchDownloads(downloads(), p.query);
  });

  const filteredRecentlyClosed = createMemo(() => {
    const p = parsed();
    const currentScope = effectiveScope();
    if (currentScope !== "closed" && p.scope !== "closed") {
      return [];
    }
    return searchRecentlyClosed(recentlyClosed(), p.query);
  });

  const filteredWindows = createMemo(() => {
    const p = parsed();
    const currentScope = effectiveScope();
    if (currentScope !== "windows" && p.scope !== "windows") {
      return [];
    }
    return searchWindows(windows(), p.query);
  });

  const totalItemCount = createMemo(() => {
    const c = effectiveScope();
    if (c === "commands") return filteredCommands().length;
    if (c === "groups") return filteredGroups().length;
    if (c === "bookmarks") return filteredBookmarks().length;
    if (c === "history") return filteredHistory().length;
    if (c === "downloads") return filteredDownloads().length;
    if (c === "closed") return filteredRecentlyClosed().length;
    if (c === "windows") return filteredWindows().length;
    return filteredTabs().length;
  });

  return {
    query,
    setQuery,
    scope,
    setScope,
    tabs,
    setTabs,
    groups,
    setGroups,
    bookmarks,
    setBookmarks,
    commands,
    setCommands,
    history,
    setHistory,
    downloads,
    setDownloads,
    recentlyClosed,
    setRecentlyClosed,
    windows,
    setWindows,
    selectedIndex,
    setSelectedIndex,
    activeTabId,
    setActiveTabId,
    focusedWindowId,
    setFocusedWindowId,
    parsed,
    effectiveScope,
    filteredTabs,
    filteredCommands,
    filteredGroups,
    filteredBookmarks,
    filteredHistory,
    filteredDownloads,
    filteredRecentlyClosed,
    filteredWindows,
    totalItemCount,
  };
}
