import { type Component, createEffect, For, Show } from "solid-js";
import type { WorkspaceItem } from "../../types/models";
import { highlightText } from "../../utils/search";
import { EmptyState } from "./EmptyState";

interface WorkspacesListProps {
  items: WorkspaceItem[];
  selectedIndex: number;
  query: string;
  maxRenderedItems: number;
  onSelect: (item: WorkspaceItem) => void;
  onDelete?: (item: WorkspaceItem) => void;
  onHover?: (idx: number) => void;
  rowRef?: (idx: number, el: HTMLDivElement) => void;
}

export const WorkspacesList: Component<WorkspacesListProps> = (props) => {
  const rowElements = new Map<number, HTMLDivElement>();
  createEffect(() => {
    const el = rowElements.get(props.selectedIndex);
    if (el) el.scrollIntoView({ block: "nearest" });
  });

  const displayed = () => props.items.slice(0, props.maxRenderedItems);

  return (
    <Show
      when={displayed().length > 0}
      fallback={
        <EmptyState
          title="No saved workspaces"
          description="Save current window as workspace with >save-workspace or :ws"
        />
      }
    >
      <div class="at-results-list" role="listbox" aria-label="Workspaces">
        <For each={displayed()}>
          {(item, idx) => {
            const isSelected = () => idx() === props.selectedIndex;
            const titleParts = () => highlightText(item.name, props.query);
            return (
              <div
                ref={(el) => {
                  if (el) rowElements.set(idx(), el);
                  else rowElements.delete(idx());
                  props.rowRef?.(idx(), el);
                }}
                class={`at-row ${isSelected() ? "at-selected" : ""}`}
                tabIndex={isSelected() ? 0 : -1}
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
                    <title>Workspace icon</title>
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div class="at-row-main">
                  <div class="at-row-title">
                    <For each={titleParts()}>
                      {(p) => <span class={p.highlight ? "at-highlight" : ""}>{p.text}</span>}
                    </For>
                  </div>
                  <div class="at-row-sub">
                    <span class="at-row-meta">
                      {item.tabs.length} {item.tabs.length === 1 ? "tab" : "tabs"} · Stashed{" "}
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div class="at-row-badges">
                  <span class="at-badge">Workspace</span>
                  <Show when={props.onDelete}>
                    <button
                      type="button"
                      class="at-action-pill"
                      title="Delete workspace"
                      style={{
                        margin: "0 0 0 6px",
                        padding: "2px 6px",
                        "font-size": "10px",
                        cursor: "pointer",
                      }}
                      on:click={(e: MouseEvent) => {
                        e.stopPropagation();
                        props.onDelete?.(item);
                      }}
                    >
                      Delete
                    </button>
                  </Show>
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );
};
