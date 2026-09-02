import { type Component, createEffect, For, Show } from "solid-js";
import type { WindowItem } from "../../types/models";
import { highlightText } from "../../utils/search";
import { EmptyState } from "./EmptyState";

interface WindowsListProps {
  items: WindowItem[];
  selectedIndex: number;
  query: string;
  maxRenderedItems: number;
  onSelect: (item: WindowItem) => void;
  onHover?: (idx: number) => void;
  rowRef?: (idx: number, el: HTMLDivElement) => void;
}

export const WindowsList: Component<WindowsListProps> = (props) => {
  const rowElements = new Map<number, HTMLDivElement>();
  createEffect(() => {
    const el = rowElements.get(props.selectedIndex);
    if (el) el.scrollIntoView({ block: "nearest" });
  });
  const displayed = () => props.items.slice(0, props.maxRenderedItems);
  return (
    <Show when={displayed().length > 0} fallback={<EmptyState title="No matching windows" description="Try :w with a different query" />}>
      <div class="at-results-list" role="listbox" aria-label="Windows">
        <For each={displayed()}>
          {(item, idx) => {
            const isSelected = () => idx() === props.selectedIndex;
            const titleParts = () => highlightText(item.title ?? `Window ${item.id}`, props.query);
            return (
              <div
                ref={(el) => {
                  if (el) rowElements.set(idx(), el);
                  else rowElements.delete(idx());
                  props.rowRef?.(idx(), el);
                }}
                class={`at-row ${isSelected() ? "at-selected" : ""}`}
                on:click={() => props.onSelect(item)}
                on:mouseenter={() => props.onHover?.(idx())}
                role="option"
                aria-selected={isSelected()}
              >
                <div class="at-row-icon"><span style={{ "font-size": "12px" }}>🗔</span></div>
                <div class="at-row-main">
                  <div class="at-row-title"><For each={titleParts()}>{(p) => <span class={p.highlight ? "at-highlight" : ""}>{p.text}</span>}</For></div>
                  <div class="at-row-sub"><span class="at-row-meta">{item.tabCount} tabs {item.focused ? "• focused" : ""} {item.incognito ? "• incognito" : ""}</span></div>
                </div>
                <div class="at-row-badges"><span class="at-badge">Window</span></div>
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );
};
