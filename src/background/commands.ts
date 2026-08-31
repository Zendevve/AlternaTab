import { configStore } from "../state/configStore";
import { tabStore } from "../state/tabStore";
import type { CommandId, CommandItem, ThemeVariant } from "../types/models";
import type { Result } from "../types/result";
import { err, ok } from "../types/result";
import { groupTabsByDomain } from "./groups";
import {
  closeOtherTabs,
  closeTabsLeft,
  closeTabsRight,
  copyUrlsMarkdown,
  deduplicateTabs,
  exportSessionJson,
  muteAllAudio,
  reloadAllTabs,
  restoreClosedTab,
  sortWindowTabs,
  suspendInactiveTabs,
  togglePinTab,
} from "./tabs";
import { mergeAllWindows, splitTabToNewWindow } from "./windows";

export const BUILT_IN_COMMANDS: CommandItem[] = [
  {
    id: "close-duplicates",
    title: "Close Duplicate Tabs",
    category: "Tab",
    keywords: ["dedupe", "duplicate", "clean"],
  },
  {
    id: "group-domain",
    title: "Group Tabs by Domain",
    category: "Group",
    keywords: ["organize", "domain", "cluster"],
  },
  {
    id: "suspend-inactive",
    title: "Suspend Inactive Tabs",
    category: "Tab",
    keywords: ["discard", "sleep", "memory", "hibernate"],
  },
  {
    id: "close-left",
    title: "Close Tabs to the Left",
    category: "Tab",
    keywords: ["close", "left"],
  },
  {
    id: "close-right",
    title: "Close Tabs to the Right",
    category: "Tab",
    keywords: ["close", "right"],
  },
  {
    id: "close-other",
    title: "Close Other Tabs",
    category: "Tab",
    keywords: ["close", "only", "isolate"],
  },
  {
    id: "mute-all",
    title: "Mute All Audio Tabs",
    category: "Navigation",
    keywords: ["sound", "silence", "audio", "volume"],
  },
  {
    id: "pin-toggle",
    title: "Toggle Pin Selected Tab",
    category: "Tab",
    shortcutHint: "p",
    keywords: ["pin", "sticky"],
  },
  {
    id: "split-window",
    title: "Move Selected Tab to New Window",
    category: "Window",
    shortcutHint: "Ctrl+Enter",
    keywords: ["split", "detach", "new window"],
  },
  {
    id: "merge-windows",
    title: "Merge All Windows Here",
    category: "Window",
    keywords: ["join", "combine", "consolidate"],
  },
  {
    id: "sort-title",
    title: "Sort Tabs by Title (A-Z)",
    category: "Tab",
    keywords: ["alphabetical", "order"],
  },
  {
    id: "sort-domain",
    title: "Sort Tabs by Domain",
    category: "Tab",
    keywords: ["hostname", "order"],
  },
  {
    id: "sort-mru",
    title: "Sort Tabs by Recent Use (MRU)",
    category: "Tab",
    keywords: ["recency", "frecency", "order"],
  },
  {
    id: "restore-tab",
    title: "Restore Recently Closed Tab",
    category: "Session",
    shortcutHint: "Ctrl+Shift+T",
    keywords: ["reopen", "undo", "restore"],
  },
  {
    id: "export-session",
    title: "Export Session to JSON",
    category: "Session",
    keywords: ["backup", "save", "download"],
  },
  {
    id: "copy-urls",
    title: "Copy Tab URLs as Markdown",
    category: "Session",
    keywords: ["clipboard", "export", "links"],
  },
  {
    id: "reload-all",
    title: "Reload All Tabs",
    category: "Navigation",
    keywords: ["refresh", "reload"],
  },
  {
    id: "toggle-theme",
    title: "Toggle Theme (Light / Dark / OLED)",
    category: "Preferences",
    keywords: ["appearance", "dark mode", "light mode"],
  },
  {
    id: "toggle-vim",
    title: "Toggle Vim Keybindings",
    category: "Preferences",
    keywords: ["vim", "keys", "profile"],
  },
  {
    id: "open-settings",
    title: "Open AlternaTab Settings",
    category: "System",
    keywords: ["options", "config", "preferences"],
  },
];

export async function executeCommand(
  id: CommandId,
  context?: { tabId?: number; windowId?: number },
): Promise<Result<unknown>> {
  const currentWindowId = context?.windowId || tabStore.getTabs().focusedWindowId;
  const currentTabId = context?.tabId || tabStore.getTabs().activeTabId;

  switch (id) {
    case "close-duplicates":
      return deduplicateTabs(currentWindowId);
    case "group-domain":
      return groupTabsByDomain(currentWindowId);
    case "suspend-inactive":
      return suspendInactiveTabs(30);
    case "close-left":
      return closeTabsLeft(currentTabId, currentWindowId);
    case "close-right":
      return closeTabsRight(currentTabId, currentWindowId);
    case "close-other":
      return closeOtherTabs(currentTabId, currentWindowId);
    case "mute-all":
      return muteAllAudio();
    case "pin-toggle":
      return togglePinTab(currentTabId);
    case "split-window":
      return splitTabToNewWindow(currentTabId);
    case "merge-windows":
      return mergeAllWindows(currentWindowId);
    case "sort-title":
      return sortWindowTabs(currentWindowId, "title");
    case "sort-domain":
      return sortWindowTabs(currentWindowId, "domain");
    case "sort-mru":
      return sortWindowTabs(currentWindowId, "mru");
    case "restore-tab":
      return restoreClosedTab();
    case "export-session":
      return exportSessionJson();
    case "copy-urls":
      return copyUrlsMarkdown(currentWindowId);
    case "reload-all":
      return reloadAllTabs(currentWindowId);
    case "toggle-theme": {
      const config = configStore.get();
      const themeOrder: ThemeVariant[] = ["light", "dark", "oled"];
      const currentIndex = themeOrder.indexOf(config.theme);
      const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
      const updated = await configStore.update({ theme: nextTheme });
      return ok({ theme: updated.theme });
    }
    case "toggle-vim": {
      const config = configStore.get();
      const nextVim = !config.enableVimMode;
      const updated = await configStore.update({
        enableVimMode: nextVim,
        keyboardProfile: nextVim ? "vim" : "standard",
      });
      return ok({ enableVimMode: updated.enableVimMode });
    }
    case "open-settings": {
      if (chrome.runtime?.openOptionsPage) {
        chrome.runtime.openOptionsPage();
        return ok({ opened: true });
      }
      return err("SETTINGS_FAILED", "Options page is unavailable");
    }
    default:
      return err("UNKNOWN_COMMAND", `Command "${id}" not recognized`);
  }
}
