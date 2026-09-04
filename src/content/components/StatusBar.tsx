import { type Component, For, Show } from "solid-js";
import type { KeyboardProfile } from "../../types/models";

interface StatusBarProps {
  profile: KeyboardProfile;
  itemCount?: number;
  stagedCount?: number;
  onClearStaged?: () => void;
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
      <Show
        when={(props.stagedCount ?? 0) > 0}
        fallback={
          <div class="at-statusbar-hints">
            <For each={hints()}>
              {(hint) => (
                <span class="at-hint">
                  <kbd class="at-kbd">{hint.key}</kbd>
                  <span class="at-hint-label">{hint.label}</span>
                </span>
              )}
            </For>
          </div>
        }
      >
        <div class="at-statusbar-staged-actions">
          <span class="at-badge at-badge-staged">
            ✓ {props.stagedCount} {props.stagedCount === 1 ? "tab" : "tabs"} selected
          </span>
          <span class="at-hint"><kbd class="at-kbd">x</kbd> <span class="at-hint-label">Close</span></span>
          <span class="at-hint"><kbd class="at-kbd">w</kbd> <span class="at-hint-label">Move</span></span>
          <span class="at-hint"><kbd class="at-kbd">s</kbd> <span class="at-hint-label">Sleep</span></span>
          <span class="at-hint"><kbd class="at-kbd">c</kbd> <span class="at-hint-label">Copy</span></span>
          <span class="at-hint"><kbd class="at-kbd">g</kbd> <span class="at-hint-label">Group</span></span>
          <span class="at-hint" style={{ cursor: "pointer" }} onClick={props.onClearStaged}><kbd class="at-kbd">Esc</kbd> <span class="at-hint-label">Clear</span></span>
        </div>
      </Show>
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
