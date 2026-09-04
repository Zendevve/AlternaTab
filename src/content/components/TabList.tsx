import { type Component, createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import type { TabItem } from "../../types/models";
import { measureLatency } from "../../utils/perf";
import { EmptyState } from "./EmptyState";
import { TabRow } from "./TabRow";

interface TabListProps {
  tabs: TabItem[];
  selectedIndex: number;
  query: string;
  domainColors: Record<string, string>;
  activeTabId?: number;
  focusedWindowId?: number;
  onSelectTab: (tab: TabItem) => void;
  onHoverTab?: (index: number) => void;
  maxRenderedItems: number;
  leavingTabIds?: Set<number>;
  stagedTabIds?: Set<number>;
  onToggleStageTab?: (tabId: number) => void;
}

const VIRTUAL_THRESHOLD = 200;
const ROW_HEIGHT = 56;
const OVERSCAN = 5;

export const TabList: Component<TabListProps> = (props) => {
  const rowElements: Map<number, HTMLDivElement> = new Map();
  let containerRef!: HTMLDivElement;
  const [scrollTop, setScrollTop] = createSignal(0);
  const [containerHeight, setContainerHeight] = createSignal(400);

  const displayedTabs = () => {
    const { result } = measureLatency("TabList.slice", () => props.tabs.slice(0, props.maxRenderedItems));
    return result;
  };

  const shouldVirtualize = () => displayedTabs().length >= VIRTUAL_THRESHOLD;

  const isMultiWindow = () => {
    const list = props.tabs;
    if (list.length <= 1) return false;
    const firstWin = list[0]?.windowId;
    return list.some((t) => t.windowId !== firstWin);
  };

  const virtualRange = () => {
    if (!shouldVirtualize()) return { start: 0, end: displayedTabs().length };
    const start = Math.max(0, Math.floor(scrollTop() / ROW_HEIGHT) - OVERSCAN);
    const end = Math.min(
      displayedTabs().length,
      Math.ceil((scrollTop() + containerHeight()) / ROW_HEIGHT) + OVERSCAN
    );
    return { start, end };
  };

  const virtualTabs = () => {
    const { start, end } = virtualRange();
    const all = displayedTabs();
    return all.slice(start, end).map((tab, i) => ({ tab, idx: start + i }));
  };

  createEffect(() => {
    const idx = props.selectedIndex;
    const el = rowElements.get(idx);
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
    // Ensure selected index is within virtual window when virtualized
    if (shouldVirtualize() && containerRef) {
      const { start, end } = virtualRange();
      if (idx < start || idx >= end) {
        const targetTop = idx * ROW_HEIGHT;
        containerRef.scrollTop = Math.max(0, targetTop - containerHeight() / 2);
      }
    }
  });

  onMount(() => {
    if (!containerRef) return;
    const updateHeight = () => setContainerHeight(containerRef.clientHeight || 400);
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(containerRef);
    const onScroll = () => setScrollTop(containerRef.scrollTop);
    containerRef.addEventListener("scroll", onScroll, { passive: true });
    onCleanup(() => {
      ro.disconnect();
      containerRef?.removeEventListener("scroll", onScroll);
    });
  });

  return (
    <Show
      when={displayedTabs().length > 0}
      fallback={
        <EmptyState
          title="No matching tabs"
          description="Try a different query or switch search scope"
        />
      }
    >
      <div
        ref={(el) => (containerRef = el)}
        class="at-results-list"
        role="listbox"
        aria-label="Tab search results"
        style={
          shouldVirtualize()
            ? { position: "relative", height: "100%", overflow: "auto" }
            : undefined
        }
      >
        <Show
          when={shouldVirtualize()}
          fallback={
            <For each={displayedTabs()}>
              {(tab, idx) => {
                const isSelected = () => idx() === props.selectedIndex;
                const domainColor = () => props.domainColors[tab.domain];
                return (
                  <TabRow
                    tab={tab}
                    selected={isSelected()}
                    query={props.query}
                    domainColor={domainColor()}
                    activeTabId={props.activeTabId}
                    focusedWindowId={props.focusedWindowId}
                    isMultiWindow={isMultiWindow()}
                    isLeaving={Boolean(props.leavingTabIds?.has(tab.id))}
                    isStaged={Boolean(props.stagedTabIds?.has(tab.id))}
                    onToggleStage={props.onToggleStageTab}
                    rowRef={(el) => {
                      if (el) rowElements.set(idx(), el);
                      else rowElements.delete(idx());
                    }}
                    onClick={() => props.onSelectTab(tab)}
                    onMouseEnter={() => props.onHoverTab?.(idx())}
                  />
                );
              }}
            </For>
          }
        >
          <div style={{ height: `${displayedTabs().length * ROW_HEIGHT}px`, position: "relative" }}>
            <div
              style={{
                position: "absolute",
                top: `${virtualRange().start * ROW_HEIGHT}px`,
                left: "0",
                right: "0",
              }}
            >
              <For each={virtualTabs()}>
                {({ tab, idx }) => {
                  const isSelected = () => idx === props.selectedIndex;
                  const domainColor = () => props.domainColors[tab.domain];
                  return (
                    <div style={{ height: `${ROW_HEIGHT}px` }}>
                      <TabRow
                        tab={tab}
                        selected={isSelected()}
                        query={props.query}
                        domainColor={domainColor()}
                        activeTabId={props.activeTabId}
                        focusedWindowId={props.focusedWindowId}
                        isMultiWindow={isMultiWindow()}
                        isLeaving={Boolean(props.leavingTabIds?.has(tab.id))}
                        isStaged={Boolean(props.stagedTabIds?.has(tab.id))}
                        onToggleStage={props.onToggleStageTab}
                        rowRef={(el) => {
                          if (el) rowElements.set(idx, el);
                          else rowElements.delete(idx);
                        }}
                        onClick={() => props.onSelectTab(tab)}
                        onMouseEnter={() => props.onHoverTab?.(idx)}
                      />
                    </div>
                  );
                }}
              </For>
            </div>
          </div>
        </Show>
      </div>
    </Show>
  );
};
