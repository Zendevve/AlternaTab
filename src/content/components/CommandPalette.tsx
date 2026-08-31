import { type Component, For, Show } from "solid-js";
import type { CommandItem } from "../../types/models";
import { highlightText } from "../../utils/search";
import { EmptyState } from "./EmptyState";

interface CommandPaletteProps {
  commands: CommandItem[];
  selectedIndex: number;
  query: string;
  onSelect: (cmd: CommandItem) => void;
  onHoverCommand?: (index: number) => void;
  rowRef?: (index: number, el: HTMLDivElement) => void;
}

export const CommandPalette: Component<CommandPaletteProps> = (props) => {
  return (
    <Show
      when={props.commands.length > 0}
      fallback={
        <EmptyState title="No matching commands" description="No commands match your query" />
      }
    >
      <div class="at-results-list" role="listbox" aria-label="Available commands">
        <For each={props.commands}>
          {(cmd, idx) => {
            const isSelected = () => idx() === props.selectedIndex;
            const parts = () => highlightText(cmd.title, props.query);

            return (
              <div
                ref={(el) => props.rowRef?.(idx(), el)}
                class={`at-row ${isSelected() ? "at-selected" : ""}`}
                on:click={(e: MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  props.onSelect(cmd);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  props.onSelect(cmd);
                }}
                on:mouseenter={() => props.onHoverCommand?.(idx())}
                onMouseEnter={() => props.onHoverCommand?.(idx())}
                role="option"
                aria-selected={isSelected()}
                tabIndex={isSelected() ? 0 : -1}
              >
                <div class="at-row-icon">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <title>Command icon</title>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
                <div class="at-row-main">
                  <div class="at-row-title">
                    <For each={parts()}>
                      {(part) => (
                        <span class={part.highlight ? "at-highlight" : ""}>{part.text}</span>
                      )}
                    </For>
                  </div>
                  <div class="at-row-sub">
                    <span class="at-badge">{cmd.category}</span>
                  </div>
                </div>
                <Show when={cmd.shortcutHint}>
                  <div class="at-row-badges">
                    <kbd class="at-kbd">{cmd.shortcutHint}</kbd>
                  </div>
                </Show>
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );
};
