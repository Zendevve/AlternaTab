import { type Component, createEffect, For, Show } from "solid-js";
import type { RecentlyClosedItem } from "../../types/models";
import { highlightText } from "../../utils/search";
import { EmptyState } from "./EmptyState";

interface RecentlyClosedListProps {
  items: RecentlyClosedItem[];
  selectedIndex: number;
  query: string;
  maxRenderedItems: number;
  onSelect: (item: RecentlyClosedItem) => void;
  onHover?: (idx: number) => void;
  rowRef?: (idx: number, el: HTMLDivElement) => void;
}

export const RecentlyClosedList: Component<RecentlyClosedListProps> = (props) => {
  const rowElements = new Map<number, HTMLDivElement>();
  createEffect(() => {
    const el = rowElements.get(props.selectedIndex);
    if (el) el.scrollIntoView({ block: "nearest" });
  });
  const displayed = () => props.items.slice(0, props.maxRenderedItems);
  return (
    <Show when={displayed().length > 0} fallback={<EmptyState title="No recently closed" description="Try :c with a different query" />}>
      <div class="at-results-list" role="listbox" aria-label="Recently closed">
        <For each={displayed()}>
          {(item, idx) => {
            const isSelected = () => idx() === props.selectedIndex;
            const titleParts = () => highlightText(item.title, props.query);
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
                    <title>Recently closed icon</title>
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                </div>
                <div class="at-row-main">
                  <div class="at-row-title"><For each={titleParts()}>{(p) => <span class={p.highlight ? "at-highlight" : ""}>{p.text}</span>}</For></div>
                  <div class="at-row-sub"><span class="at-row-domain">{item.domain}</span></div>
                </div>
                <div class="at-row-badges"><span class="at-badge">Closed</span></div>
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );
};
