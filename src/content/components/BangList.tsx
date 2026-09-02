import { type Component, createEffect, For, Show } from "solid-js";
import type { BangMatchItem } from "../../utils/search/templates";
import { EmptyState } from "./EmptyState";

interface BangListProps {
  items: BangMatchItem[];
  selectedIndex: number;
  query: string;
  onSelectBang: (item: BangMatchItem) => void;
  onHover?: (idx: number) => void;
  rowRef?: (idx: number, el: HTMLDivElement) => void;
}

export const BangList: Component<BangListProps> = (props) => {
  const rowElements = new Map<number, HTMLDivElement>();

  createEffect(() => {
    const el = rowElements.get(props.selectedIndex);
    if (el) el.scrollIntoView({ block: "nearest" });
  });

  return (
    <Show
      when={props.items.length > 0}
      fallback={
        <EmptyState
          title="No matching bangs"
          description="Type ! followed by a site alias (e.g. !gh, !yt, !lb, !cgpt)"
        />
      }
    >
      <div class="at-results-list" role="listbox" aria-label="Bangs Explorer">
        <div
          style={{
            "font-size": "11px",
            color: "var(--at-text-muted)",
            padding: "4px 10px 2px",
            "font-weight": "600",
            "letter-spacing": "0.02em",
            "text-transform": "uppercase",
          }}
        >
          Helium Bangs · {props.items.length} available
        </div>
        <For each={props.items}>
          {(item, idx) => {
            const isSelected = () => idx() === props.selectedIndex;
            return (
              <div
                ref={(el) => {
                  if (el) rowElements.set(idx(), el);
                  else rowElements.delete(idx());
                  props.rowRef?.(idx(), el);
                }}
                class={`at-row ${isSelected() ? "at-selected" : ""}`}
                on:click={() => props.onSelectBang(item)}
                on:mouseenter={() => props.onHover?.(idx())}
                role="option"
                aria-selected={isSelected()}
                tabIndex={isSelected() ? 0 : -1}
              >
                <div class="at-row-icon">
                  <span
                    style={{
                      "font-size": "13px",
                      "font-weight": "700",
                      color: "var(--at-accent)",
                    }}
                  >
                    !
                  </span>
                </div>
                <div class="at-row-main">
                  <div class="at-row-title">{item.template.title}</div>
                  <div class="at-row-sub">
                    <span class="at-row-domain">{item.template.domain || "web"}</span>
                    <span class="at-row-sub-divider" />
                    <span class="at-row-meta">
                      Press Enter to use !{item.matchedAlias}
                    </span>
                  </div>
                </div>
                <div class="at-row-badges" style={{ "flex-wrap": "wrap", "max-width": "40%" }}>
                  <For each={item.allAliases}>
                    {(alias) => {
                      const isMatch = () => alias.toLowerCase() === item.matchedAlias.toLowerCase();
                      return (
                        <span
                          class={`at-badge ${isMatch() ? "at-badge-pinned" : ""}`}
                          style={{
                            "font-family": "monospace",
                            "font-size": "10.5px",
                            padding: "1px 5px",
                          }}
                        >
                          !{alias}
                        </span>
                      );
                    }}
                  </For>
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );
};
