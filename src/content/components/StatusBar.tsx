import { type Component, For, Show } from "solid-js";
import type { KeyboardProfile } from "../../types/models";

interface StatusBarProps {
  profile: KeyboardProfile;
}

export const StatusBar: Component<StatusBarProps> = (props) => {
  const hints = () => {
    switch (props.profile) {
      case "vim":
        return [
          { key: "j/k", label: "navigate" },
          { key: "Enter/o", label: "open" },
          { key: "d/x", label: "close" },
          { key: "p", label: "pin" },
          { key: "m", label: "mute" },
          { key: "Esc", label: "exit" },
        ];
      case "emacs":
        return [
          { key: "C-n/p", label: "navigate" },
          { key: "Enter", label: "open" },
          { key: "C-w", label: "close" },
          { key: "C-g", label: "exit" },
        ];
      default:
        return [
          { key: "↑↓", label: "navigate" },
          { key: "Enter", label: "open" },
          { key: "Tab", label: "scope" },
          { key: "Ctrl+Enter", label: "new window" },
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
          <span class="at-badge">Mode: {props.profile.toUpperCase()}</span>
        </Show>
      </div>
    </div>
  );
};
