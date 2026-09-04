import uFuzzy from "@leeoniya/ufuzzy";
import type { BookmarkItem, CommandItem, DownloadItem, HistoryItem, RecentlyClosedItem, TabGroupItem, TabItem, WindowItem, WorkspaceItem } from "../types/models";

export type ParsedQuery = {
  scope: "default" | "tabs" | "groups" | "bookmarks" | "commands" | "history" | "downloads" | "closed" | "windows" | "workspaces";
  query: string;
};

export interface HighlightPart {
  text: string;
  highlight: boolean;
}

const uf = new uFuzzy({
  intraMode: 1,
  intraIns: 1,
});

export function parseQuery(input: string): ParsedQuery {
  const trimmed = input.trimStart();
  if (trimmed.length === 0) {
    return { scope: "default", query: "" };
  }

  // Multi-char prefixes :h :d :c :w
  if (trimmed.startsWith(":h")) {
    return { scope: "history", query: trimmed.slice(2).trimStart() };
  }
  if (trimmed.startsWith(":d")) {
    return { scope: "downloads", query: trimmed.slice(2).trimStart() };
  }
  if (trimmed.startsWith(":c")) {
    return { scope: "closed", query: trimmed.slice(2).trimStart() };
  }
  if (trimmed.startsWith(":ws")) {
    return { scope: "workspaces", query: trimmed.slice(3).trimStart() };
  }
  if (trimmed.startsWith(":w")) {
    return { scope: "windows", query: trimmed.slice(2).trimStart() };
  }

  const firstChar = trimmed[0];
  if (firstChar === "@") {
    return { scope: "tabs", query: trimmed.slice(1).trimStart() };
  }
  if (firstChar === "#") {
    return { scope: "groups", query: trimmed.slice(1).trimStart() };
  }
  if (firstChar === "*") {
    return { scope: "bookmarks", query: trimmed.slice(1).trimStart() };
  }
  if (firstChar === ">") {
    return { scope: "commands", query: trimmed.slice(1).trimStart() };
  }
  if (firstChar === "?" || firstChar === "/") {
    return { scope: "commands", query: trimmed.slice(1).trimStart() };
  }

  return { scope: "default", query: trimmed };
}

export function highlightText(text: string, query: string): HighlightPart[] {
  if (!text) return [];
  if (!query || query.trim().length === 0) {
    return [{ text, highlight: false }];
  }

  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const idx = t.indexOf(q);

  if (idx !== -1) {
    const parts: HighlightPart[] = [];
    if (idx > 0) {
      parts.push({ text: text.slice(0, idx), highlight: false });
    }
    parts.push({ text: text.slice(idx, idx + q.length), highlight: true });
    if (idx + q.length < text.length) {
      parts.push({ text: text.slice(idx + q.length), highlight: false });
    }
    return parts;
  }

  const chars = q.split("").filter((c) => c.trim().length > 0);
  const parts: HighlightPart[] = [];
  let currentIdx = 0;
  let charIdx = 0;

  while (currentIdx < text.length && charIdx < chars.length) {
    const targetChar = chars[charIdx];
    if (!targetChar) break;
    const matchIdx = t.indexOf(targetChar, currentIdx);
    if (matchIdx === -1) break;

    if (matchIdx > currentIdx) {
      parts.push({ text: text.slice(currentIdx, matchIdx), highlight: false });
    }
    parts.push({ text: text.slice(matchIdx, matchIdx + 1), highlight: true });
    currentIdx = matchIdx + 1;
    charIdx++;
  }

  if (currentIdx < text.length) {
    parts.push({ text: text.slice(currentIdx), highlight: false });
  }

  return parts.length > 0 ? parts : [{ text, highlight: false }];
}

export function searchTabs(tabs: TabItem[], query: string): TabItem[] {
  if (!query || query.trim().length === 0) {
    return tabs;
  }

  const haystack = tabs.map((tab) => `${tab.title} ${tab.domain} ${tab.url}`);
  const [idxs, info, order] = uf.search(haystack, query);

  if (!idxs || idxs.length === 0) {
    return [];
  }

  if (order && info) {
    return order
      .map((i) => {
        const itemIdx = info.idx[i];
        return itemIdx !== undefined ? tabs[itemIdx] : undefined;
      })
      .filter((t): t is TabItem => t !== undefined);
  }

  return idxs.map((i) => tabs[i]).filter((t): t is TabItem => t !== undefined);
}

export function searchCommands(commands: CommandItem[], query: string): CommandItem[] {
  if (!query || query.trim().length === 0) {
    return commands;
  }

  const haystack = commands.map(
    (cmd) => `${cmd.title} ${cmd.category} ${cmd.keywords?.join(" ") ?? ""}`,
  );
  const [idxs, info, order] = uf.search(haystack, query);

  if (!idxs || idxs.length === 0) {
    return [];
  }

  if (order && info) {
    return order
      .map((i) => {
        const itemIdx = info.idx[i];
        return itemIdx !== undefined ? commands[itemIdx] : undefined;
      })
      .filter((c): c is CommandItem => c !== undefined);
  }

  return idxs.map((i) => commands[i]).filter((c): c is CommandItem => c !== undefined);
}

