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
                <div class="at-row-icon"><span style={{ "font-size": "12px" }}>◈</span></div>
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
