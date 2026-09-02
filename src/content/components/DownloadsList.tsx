import { type Component, createEffect, For, Show } from "solid-js";
import type { DownloadItem } from "../../types/models";
import { highlightText } from "../../utils/search";
import { EmptyState } from "./EmptyState";

interface DownloadsListProps {
  items: DownloadItem[];
  selectedIndex: number;
  query: string;
  maxRenderedItems: number;
  onSelect: (item: DownloadItem) => void;
  onHover?: (idx: number) => void;
  rowRef?: (idx: number, el: HTMLDivElement) => void;
}

export const DownloadsList: Component<DownloadsListProps> = (props) => {
  const rowElements = new Map<number, HTMLDivElement>();
  createEffect(() => {
    const el = rowElements.get(props.selectedIndex);
    if (el) el.scrollIntoView({ block: "nearest" });
  });
  const displayed = () => props.items.slice(0, props.maxRenderedItems);
  return (
    <Show when={displayed().length > 0} fallback={<EmptyState title="No matching downloads" description="Try a different query or clear :d" />}>
      <div class="at-results-list" role="listbox" aria-label="Downloads">
        <For each={displayed()}>
          {(item, idx) => {
            const isSelected = () => idx() === props.selectedIndex;
            const titleParts = () => highlightText(item.filename, props.query);
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
                    <title>Download icon</title>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </div>
                <div class="at-row-main">
                  <div class="at-row-title"><For each={titleParts()}>{(p) => <span class={p.highlight ? "at-highlight" : ""}>{p.text}</span>}</For></div>
                  <div class="at-row-sub">
                    <span class="at-row-domain">{item.domain}</span>
                    <span class="at-row-meta">{item.state ?? ""}</span>
                  </div>
                </div>
                <div class="at-row-badges"><span class="at-badge">Download</span></div>
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );
};