export function searchGroups(groups: TabGroupItem[], query: string): TabGroupItem[] {
  if (!query || query.trim().length === 0) {
    return groups;
  }

  const haystack = groups.map((g) => g.title ?? `Group ${g.id}`);
  const [idxs, info, order] = uf.search(haystack, query);

  if (!idxs || idxs.length === 0) {
    return [];
  }

  if (order && info) {
    return order
      .map((i) => {
        const itemIdx = info.idx[i];
        return itemIdx !== undefined ? groups[itemIdx] : undefined;
      })
      .filter((g): g is TabGroupItem => g !== undefined);
  }

  return idxs.map((i) => groups[i]).filter((g): g is TabGroupItem => g !== undefined);
}

export function searchBookmarks(bookmarks: BookmarkItem[], query: string): BookmarkItem[] {
  if (!query || query.trim().length === 0) {
    return bookmarks;
  }

  const haystack = bookmarks.map((b) => `${b.title} ${b.url} ${b.domain}`);
  const [idxs, info, order] = uf.search(haystack, query);

  if (!idxs || idxs.length === 0) {
    return [];
  }

  if (order && info) {
    return order
      .map((i) => {
        const itemIdx = info.idx[i];
        return itemIdx !== undefined ? bookmarks[itemIdx] : undefined;
      })
      .filter((b): b is BookmarkItem => b !== undefined);
  }

  return idxs.map((i) => bookmarks[i]).filter((b): b is BookmarkItem => b !== undefined);
}

export function searchHistory(items: HistoryItem[], query: string): HistoryItem[] {
  if (!query || query.trim().length === 0) {
    return items;
  }
  const haystack = items.map((h) => `${h.title} ${h.url} ${h.domain}`);
  const [idxs, info, order] = uf.search(haystack, query);
  if (!idxs || idxs.length === 0) return [];
  if (order && info) {
    return order
      .map((i) => {
        const itemIdx = info.idx[i];
        return itemIdx !== undefined ? items[itemIdx] : undefined;
      })
      .filter((v): v is HistoryItem => v !== undefined);
  }
  return idxs.map((i) => items[i]).filter((v): v is HistoryItem => v !== undefined);
}

export function searchDownloads(items: DownloadItem[], query: string): DownloadItem[] {
  if (!query || query.trim().length === 0) {
    return items;
  }
  const haystack = items.map((d) => `${d.filename} ${d.url} ${d.domain}`);
  const [idxs, info, order] = uf.search(haystack, query);
  if (!idxs || idxs.length === 0) return [];
  if (order && info) {
    return order
      .map((i) => {
        const itemIdx = info.idx[i];
        return itemIdx !== undefined ? items[itemIdx] : undefined;
      })
      .filter((v): v is DownloadItem => v !== undefined);
  }
  return idxs.map((i) => items[i]).filter((v): v is DownloadItem => v !== undefined);
}

export function searchRecentlyClosed(items: RecentlyClosedItem[], query: string): RecentlyClosedItem[] {
  if (!query || query.trim().length === 0) {
    return items;
  }
  const haystack = items.map((c) => `${c.title} ${c.url} ${c.domain}`);
  const [idxs, info, order] = uf.search(haystack, query);
  if (!idxs || idxs.length === 0) return [];
  if (order && info) {
    return order
      .map((i) => {
        const itemIdx = info.idx[i];
        return itemIdx !== undefined ? items[itemIdx] : undefined;
      })
      .filter((v): v is RecentlyClosedItem => v !== undefined);
  }
  return idxs.map((i) => items[i]).filter((v): v is RecentlyClosedItem => v !== undefined);
}

export function searchWindows(items: WindowItem[], query: string): WindowItem[] {
  if (!query || query.trim().length === 0) {
    return items;
  }
  const haystack = items.map((w) => `${w.title ?? "Window " + w.id} ${w.tabCount} tabs ${w.focused ? "focused" : ""}`);
  const [idxs, info, order] = uf.search(haystack, query);
  if (!idxs || idxs.length === 0) return [];
  if (order && info) {
    return order
      .map((i) => {
        const itemIdx = info.idx[i];
        return itemIdx !== undefined ? items[itemIdx] : undefined;
      })
      .filter((v): v is WindowItem => v !== undefined);
  }
  return idxs.map((i) => items[i]).filter((v): v is WindowItem => v !== undefined);
}

export function dedupHistoryWithTabs<T extends { url: string }>(history: T[], tabs: { url: string }[]): T[] {
  const tabUrls = new Set(tabs.map((t) => t.url.toLowerCase()));
  return history.filter((h) => !tabUrls.has(h.url.toLowerCase()));
}

export function searchWorkspaces(items: WorkspaceItem[], query: string): WorkspaceItem[] {
  if (!query || query.trim().length === 0) {
    return items;
  }
  const haystack = items.map((w) => `${w.name} ${w.tabs.map((t) => t.title + " " + t.domain).join(" ")}`);
  const [idxs, info, order] = uf.search(haystack, query);
  if (!idxs || idxs.length === 0) return [];
  if (order && info) {
    return order
      .map((i) => {
        const itemIdx = info.idx[i];
        return itemIdx !== undefined ? items[itemIdx] : undefined;
      })
      .filter((v): v is WorkspaceItem => v !== undefined);
  }
  return idxs.map((i) => items[i]).filter((v): v is WorkspaceItem => v !== undefined);
}
