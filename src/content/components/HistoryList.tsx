import { type Component, createEffect, For, Show } from "solid-js";
import type { HistoryItem } from "../../types/models";
import { highlightText } from "../../utils/search";
import { EmptyState } from "./EmptyState";

interface HistoryListProps {
  items: HistoryItem[];
  selectedIndex: number;
  query: string;
  maxRenderedItems: number;
  onSelect: (item: HistoryItem) => void;
  onHover?: (idx: number) => void;
  rowRef?: (idx: number, el: HTMLDivElement) => void;
}

export const HistoryList: Component<HistoryListProps> = (props) => {
  const rowElements = new Map<number, HTMLDivElement>();
  createEffect(() => {
    const el = rowElements.get(props.selectedIndex);
    if (el) el.scrollIntoView({ block: "nearest" });
  });
  const displayed = () => props.items.slice(0, props.maxRenderedItems);
  return (
    <Show when={displayed().length > 0} fallback={<EmptyState title="No matching history" description={`No history matching "${props.query}" — try :h ${props.query} with quotes "exact" or check !bangs`} />}>
      <div class="at-results-list" role="listbox" aria-label="History">
        <For each={displayed()}>
          {(item, idx) => {
            const isSelected = () => idx() === props.selectedIndex;
            const titleParts = () => highlightText(item.title, props.query);
            const domainParts = () => highlightText(item.domain, props.query);
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
                    <title>History icon</title>
                    <circle cx="12" cy="12" r="9" />
                    <polyline points="12 7 12 12 15 14" />
                  </svg>
                </div>
                <div class="at-row-main">
                  <div class="at-row-title">
                    <For each={titleParts()}>{(p) => <span class={p.highlight ? "at-highlight" : ""}>{p.text}</span>}</For>
                  </div>
                  <div class="at-row-sub">
                    <span class="at-row-domain">
                      <For each={domainParts()}>{(p) => <span class={p.highlight ? "at-highlight" : ""}>{p.text}</span>}</For>
                    </span>
                    <Show when={item.visitCount}><span class="at-row-meta">{item.visitCount} visits</span></Show>
                  </div>
                </div>
                <div class="at-row-badges"><span class="at-badge">History</span></div>
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );
};
