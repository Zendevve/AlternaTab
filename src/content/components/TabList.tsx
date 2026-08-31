import { type Component, createEffect, For, Show } from "solid-js";
import type { TabItem } from "../../types/models";
import { EmptyState } from "./EmptyState";
import { TabRow } from "./TabRow";

interface TabListProps {
  tabs: TabItem[];
  selectedIndex: number;
  query: string;
  domainColors: Record<string, string>;
  activeTabId?: number;
  onSelectTab: (tab: TabItem) => void;
  maxRenderedItems: number;
}

export const TabList: Component<TabListProps> = (props) => {
  const rowElements: Map<number, HTMLDivElement> = new Map();

  const displayedTabs = () => props.tabs.slice(0, props.maxRenderedItems);

  createEffect(() => {
    const idx = props.selectedIndex;
    const el = rowElements.get(idx);
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
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
      <div class="at-results-list" role="listbox" aria-label="Tab search results">
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
                rowRef={(el) => {
                  if (el) rowElements.set(idx(), el);
                  else rowElements.delete(idx());
                }}
                onClick={() => props.onSelectTab(tab)}
              />
            );
          }}
        </For>
      </div>
    </Show>
  );
};
