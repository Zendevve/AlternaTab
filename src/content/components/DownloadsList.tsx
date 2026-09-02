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
                <div class="at-row-icon"><span style={{ "font-size": "12px" }}>⬇</span></div>
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
