import { type Component, createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";
import { createSearchStore } from "../state/searchStore";
import type { CommandItem, ExtensionConfig, TabItem } from "../types/models";
import { sendMessage } from "../types/protocol";
import { DEFAULT_CONFIG } from "../utils/validation";
import { CommandPalette } from "./components/CommandPalette";
import { ContextActions, type ContextActionType } from "./components/ContextActions";
import { SearchBar } from "./components/SearchBar";
import { StatusBar } from "./components/StatusBar";
import { TabList } from "./components/TabList";
import { createKeyboardHandler } from "./hooks/useKeyboard";

interface AppProps {
  initialVisible?: boolean;
  onClose?: () => void;
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
      const [tabData, cfg, cmds, bmarks] = await Promise.all([
        sendMessage("getTabs", undefined),
        sendMessage("getConfig", undefined),
        sendMessage("getCommands", undefined),
        sendMessage("getBookmarks", undefined),
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
    const scopes: Array<"all" | "window" | "tabs-only" | "groups" | "bookmarks" | "commands"> = [
      "all",
      "window",
      "tabs-only",
      "groups",
      "bookmarks",
      "commands",
    ];
    const current = store.effectiveScope();
    const nextIdx = (scopes.indexOf(current) + 1) % scopes.length;
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
    closeOverlay();
    await sendMessage("activateTab", { tabId: tab.id, windowId: tab.windowId });
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
      default:
        break;
    }
  };

  const handleSelect = async () => {
    if (store.effectiveScope() === "commands") {
      await executeCurrentCommand();
    } else {
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
    isQueryEmpty: () => store.query().trim().length === 0,
    clearQuery: () => store.setQuery(""),
  });

  // Global window keydown listener while overlay is visible
  createEffect(() => {
    if (!visible()) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      keyboardHandler(e);
    };
    window.addEventListener("keydown", handleGlobalKeyDown, { capture: true });
    onCleanup(() => {
      window.removeEventListener("keydown", handleGlobalKeyDown, { capture: true });
    });
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

    onCleanup(() => {
      if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
      }
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
      >
        <div
          class="at-backdrop"
          onClick={() => {
            if (config().closeOnBlur) {
              closeOverlay();
            }
          }}
        />

        <div
          class="at-hud-container"
          role="dialog"
          aria-modal="true"
          aria-label="AlternaTab Command HUD"
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
            onKeyDown={(e) => {
              keyboardHandler(e);
            }}
          />

          <Show
            when={store.effectiveScope() === "commands"}
            fallback={
              <TabList
                tabs={store.filteredTabs()}
                selectedIndex={store.selectedIndex()}
                query={store.parsed().query}
                domainColors={config().domainColors}
                activeTabId={store.activeTabId()}
                focusedWindowId={store.focusedWindowId()}
                maxRenderedItems={config().maxRenderedItems}
                onSelectTab={(tab) => activateCurrentTab(tab)}
              />
            }
          >
            <CommandPalette
              commands={store.filteredCommands()}
              selectedIndex={store.selectedIndex()}
              query={store.parsed().query}
              onSelect={executeCurrentCommand}
            />
          </Show>

          <Show when={showContextActions() && getSelectedTab()}>
            {(tab) => (
              <ContextActions
                tab={tab()}
                selectedIndex={contextActionIndex()}
                onExecute={handleContextAction}
              />
            )}
          </Show>

          <StatusBar profile={config().keyboardProfile} itemCount={store.totalItemCount()} />
        </div>
      </div>
    </Show>
  );
};
