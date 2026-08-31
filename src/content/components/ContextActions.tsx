import { type Component, For } from "solid-js";
import type { TabItem } from "../../types/models";

export type ContextActionType = "pin" | "mute" | "duplicate" | "move" | "discard" | "close";

export interface ContextActionItem {
  type: ContextActionType;
  label: string;
  hint: string;
}

interface ContextActionsProps {
  tab: TabItem;
  selectedIndex: number;
  onExecute: (action: ContextActionType) => void;
  onHover?: (index: number) => void;
}

export const ContextActions: Component<ContextActionsProps> = (props) => {
  const actions = (): ContextActionItem[] => [
    {
      type: "pin",
      label: props.tab.pinned ? "Unpin Tab" : "Pin Tab",
      hint: "p",
    },
    {
      type: "mute",
      label: props.tab.muted ? "Unmute Tab" : "Mute Tab",
      hint: "m",
    },
    {
      type: "duplicate",
      label: "Duplicate Tab",
      hint: "d",
    },
    {
      type: "move",
      label: "Move to New Window",
      hint: "w",
    },
    {
      type: "discard",
      label: "Suspend Tab (Free Memory)",
      hint: "s",
    },
    {
      type: "close",
      label: "Close Tab",
      hint: "x",
    },
  ];

  return (
    <div class="at-context-actions" role="menu" aria-label="Tab Actions">
      <div class="at-context-title">Actions for {props.tab.title}</div>
      <For each={actions()}>
        {(act, idx) => {
          const isSelected = () => idx() === props.selectedIndex;
          return (
            <div
              class={`at-action-item ${isSelected() ? "at-selected" : ""}`}
              on:click={(e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                props.onExecute(act.type);
              }}
              on:mouseenter={() => props.onHover?.(idx())}
              role="menuitem"
              tabIndex={isSelected() ? 0 : -1}
            >
              <span>{act.label}</span>
              <kbd class="at-kbd">{act.hint}</kbd>
            </div>
          );
        }}
      </For>
    </div>
  );
};
