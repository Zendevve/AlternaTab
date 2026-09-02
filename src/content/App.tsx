import { type Component, createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { createSearchStore } from "../state/searchStore";
import type { CommandItem, DownloadItem, ExtensionConfig, HistoryItem, RecentlyClosedItem, TabItem, WindowItem } from "../types/models";
import { sendMessage } from "../types/protocol";
import { parsePluginQuery } from "../utils/search/plugins";
import { DEFAULT_CONFIG } from "../utils/validation";
import { CommandPalette } from "./components/CommandPalette";
import { DownloadsList } from "./components/DownloadsList";
import { HistoryList } from "./components/HistoryList";
import { PluginList } from "./components/PluginList";
import { RecentlyClosedList } from "./components/RecentlyClosedList";
import { WindowsList } from "./components/WindowsList";
import { ContextActions, type ContextActionType } from "./components/ContextActions";
import { SearchBar } from "./components/SearchBar";
import { StatusBar } from "./components/StatusBar";
import { TabList } from "./components/TabList";
import { createKeyboardHandler } from "./hooks/useKeyboard";

interface AppProps {
  initialVisible?: boolean;
  onClose?: () => void;
  onVisibilityChange?: (visible: boolean) => void;
}
export const App: Component<AppProps> = (props) => {
  const [visible, setVisible] = createSignal(props.initialVisible ?? false);
  const [config, setConfig] = createSignal<ExtensionConfig>({ ...DEFAULT_CONFIG });
  const [showContextActions, setShowContextActions] = createSignal(false);
  const [contextActionIndex, setContextActionIndex] = createSignal(0);

  let searchInputRef: HTMLInputElement | undefined;

  const store = createSearchStore();

  const loadData = async () => {
    try {
      const [tabData, cfg, cmds, bmarks, hist, dls, closed, wins, customTpls] = await Promise.all([
        sendMessage("getTabs", undefined),
        sendMessage("getConfig", undefined),
        sendMessage("getCommands", undefined),
        sendMessage("getBookmarks", undefined),
        sendMessage("getHistory", { maxResults: 200 }),
        sendMessage("getDownloads", { maxResults: 100 }),
        sendMessage("getRecentlyClosed", { maxResults: 25 }),
        sendMessage("getWindows", undefined),
        (sendMessage as any)("getCustomTemplates", undefined),
      ]);

      if (tabData) {
        store.setTabs(tabData.tabs);
        store.setGroups(tabData.groups);
        store.setActiveTabId(tabData.activeTabId);
        store.setFocusedWindowId(tabData.focusedWindowId);
      }
      if (cfg) {
        setConfig(cfg);
        if (cfg.searchScopeDefault) {
          store.setScope(cfg.searchScopeDefault);
        }
      }
      if (cmds) {
        store.setCommands(cmds);
      }
      if (bmarks) {
        store.setBookmarks(bmarks);
      }
      if (hist) {
        store.setHistory(hist as any);
      }
      if (dls) {
        store.setDownloads(dls as any);
      }
      if (closed) {
        store.setRecentlyClosed(closed as any);
      }
      if (wins) {
        store.setWindows(wins as any);
      }
      if (customTpls) {
        store.setCustomTemplates(customTpls as any);
      }
    } catch {
      // Background worker might be restarting
    }
  };

  const openOverlay = async () => {
    setVisible(true);
    setShowContextActions(false);
    await loadData();
    setTimeout(() => {
      searchInputRef?.focus();
      searchInputRef?.select();
    }, 16);
  };

  const closeOverlay = () => {
    setVisible(false);
    setShowContextActions(false);
    store.setQuery("");
    store.setSelectedIndex(0);
    props.onClose?.();
  };

  const cycleScope = () => {
    const scopes: Array<"all" | "window" | "tabs-only" | "groups" | "bookmarks" | "commands" | "history" | "downloads" | "closed" | "windows"> = [
      "all",
      "window",
      "tabs-only",
      "groups",
      "bookmarks",
      "commands",
      "history",
      "downloads",
      "closed",
      "windows",
    ];
    const current = store.effectiveScope();
    const nextIdx = (scopes.indexOf(current as any) + 1) % scopes.length;
    store.setScope(scopes[nextIdx] ?? "all");
    store.setSelectedIndex(0);
  };

  const getSelectedTab = (): TabItem | undefined => {
    const list = store.filteredTabs();
    return list[store.selectedIndex()];
  };

  const getSelectedCommand = (): CommandItem | undefined => {
    const list = store.filteredCommands();
    return list[store.selectedIndex()];
  };

  const activateCurrentTab = async (targetTab?: TabItem) => {
    const tab = targetTab ?? getSelectedTab();
    if (!tab) return;
    const tabId = tab.id;
    const windowId = tab.windowId;
    closeOverlay();
    try {
      await sendMessage("activateTab", { tabId, windowId });
    } catch {
      if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: "activateTab",
          data: { tabId, windowId },
        });
      }
    }
  };

  const executeCurrentCommand = async (cmdToRun?: CommandItem) => {
    const cmd = cmdToRun ?? getSelectedCommand();
    if (!cmd) return;
    closeOverlay();

    const selectedTab = getSelectedTab();
    const _activeTabId = selectedTab ? selectedTab.id : store.activeTabId();
    const windowId = selectedTab ? selectedTab.windowId : store.focusedWindowId();

    switch (cmd.id) {
      case "close-duplicates":
        await sendMessage("deduplicateTabs", { windowId });
        break;
      case "group-domain":
        await sendMessage("groupTabsByDomain", { windowId });
        break;
      case "suspend-inactive":
        await sendMessage("closeInactiveTabs", { maxAgeMinutes: 30 });
        break;
      case "restore-tab":
        await sendMessage("restoreClosedTab", undefined);
        break;
      case "reload-all":
        await sendMessage("reloadAllTabs", { windowId });
        break;
      case "export-session": {
        const res = await sendMessage("exportSession", undefined);
        if (res.ok) {
          navigator.clipboard?.writeText(res.value.json);
        }
        break;
      }
      case "toggle-theme": {
        const order: ExtensionConfig["theme"][] = ["light", "dark", "oled"];
        const nextTheme = order[(order.indexOf(config().theme) + 1) % order.length];
        if (nextTheme) {
          const res = await sendMessage("updateConfig", { theme: nextTheme });
          if (res.ok) setConfig(res.value);
        }
        break;
      }
      case "toggle-vim": {
        const nextVim = !config().enableVimMode;
        const res = await sendMessage("updateConfig", {
          enableVimMode: nextVim,
          keyboardProfile: nextVim ? "vim" : "standard",
        });
        if (res.ok) setConfig(res.value);
        break;
      }
      case "new-tab":
      case "new-window":
      case "new-incognito-window":
      case "bookmark-this":
      case "copy-url":
      case "duplicate-tab":
      case "clear-browsing-data": {
        const res = await sendMessage("executeCommand", { id: cmd.id });
        // For copy-url, also copy to clipboard from returned value
        if (cmd.id === "copy-url" && res && typeof (res as any).value?.url === "string") {
          try { await navigator.clipboard?.writeText((res as any).value.url); } catch {}
        }
        break;
      }
      default: {
        // Generic fallback for any future command via executeCommand
        try {
          await sendMessage("executeCommand", { id: cmd.id });
        } catch {}
        break;
      }
    }
  };

  const handleSelect = async () => {
    // Plugin prefix wins first (priority 1)
    const scEarly = store.effectiveScope();
    if (scEarly === "plugins") {
      await openPluginItem();
      return;
    }
    // Quick action suffix: e.g. "github >mute" — action on selected tab without switching scope
    const pa = store.parsedAction();
    if (pa.action) {
      const tab = getSelectedTab();
      if (tab) {
        // Keep HUD open for non-destructive actions where possible
        if (pa.action === "mute") {
          await toggleMuteCurrent();
          return;
        }
        if (pa.action === "pin") {
          await togglePinCurrent();
          return;
        }
        if (pa.action === "close") {
          await closeCurrentTab();
          return;
        }
        if (pa.action === "copy") {
          try { await navigator.clipboard?.writeText(tab.url); } catch {}
          closeOverlay();
          return;
        }
        if (pa.action === "duplicate") {
          await sendMessage("duplicateTab", { tabId: tab.id });
          await loadData();
          return;
        }
        if (pa.action === "move") {
          await splitWindowCurrent();
          return;
        }
        if (pa.action === "discard") {
          await sendMessage("discardTabs", { tabIds: [tab.id] });
          await loadData();
          return;
        }
      }
    }

    // Template bang: priority 2 after plugins
    const tpl = store.templateResult();
    if (tpl) {
      closeOverlay();
      await sendMessage("openUrl", { url: tpl.url });
      return;
    }

    // URL navigate: if navigate item exists and no local tab match is selected, prioritize navigate
    const nav = store.navigateItem();
    const hasLocalMatch = store.filteredTabs().length > 0 || store.filteredHistory().length > 0;
    if (nav && !hasLocalMatch) {
      closeOverlay();
      await sendMessage("openUrl", { url: nav.url });
      return;
    }

    // Calculator: primary action copies result
    const calc = store.calcItem();
    if (calc) {
      try { await navigator.clipboard?.writeText(String(calc.result)); } catch {}
      closeOverlay();
      return;
    }

    const sc = store.effectiveScope();
    if (sc === "commands") {
      await executeCurrentCommand();
    } else if (sc === "history") {
      await openHistoryItem();
    } else if (sc === "downloads") {
      await openDownloadItem();
    } else if (sc === "closed") {
      await restoreClosedItem();
    } else if (sc === "windows") {
      await focusWindowItem();
    } else {
      // Fallback: if still no local match, use fallback search engine (engine-aware)
      if (!hasLocalMatch) {
        const fbs = store.fallbackItems();
        const fb = fbs[0] ?? store.fallbackItem();
        if (fb) {
          closeOverlay();
          await sendMessage("openUrl", { url: fb.url });
          return;
        }
      }
      await activateCurrentTab();
    }
  };

  const closeCurrentTab = async () => {
    const tab = getSelectedTab();
    if (!tab) return;
    await sendMessage("closeTabs", { tabIds: [tab.id] });
    const refreshed = await sendMessage("getTabs", undefined);
    if (refreshed) {
      store.setTabs(refreshed.tabs);
    }
  };

  const splitWindowCurrent = async () => {
    const tab = getSelectedTab();
    if (!tab) return;
    closeOverlay();
    await sendMessage("moveTabToNewWindow", { tabId: tab.id });
  };

  const toggleMuteCurrent = async () => {
    const tab = getSelectedTab();
    if (!tab) return;
    await sendMessage("toggleMuteTab", { tabId: tab.id });
    const refreshed = await sendMessage("getTabs", undefined);
    if (refreshed) store.setTabs(refreshed.tabs);
  };

  const togglePinCurrent = async () => {
    const tab = getSelectedTab();
    if (!tab) return;
    await sendMessage("togglePinTab", { tabId: tab.id });
    const refreshed = await sendMessage("getTabs", undefined);
    if (refreshed) store.setTabs(refreshed.tabs);
  };

  const openHistoryItem = async (item?: HistoryItem) => {
    const target = item ?? store.filteredHistory()[store.selectedIndex()] as HistoryItem | undefined;
    if (!target) return;
    closeOverlay();
    await sendMessage("openUrl", { url: target.url });
  };

  const openDownloadItem = async (item?: DownloadItem) => {
    const target = item ?? store.filteredDownloads()[store.selectedIndex()] as DownloadItem | undefined;
    if (!target) return;
    closeOverlay();
    await sendMessage("openDownload", { downloadId: target.id });
  };

  const restoreClosedItem = async (item?: RecentlyClosedItem) => {
    const target = item ?? store.filteredRecentlyClosed()[store.selectedIndex()] as RecentlyClosedItem | undefined;
    if (!target) return;
    closeOverlay();
    try {
      if (typeof chrome !== "undefined" && chrome.sessions?.restore) {
        await chrome.sessions.restore(target.sessionId);
      } else {
        await sendMessage("restoreClosedTab", undefined);
      }
    } catch {
      await sendMessage("restoreClosedTab", undefined);
    }
  };

  const focusWindowItem = async (item?: WindowItem) => {
    const target = item ?? store.filteredWindows()[store.selectedIndex()] as WindowItem | undefined;
    if (!target) return;
    closeOverlay();
    await sendMessage("focusWindow", { windowId: target.id });
  };

  const openPluginItem = async (item?: import("../types/models").PluginResultItem) => {
    const target = item ?? store.pluginResults()[store.selectedIndex()] as import("../types/models").PluginResultItem | undefined;
    if (!target) return;
    if (target.url) {
      closeOverlay();
      await sendMessage("openUrl", { url: target.url });
    }
  };

  // Plugin prefix watcher: when query starts with plugin prefix, run plugin and populate store
  createEffect(() => {
    const q = store.query();
    const pq = parsePluginQuery(q);
    if (pq) {
      store.setPluginPrefix(pq.prefix);
      // async fetch plugin results
      (async () => {
        try {
          const results = await sendMessage("runPlugin", { prefix: pq.prefix, query: pq.query });
          if (Array.isArray(results)) {
            store.setPluginResults(results as any);
            store.setSelectedIndex(0);
          } else {
            store.setPluginResults([]);
          }
        } catch {
          store.setPluginResults([]);
        }
      })();
    } else {
      if (store.pluginPrefix() !== null) {
        store.setPluginPrefix(null);
        store.setPluginResults([]);
      }
    }
  });

  const handleContextAction = async (action: ContextActionType) => {
    const tab = getSelectedTab();
    if (!tab) return;
    setShowContextActions(false);

    switch (action) {
      case "pin":
        await togglePinCurrent();
        break;
      case "mute":
        await toggleMuteCurrent();
        break;
      case "duplicate":
        await sendMessage("duplicateTab", { tabId: tab.id });
        await loadData();
        break;
      case "move":
        await splitWindowCurrent();
        break;
      case "discard":
        await sendMessage("discardTabs", { tabIds: [tab.id] });
        await loadData();
        break;
      case "close":
        await closeCurrentTab();
        break;
    }
  };

  const keyboardHandler = createKeyboardHandler(() => config().keyboardProfile, {
    onNext: () => {
      if (showContextActions()) {
        setContextActionIndex((prev) => (prev + 1) % 6);
      } else {
        const total = store.totalItemCount();
        if (total > 0) {
          store.setSelectedIndex((prev) => (prev + 1) % total);
        }
      }
    },
    onPrev: () => {
      if (showContextActions()) {
        setContextActionIndex((prev) => (prev - 1 + 6) % 6);
      } else {
        const total = store.totalItemCount();
        if (total > 0) {
          store.setSelectedIndex((prev) => (prev - 1 + total) % total);
        }
      }
    },
    onSelect: () => {
      if (showContextActions()) {
        const actionTypes: ContextActionType[] = [
          "pin",
          "mute",
          "duplicate",
          "move",
          "discard",
          "close",
        ];
        const action = actionTypes[contextActionIndex()];
        if (action) {
          handleContextAction(action);
        }
      } else {
        handleSelect();
      }
    },
    onCloseCurrent: closeCurrentTab,
    onSplitWindow: splitWindowCurrent,
    onCycleScope: cycleScope,
    onToggleMute: toggleMuteCurrent,
    onTogglePin: togglePinCurrent,
    onFirstItem: () => store.setSelectedIndex(0),
    onLastItem: () => {
      const total = store.totalItemCount();
      if (total > 0) store.setSelectedIndex(total - 1);
    },
    onDismiss: closeOverlay,
    onFocusSearch: () => {
      searchInputRef?.focus();
    },
    onToggleContextActions: () => {
      setShowContextActions((prev) => !prev);
    },
    onMruNext: () => {
      if (!config().enableMruCycle) return false;
      if (store.effectiveScope() !== "all") return false;
      if (showContextActions()) return false;
      const ae = document.activeElement;
      if (ae instanceof HTMLInputElement) return false;
      const total = store.totalItemCount();
      if (total <= 1) return false;
      store.setSelectedIndex((prev) => (prev + 1) % total);
      return true;
    },
    isQueryEmpty: () => store.query().trim().length === 0,
    clearQuery: () => store.setQuery(""),
  });
  // Global listeners while overlay is visible — block wheel/scroll/touch
  // bleed-through to the host page while keeping the results list scrollable.
  createEffect(() => {
    if (!visible()) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const handled = keyboardHandler(e);
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const handleScrollBleed = (e: WheelEvent | TouchEvent) => {
      // composedPath preserves the actual element chain across the shadow
      // boundary — e.target would be retargeted to #alternatab-host at the
      // window level, making closest() useless.
      const path = e.composedPath() as Element[];
      const listEl = path.find((el) => el?.classList?.contains("at-results-list")) as
        | HTMLElement
        | undefined;
      if (listEl) {
        const atTop = listEl.scrollTop <= 0;
        const atBottom = listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 1;
        const deltaY = "deltaY" in e && typeof e.deltaY === "number" ? e.deltaY : 0;
        const goingDown = deltaY > 0;
        const goingUp = deltaY < 0;
        if ((atTop && goingUp) || (atBottom && goingDown)) {
          e.preventDefault();
        }
        e.stopPropagation();
        return;
      }
      // Outside the list: full block.
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", handleGlobalKeyDown, { capture: true });
    window.addEventListener("wheel", handleScrollBleed, { capture: true, passive: false });
    window.addEventListener("touchmove", handleScrollBleed, { capture: true, passive: false });
    onCleanup(() => {
      window.removeEventListener("keydown", handleGlobalKeyDown, { capture: true });
      window.removeEventListener("wheel", handleScrollBleed, {
        capture: true,
      } as EventListenerOptions);
      window.removeEventListener("touchmove", handleScrollBleed, {
        capture: true,
      } as EventListenerOptions);
    });
  });

  createEffect(() => {
    props.onVisibilityChange?.(visible());
  });

  onMount(() => {
    const handleRuntimeMessage = (msg: { type: string }) => {
      if (msg?.type === "TOGGLE_ALTERNATAB_OVERLAY") {
        if (visible()) {
          closeOverlay();
        } else {
          openOverlay();
        }
      }
    };

    if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(handleRuntimeMessage);
    }

    const handleWindowMessage = (e: MessageEvent) => {
      if (e.data?.type === "TOGGLE_ALTERNATAB_OVERLAY") {
        if (visible()) {
          closeOverlay();
        } else {
          openOverlay();
        }
      }
    };
    window.addEventListener("message", handleWindowMessage);

    onCleanup(() => {
      if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
      }
      window.removeEventListener("message", handleWindowMessage);
    });

    if (props.initialVisible) {
      openOverlay();
    }
  });

  const themeClass = () => `theme-${config().theme}`;

  return (
    <Show when={visible()}>
      <div
        class={`at-overlay-root ${themeClass()}`}
        style={{
          "--at-blur-px": `${config().blurRadiusPx}px`,
        }}
        on:mousedown={(e: MouseEvent) => {
          if (e.target === e.currentTarget) {
            closeOverlay();
          }
        }}
      >
        <div
          class="at-backdrop"
          on:mousedown={(e: MouseEvent) => {
            e.stopPropagation();
            closeOverlay();
          }}
        />

        <div
          class="at-hud-container"
          role="dialog"
          aria-modal="true"
          aria-label="AlternaTab Command HUD"
          on:mousedown={(e: MouseEvent) => {
            e.stopPropagation();
          }}
        >
          <SearchBar
            query={store.query()}
            onQueryChange={(q) => {
              store.setQuery(q);
              store.setSelectedIndex(0);
            }}
            scope={store.effectiveScope()}
            onCycleScope={cycleScope}
            itemCount={store.totalItemCount()}
            inputRef={(el) => {
              searchInputRef = el;
            }}
          />

          <Show when={store.templateResult()}>
            {(tpl) => (
              <div class="at-results-list" role="listbox" aria-label="Template">
                <div
                  class="at-row at-selected"
                  role="option"
                  aria-selected="true"
                  on:click={() => handleSelect()}
                >
                  <div class="at-row-icon"><span style={{ "font-size": "12px" }}>!</span></div>
                  <div class="at-row-main">
                    <div class="at-row-title">{tpl().title}</div>
                    <div class="at-row-sub"><span class="at-row-domain">{tpl().domain}</span><span class="at-row-meta">Press Enter to search</span></div>
                  </div>
                  <div class="at-row-badges"><span class="at-badge">Template:{tpl().templateId}</span></div>
                </div>
              </div>
            )}
          </Show>
          <Show when={store.calcItem()}>
            {(calc) => (
              <div class="at-results-list" role="listbox" aria-label="Calculator">
                <div
                  class="at-row at-selected"
                  role="option"
                  aria-selected="true"
                  on:click={() => handleSelect()}
                >
                  <div class="at-row-icon"><span style={{ "font-size": "12px" }}>∑</span></div>
                  <div class="at-row-main">
                    <div class="at-row-title">{calc().expression} = {String(calc().result)}</div>
                    <div class="at-row-sub"><span class="at-row-meta">Press Enter to copy</span></div>
                  </div>
                  <div class="at-row-badges"><span class="at-badge">Calculator</span></div>
                </div>
              </div>
            )}
          </Show>
          <Show when={store.navigateItem()}>
            {(nav) => (
              <div class="at-results-list" role="listbox" aria-label="Navigate">
                <div
                  class="at-row at-selected"
                  role="option"
                  aria-selected="true"
                  on:click={() => handleSelect()}
                >
                  <div class="at-row-icon"><span style={{ "font-size": "12px" }}>↗</span></div>
                  <div class="at-row-main">
                    <div class="at-row-title">Go to {nav().url}</div>
                    <div class="at-row-sub"><span class="at-row-domain">{nav().domain}</span></div>
                  </div>
                  <div class="at-row-badges"><span class="at-badge">Navigate</span></div>
                </div>
              </div>
            )}
          </Show>
          <Show when={store.effectiveScope() === "commands"}>
            <CommandPalette
              commands={store.filteredCommands()}
              selectedIndex={store.selectedIndex()}
              query={store.parsed().query}
              onSelect={executeCurrentCommand}
              onHoverCommand={(idx) => store.setSelectedIndex(idx)}
            />
          </Show>
          <Show when={store.effectiveScope() === "history"}>
            <HistoryList
              items={store.filteredHistory()}
              selectedIndex={store.selectedIndex()}
              query={store.parsed().query}
              maxRenderedItems={config().maxRenderedItems}
              onSelect={(item) => openHistoryItem(item)}
              onHover={(idx) => store.setSelectedIndex(idx)}
            />
          </Show>
          <Show when={store.effectiveScope() === "downloads"}>
            <DownloadsList
              items={store.filteredDownloads()}
              selectedIndex={store.selectedIndex()}
              query={store.parsed().query}
              maxRenderedItems={config().maxRenderedItems}
              onSelect={(item) => openDownloadItem(item)}
              onHover={(idx) => store.setSelectedIndex(idx)}
            />
          </Show>
          <Show when={store.effectiveScope() === "closed"}>
            <RecentlyClosedList
              items={store.filteredRecentlyClosed()}
              selectedIndex={store.selectedIndex()}
              query={store.parsed().query}
              maxRenderedItems={config().maxRenderedItems}
              onSelect={(item) => restoreClosedItem(item)}
              onHover={(idx) => store.setSelectedIndex(idx)}
            />
          </Show>
          <Show when={store.effectiveScope() === "windows"}>
            <WindowsList
              items={store.filteredWindows()}
              selectedIndex={store.selectedIndex()}
              query={store.parsed().query}
              maxRenderedItems={config().maxRenderedItems}
              onSelect={(item) => focusWindowItem(item)}
              onHover={(idx) => store.setSelectedIndex(idx)}
            />
          </Show>
          <Show when={store.effectiveScope() === "plugins"}>
            <PluginList
              items={store.pluginResults()}
              selectedIndex={store.selectedIndex()}
              query={store.parsedAction().baseQuery}
              prefix={store.pluginPrefix() ?? ""}
              maxRenderedItems={config().maxRenderedItems}
              onSelect={(item) => openPluginItem(item)}
              onHover={(idx) => store.setSelectedIndex(idx)}
            />
          </Show>
          <Show when={! ["commands", "history", "downloads", "closed", "windows", "plugins", "templates"].includes(store.effectiveScope() as string)}>
            <TabList
              tabs={store.filteredTabs()}
              selectedIndex={store.selectedIndex()}
              query={store.parsed().query}
              domainColors={config().domainColors}
              activeTabId={store.activeTabId()}
              focusedWindowId={store.focusedWindowId()}
              maxRenderedItems={config().maxRenderedItems}
              onSelectTab={(tab) => activateCurrentTab(tab)}
              onHoverTab={(idx) => store.setSelectedIndex(idx)}
            />
            <Show when={store.effectiveScope()==="all" && store.templateResult()===null && store.navigateItem()===null && store.calcItem()===null && store.allHistoryPreview().length>0}>
              <div class="at-results-list" style={{ "border-top": "1px solid var(--at-border)", "margin-top": "8px", "padding-top": "4px" }}>
                <div style={{ "font-size": "11px", color: "var(--at-text-muted)", padding: "4px 10px", "font-weight": "600" }}>History · frecency-ranked</div>
                <For each={store.allHistoryPreview()}>
                  {(item) => (
                    <div class="at-row" tabIndex={-1} on:click={() => { closeOverlay(); sendMessage("openUrl", { url: item.url }); }}>
                      <div class="at-row-icon"><span style={{ "font-size": "12px" }}>🕘</span></div>
                      <div class="at-row-main">
                        <div class="at-row-title">{item.title}</div>
                        <div class="at-row-sub"><span class="at-row-domain">{item.domain}</span><Show when={item.visitCount}><span class="at-row-meta">{item.visitCount} visits</span></Show></div>
                      </div>
                      <div class="at-row-badges"><span class="at-badge">History</span></div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
            <Show when={store.totalItemCount()===0 && store.navigateItem()===null && store.calcItem()===null && store.templateResult()===null && store.parsed().query.trim().length>0}>
              <div class="at-empty at-empty-actions" style={{ padding: "8px" }}>
                <div class="at-results-list">
                  <div class="at-row" on:click={async () => { const q = store.parsed().query.trim(); const url = q.includes("://") ? q : "https://" + q; closeOverlay(); await sendMessage("openUrl", { url }); }}>
                    <div class="at-row-icon"><span style={{ "font-size": "12px" }}>↗</span></div>
                    <div class="at-row-main"><div class="at-row-title">Open "{store.parsed().query}" in new tab</div><div class="at-row-sub"><span class="at-row-domain">navigate</span></div></div>
                    <div class="at-row-badges"><span class="at-badge">Web fallback</span></div>
                  </div>
                  <Show when={store.fallbackItems()[0]}>
                    {(fb) => (
                      <div class="at-row" on:click={async () => { closeOverlay(); await sendMessage("openUrl", { url: fb().url }); }}>
                        <div class="at-row-icon"><span style={{ "font-size": "12px" }}>🔍</span></div>
                        <div class="at-row-main"><div class="at-row-title">{fb().title}</div><div class="at-row-sub"><span class="at-row-domain">{fb().domain}</span></div></div>
                        <div class="at-row-badges"><span class="at-badge">Web fallback</span></div>
                      </div>
                    )}
                  </Show>
                  <div class="at-row" on:click={() => { const q = store.parsed().query.trim(); store.setQuery(":h " + q); store.setSelectedIndex(0); }}>
                    <div class="at-row-icon"><span style={{ "font-size": "12px" }}>🕘</span></div>
                    <div class="at-row-main"><div class="at-row-title">Search history for "{store.parsed().query}"</div><div class="at-row-sub"><span class="at-row-domain">:h {store.parsed().query}</span></div></div>
                    <div class="at-row-badges"><span class="at-badge">Web fallback</span></div>
                  </div>
                </div>
              </div>
            </Show>
          </Show>
          <Show when={getSelectedTab()}>
            {(tab) => (
              <ContextActions
                tab={tab()}
                selectedIndex={contextActionIndex()}
                onExecute={handleContextAction}
                onHover={(idx) => setContextActionIndex(idx)}
                open={showContextActions()}
              />
            )}
          </Show>

          <StatusBar profile={config().keyboardProfile} itemCount={store.totalItemCount()} />
        </div>
      </div>
    </Show>
  );
};
