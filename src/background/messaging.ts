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
import { splitTabToNewWindow } from "./windows";

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
}
