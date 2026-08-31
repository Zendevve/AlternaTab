import { type Component, For, Show } from "solid-js";
import type { TabItem } from "../../types/models";
import { highlightText } from "../../utils/search";

interface TabRowProps {
  tab: TabItem;
  selected: boolean;
  query: string;
  domainColor?: string;
  onClick: () => void;
  rowRef?: (el: HTMLDivElement) => void;
  activeTabId?: number;
  focusedWindowId?: number;
  isMultiWindow?: boolean;
}

export const TabRow: Component<TabRowProps> = (props) => {
  const titleParts = () => highlightText(props.tab.title, props.query);
  const domainParts = () => highlightText(props.tab.domain, props.query);

  const showOtherWindow = () =>
    Boolean(
      props.isMultiWindow && props.focusedWindowId && props.tab.windowId !== props.focusedWindowId,
    );

  return (
    <div
      ref={props.rowRef}
      class={`at-row ${props.selected ? "at-selected" : ""}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        props.onClick();
      }}
      role="option"
      aria-selected={props.selected}
      tabIndex={props.selected ? 0 : -1}
    >
      <div class="at-row-icon">
        <Show
          when={props.tab.favIconUrl}
          fallback={
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <title>Default tab icon</title>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
            </svg>
          }
        >
          <img
            src={props.tab.favIconUrl}
            alt=""
            class="at-favicon"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </Show>
      </div>

      <div class="at-row-main">
        <div class="at-row-title">
          <For each={titleParts()}>
            {(part) => <span class={part.highlight ? "at-highlight" : ""}>{part.text}</span>}
          </For>
        </div>
        <div class="at-row-sub">
          <Show when={props.domainColor}>
            <span class="at-domain-dot" style={{ "background-color": props.domainColor }} />
          </Show>
          <span class="at-row-domain">
            <For each={domainParts()}>
              {(part) => <span class={part.highlight ? "at-highlight" : ""}>{part.text}</span>}
            </For>
          </span>
          <Show when={showOtherWindow()}>
            <span class="at-row-meta">Other Window</span>
          </Show>
        </div>
      </div>

      <div class="at-row-badges">
        <Show when={props.tab.id === props.activeTabId}>
          <span class="at-badge at-badge-active">Active</span>
        </Show>
        <Show when={props.tab.pinned}>
          <span class="at-badge at-badge-pinned">Pinned</span>
        </Show>
        <Show when={props.tab.audible}>
          <span class="at-badge at-badge-audible">Audible</span>
        </Show>
        <Show when={props.tab.muted}>
          <span class="at-badge">Muted</span>
        </Show>
        <Show when={props.tab.discarded}>
          <span class="at-badge at-badge-discarded">Sleeping</span>
        </Show>
      </div>
    </div>
  );
};
