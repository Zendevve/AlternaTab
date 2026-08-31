import uFuzzy from "@leeoniya/ufuzzy";
import type { BookmarkItem, CommandItem, TabGroupItem, TabItem } from "../types/models";

export type ParsedQuery = {
  scope: "default" | "tabs" | "groups" | "bookmarks" | "commands";
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
