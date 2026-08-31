import { createMemo, createSignal } from "solid-js";
import type {
  BookmarkItem,
  CommandItem,
  SearchScope,
  TabGroupItem,
  TabItem,
} from "../types/models";
import {
  parseQuery,
  searchBookmarks,
  searchCommands,
  searchGroups,
  searchTabs,
} from "../utils/search";

export function createSearchStore() {
  const [query, setQuery] = createSignal("");
  const [scope, setScope] = createSignal<SearchScope>("all");
  const [tabs, setTabs] = createSignal<TabItem[]>([]);
  const [groups, setGroups] = createSignal<TabGroupItem[]>([]);
  const [bookmarks, setBookmarks] = createSignal<BookmarkItem[]>([]);
  const [commands, setCommands] = createSignal<CommandItem[]>([]);
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
    return scope();
  });

  const filteredTabs = createMemo(() => {
    const p = parsed();
    const currentScope = effectiveScope();
    let source = tabs();

    if (currentScope === "window" && focusedWindowId() > 0) {
      source = source.filter((t) => t.windowId === focusedWindowId());
    }

    if (currentScope === "groups" || currentScope === "bookmarks" || currentScope === "commands") {
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

  const totalItemCount = createMemo(() => {
    const c = effectiveScope();
    if (c === "commands") return filteredCommands().length;
    if (c === "groups") return filteredGroups().length;
    if (c === "bookmarks") return filteredBookmarks().length;
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
    totalItemCount,
  };
}
