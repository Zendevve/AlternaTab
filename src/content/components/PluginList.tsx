import { type Component, createEffect, For, Show } from "solid-js";
import type { PluginResultItem } from "../../types/models";
import { highlightText } from "../../utils/search";
import { EmptyState } from "./EmptyState";

interface PluginListProps {
  items: PluginResultItem[];
  selectedIndex: number;
  query: string;
  prefix: string;
  maxRenderedItems: number;
  onSelect: (item: PluginResultItem) => void;
  onHover?: (idx: number) => void;
  rowRef?: (idx: number, el: HTMLDivElement) => void;
}

export const PluginList: Component<PluginListProps> = (props) => {
  const rowElements = new Map<number, HTMLDivElement>();
  createEffect(() => {
    const el = rowElements.get(props.selectedIndex);
    if (el) el.scrollIntoView({ block: "nearest" });
  });
  const displayed = () => props.items.slice(0, props.maxRenderedItems);
  return (
    <Show when={displayed().length > 0} fallback={<EmptyState title={`No results for ${props.prefix}`} description={`Plugin "${props.prefix}" returned no matches`} />}>
      <div class="at-results-list" role="listbox" aria-label={`Plugin ${props.prefix}`}>
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
                    <title>Plugin icon</title>
                    <path d="M12 2L14.4 7.6L20 10L14.4 12.4L12 18L9.6 12.4L4 10L9.6 7.6L12 2Z" />
                  </svg>
                </div>
                <div class="at-row-main">
                  <div class="at-row-title">
                    <For each={titleParts()}>{(p) => <span class={p.highlight ? "at-highlight" : ""}>{p.text}</span>}</For>
                  </div>
                  <div class="at-row-sub">
                    <Show when={item.domain}><span class="at-row-domain">{item.domain}</span></Show>
                    <Show when={item.subtitle}><span class="at-row-meta">{item.subtitle}</span></Show>
                  </div>
                </div>
                <div class="at-row-badges"><span class="at-badge">Plugin:{props.prefix}</span></div>
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );
};
