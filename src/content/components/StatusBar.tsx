import { type Component, For, Show } from "solid-js";
import type { KeyboardProfile } from "../../types/models";

interface StatusBarProps {
  profile: KeyboardProfile;
  itemCount?: number;
}

export const StatusBar: Component<StatusBarProps> = (props) => {
  const hints = () => {
    switch (props.profile) {
      case "vim":
        return [
          { key: "j/k", label: "navigate" },
          { key: "↵", label: "open" },
          { key: "d", label: "close" },
          { key: "p", label: "pin" },
          { key: "m", label: "mute" },
          { key: "Esc", label: "exit" },
        ];
      case "emacs":
        return [
          { key: "C-n/p", label: "navigate" },
          { key: "↵", label: "open" },
          { key: "C-w", label: "close" },
          { key: "C-g", label: "exit" },
        ];
      default:
        return [
          { key: "↑↓", label: "navigate" },
          { key: "↵", label: "open" },
          { key: "Tab", label: "scope" },
          { key: "Ctrl+↵", label: "window" },
          { key: "Esc", label: "close" },
        ];
    }
  };

  return (
    <div class="at-statusbar">
      <div class="at-statusbar-hints">
        <For each={hints()}>
          {(hint) => (
            <span>
              <kbd class="at-kbd">{hint.key}</kbd>
              {hint.label}
            </span>
          )}
        </For>
      </div>
      <div>
        <Show when={props.profile !== "standard"}>
          <span class="at-badge" style={{ "margin-right": "8px" }}>
            {props.profile.toUpperCase()}
          </span>
        </Show>
        <Show when={props.itemCount !== undefined && props.itemCount > 0}>
          <span>
            {props.itemCount} {props.itemCount === 1 ? "tab" : "tabs"}
          </span>
        </Show>
      </div>
    </div>
  );
};
