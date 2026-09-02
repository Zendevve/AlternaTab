import { configStore } from "../state/configStore";
import { tabStore } from "../state/tabStore";
import type { BookmarkItem } from "../types/models";
import { onMessage } from "../types/protocol";
import { ok } from "../types/result";
import { extractDomain } from "../utils/domain";
import { BUILT_IN_COMMANDS } from "./commands";
import { groupTabsByDomain } from "./groups";
import {
  activateTab,
  closeTabs,
  deduplicateTabs,
  discardTabs,
  duplicateTab,
  exportSessionJson,
  reloadAllTabs,
  restoreClosedTab,
  suspendInactiveTabs,
  toggleMuteTab,
  togglePinTab,
} from "./tabs";
import { deleteHistoryEntry, getHistoryItems } from "./history";
import { getDownloads, openDownload, showDownloadInFolder } from "./downloads";
import { getRecentlyClosed } from "./recentlyClosed";
import { getWindows, splitTabToNewWindow } from "./windows";
import { err } from "../types/result";

function collectBookmarks(nodes: chrome.bookmarks.BookmarkTreeNode[], out: BookmarkItem[]): void {
  for (const node of nodes) {
    if (node.url) {
      out.push({
        id: node.id,
        title: node.title || node.url,
        url: node.url,
        domain: extractDomain(node.url),
      });
    }
    if (node.children) {
      collectBookmarks(node.children, out);
    }
  }
}

export function registerBackgroundMessaging(): void {
  onMessage("getTabs", async (message) => {
    await tabStore.refresh();
    return tabStore.getTabs(message.data);
  });

  onMessage("getConfig", async () => {
    return configStore.get();
  });

  onMessage("getCommands", async () => {
    return BUILT_IN_COMMANDS;
  });

  onMessage("activateTab", async (message) => {
    return activateTab(message.data.tabId, message.data.windowId);
  });

  onMessage("closeTabs", async (message) => {
    return closeTabs(message.data.tabIds);
  });

  onMessage("discardTabs", async (message) => {
    return discardTabs(message.data.tabIds);
  });

  onMessage("duplicateTab", async (message) => {
    return duplicateTab(message.data.tabId);
  });

  onMessage("toggleMuteTab", async (message) => {
    return toggleMuteTab(message.data.tabId);
  });

  onMessage("togglePinTab", async (message) => {
    return togglePinTab(message.data.tabId);
  });

  onMessage("moveTabToNewWindow", async (message) => {
    return splitTabToNewWindow(message.data.tabId);
  });

  onMessage("groupTabsByDomain", async (message) => {
    return groupTabsByDomain(message.data.windowId);
  });

  onMessage("deduplicateTabs", async (message) => {
    return deduplicateTabs(message.data.windowId);
  });

  onMessage("closeInactiveTabs", async (message) => {
    return suspendInactiveTabs(message.data.maxAgeMinutes);
  });

  onMessage("updateConfig", async (message) => {
    const updated = await configStore.update(message.data);
    return ok(updated);
  });

  onMessage("resetConfig", async () => {
    const reset = await configStore.reset();
    return ok(reset);
  });

  onMessage("restoreClosedTab", async () => {
    return restoreClosedTab();
  });

  onMessage("exportSession", async () => {
    return exportSessionJson();
  });

  onMessage("reloadAllTabs", async (message) => {
    return reloadAllTabs(message.data?.windowId);
  });

  onMessage("getBookmarks", async () => {
    const list: BookmarkItem[] = [];
    if (typeof chrome !== "undefined" && chrome.bookmarks?.getTree) {
      try {
        const tree = await chrome.bookmarks.getTree();
        collectBookmarks(tree, list);
      } catch {
        // Bookmarks permission not granted or error
      }
    }
    return list;
  });

  onMessage("fetchFavicon", async (message) => {
    const raw = message.data?.url;
    if (typeof raw !== "string") return { dataUrl: null };
    const url = raw.trim();
    if (!url) return { dataUrl: null };
    if (!/^https?:\/\//i.test(url)) return { dataUrl: null };
    if (/^(chrome|chrome-extension|moz-extension|about|data|file|filesystem|javascript|blob|view-source):/i.test(url)) {
      return { dataUrl: null };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url, {
        mode: "cors",
        credentials: "omit",
        signal: controller.signal,
      });
      if (!res.ok) return { dataUrl: null };
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      const isImage =
        ct.startsWith("image/") || ct === "application/octet-stream";
      if (!isImage) return { dataUrl: null };

      const blob = await res.blob();
      let dataUrl: string;
      if (typeof FileReader !== "undefined") {
        dataUrl = await new Promise<string>((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result as string);
          fr.onerror = () => reject(fr.error ?? new Error("FileReader failed"));
          fr.readAsDataURL(blob);
        });
      } else {
        const buffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i] ?? 0);
        }
        const base64 = btoa(binary);
        dataUrl = `data:${ct || "application/octet-stream"};base64,${base64}`;
      }
      return { dataUrl };
    } catch {
      return { dataUrl: null };
    } finally {
      clearTimeout(timeout);
    }
  });

  onMessage("getHistory", async (message) => {
    const q = message.data?.query;
    const max = message.data?.maxResults ?? 200;
    if (q) {
      const { searchHistoryItems } = await import("./history");
      return searchHistoryItems(q, max);
    }
    return getHistoryItems(max);
  });

  onMessage("getDownloads", async (message) => {
    const max = message.data?.maxResults ?? 100;
    return getDownloads(max);
  });

  onMessage("getRecentlyClosed", async (message) => {
    const max = message.data?.maxResults ?? 25;
    return getRecentlyClosed(max);
  });

  onMessage("getWindows", async () => {
    return getWindows();
  });

  onMessage("deleteHistoryEntry", async (message) => {
    try {
      await deleteHistoryEntry(message.data.url);
      return { ok: true as const, value: undefined };
    } catch (e) {
      return err("DELETE_HISTORY_FAILED", e instanceof Error ? e.message : "Failed");
    }
  });

  onMessage("openDownload", async (message) => {
    try {
      await openDownload(message.data.downloadId);
      return { ok: true as const, value: undefined };
    } catch (e) {
      return err("OPEN_DOWNLOAD_FAILED", e instanceof Error ? e.message : "Failed");
    }
  });

  onMessage("showDownloadInFolder", async (message) => {
    try {
      await showDownloadInFolder(message.data.downloadId);
      return { ok: true as const, value: undefined };
    } catch (e) {
      return err("SHOW_DOWNLOAD_FAILED", e instanceof Error ? e.message : "Failed");
    }
  });

  onMessage("openUrl", async (message) => {
    try {
      if (typeof chrome !== "undefined" && chrome.tabs?.create) {
        await chrome.tabs.create({ url: message.data.url, active: true });
      } else if (typeof window !== "undefined" && (window as any).open) {
        (window as any).open(message.data.url, "_blank");
      }
      return { ok: true as const, value: undefined };
    } catch (e) {
      return err("OPEN_URL_FAILED", e instanceof Error ? e.message : "Failed");
    }
  });

  onMessage("focusWindow", async (message) => {
    try {
      if (typeof chrome !== "undefined" && chrome.windows?.update) {
        await chrome.windows.update(message.data.windowId, { focused: true });
      }
      return { ok: true as const, value: undefined };
    } catch (e) {
      return err("FOCUS_WINDOW_FAILED", e instanceof Error ? e.message : "Failed");
    }
  });
}
