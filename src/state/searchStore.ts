import { createMemo, createSignal } from "solid-js";
import { configStore } from "./configStore";
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
import { parseQuickAction } from "../utils/search/parseActions";
import { parsePluginQuery } from "../utils/search/plugins";
import { getTemplate, getTemplateResult, parseBangQuery } from "../utils/search/templates";
import { getCalcItem, getFallbackItems, getNavigateItem, getSearchFallbackItem } from "../utils/search/fallback";
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
  const [pluginResults, setPluginResults] = createSignal<import("../types/models").PluginResultItem[]>([]);
  const [pluginPrefix, setPluginPrefix] = createSignal<string | null>(null);
  const [customTemplates, setCustomTemplates] = createSignal<import("../types/models").SearchTemplateItem[]>([]);
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [activeTabId, setActiveTabId] = createSignal<number>(-1);
  const [focusedWindowId, setFocusedWindowId] = createSignal<number>(-1);

  const parsed = createMemo(() => parseQuery(query()));

  const parsedAction = createMemo(() => parseQuickAction(query()));

  const effectiveQuery = createMemo(() => {
    const pa = parsedAction();
    if (pa.action) return pa.baseQuery;
    return parsed().query;
  });

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
    // Bang template overrides scope (second priority after plugins)
    const bq = parseBangQuery(query());
    if (bq) return "templates" as SearchScope;
    // Plugin prefix overrides scope
    const pq = parsePluginQuery(query());
    if (pq) return "plugins" as SearchScope;
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

    return searchTabs(source, effectiveQuery());
  });

  const filteredCommands = createMemo(() => {
    const p = parsed();
    const currentScope = effectiveScope();
    if (currentScope !== "commands" && p.scope !== "commands") {
      return [];
    }
    return searchCommands(commands(), effectiveQuery());
  });

  const filteredGroups = createMemo(() => {
    const p = parsed();
    const currentScope = effectiveScope();
    if (currentScope !== "groups" && p.scope !== "groups") {
      return [];
    }
    return searchGroups(groups(), effectiveQuery());
  });

  const filteredBookmarks = createMemo(() => {
    const p = parsed();
    const currentScope = effectiveScope();
    if (currentScope !== "bookmarks" && p.scope !== "bookmarks") {
      return [];
    }
    return searchBookmarks(bookmarks(), effectiveQuery());
  });

  const filteredHistory = createMemo(() => {
    const p = parsed();
    const currentScope = effectiveScope();
    if (currentScope !== "history" && p.scope !== "history" && currentScope !== "all") {
      return [];
    }
    const deduped = dedupHistoryWithTabs(history(), tabs());
    return searchHistory(deduped, effectiveQuery());
  });

  const filteredDownloads = createMemo(() => {
    const p = parsed();
    const currentScope = effectiveScope();
    if (currentScope !== "downloads" && p.scope !== "downloads" && currentScope !== "all") {
      return [];
    }
    return searchDownloads(downloads(), effectiveQuery());
  });

  const filteredRecentlyClosed = createMemo(() => {
    const p = parsed();
    const currentScope = effectiveScope();
    if (currentScope !== "closed" && p.scope !== "closed") {
      return [];
    }
    return searchRecentlyClosed(recentlyClosed(), effectiveQuery());
  });

  const filteredWindows = createMemo(() => {
    const p = parsed();
    const currentScope = effectiveScope();
    if (currentScope !== "windows" && p.scope !== "windows") {
      return [];
    }
    return searchWindows(windows(), effectiveQuery());
  });

  const templateResult = createMemo(() => {
    const parsed = parseBangQuery(query());
    if (!parsed) return null;
    // For custom templates, check merged map: if customTemplates contains it, use it, else use bundled via getTemplate
    const custom = customTemplates().find((c) => c.id.toLowerCase() === parsed.templateId.toLowerCase());
    const template = custom ?? getTemplate(parsed.templateId);
    if (!template) return null;
    // Need to expand with actual query from parsed
    const url = template.urlTemplate.replace("{q}", encodeURIComponent(parsed.query));
    let domain: string;
    try { domain = new URL(url).hostname; } catch { domain = template.domain ?? "search"; }
    return {
      id: `template:${parsed.templateId}:${parsed.query}`,
      templateId: parsed.templateId,
      title: parsed.query ? `Search ${template.title}: ${parsed.query}` : `Search ${template.title}`,
      url,
      domain,
      query: parsed.query,
    } as import("../types/models").SearchTemplateResultItem;
  });

  const calcItem = createMemo(() => getCalcItem(query()));
  const navigateItem = createMemo(() => getNavigateItem(query()));
  const fallbackItem = createMemo(() => getSearchFallbackItem(query()));
  const fallbackItems = createMemo(() => {
    const cfg = configStore.get();
    return getFallbackItems(query(), cfg.defaultSearchEngine, cfg.customSearchTemplate);
  });

  const allHistoryPreview = createMemo(() => {
    if (effectiveScope() !== "all") return [];
    const q = parsed().query;
    if (q.length < 2) return [];
    if (filteredTabs().length >= 40) return [];
    return filteredHistory().slice(0, 3);
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
    if (c === "plugins") return pluginResults().length;
    if (c === "templates") return templateResult() ? 1 : 0;
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
    calcItem,
    navigateItem,
    fallbackItem,
    fallbackItems,
    allHistoryPreview,
    parsedAction,
    effectiveQuery,
    pluginResults,
    setPluginResults,
    pluginPrefix,
    setPluginPrefix,
    customTemplates,
    setCustomTemplates,
    templateResult,
    totalItemCount,
  };

}
