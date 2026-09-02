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
                <div class="at-row-icon">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.75"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <title>Window icon</title>
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="2" y1="8" x2="22" y2="8" />
                    <line x1="6" y1="5.5" x2="6" y2="5.5" stroke-width="2" />
                    <line x1="9" y1="5.5" x2="9" y2="5.5" stroke-width="2" />
                  </svg>
                </div>
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
