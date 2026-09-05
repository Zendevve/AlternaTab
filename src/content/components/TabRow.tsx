import { type Component, createEffect, createSignal, For, onCleanup, Show } from "solid-js";
import type { TabItem } from "../../types/models";
import { highlightText } from "../../utils/search";
import { sendMessage } from "../../types/protocol";

interface TabRowProps {
  tab: TabItem;
  selected: boolean;
  query: string;
  domainColor?: string;
  onClick: () => void;
  onMouseEnter?: () => void;
  rowRef?: (el: HTMLDivElement) => void;
  activeTabId?: number;
  focusedWindowId?: number;
  isMultiWindow?: boolean;
  isLeaving?: boolean;
  isStaged?: boolean;
  onToggleStage?: (tabId: number) => void;
}

export const TabRow: Component<TabRowProps> = (props) => {
  const titleParts = () => highlightText(props.tab.title, props.query);
  const domainParts = () => highlightText(props.tab.domain, props.query);
  const [iconSrc, setIconSrc] = createSignal<string | null>(props.tab.favIconUrl ?? null);
  const [iconFailed, setIconFailed] = createSignal(false);
  const [retryCount, setRetryCount] = createSignal(0);
  const [proxyUrl, setProxyUrl] = createSignal<string | null>(null);
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let proxyAttempted = false;

  const clearRetryTimer = () => {
    if (retryTimer !== undefined) {
      clearTimeout(retryTimer);
      retryTimer = undefined;
    }
  };

  onCleanup(clearRetryTimer);

  createEffect(() => {
    props.tab.id;
    props.tab.favIconUrl;
    clearRetryTimer();
    setRetryCount(0);
    setIconFailed(false);
    setProxyUrl(null);
    proxyAttempted = false;
    setIconSrc(props.tab.favIconUrl ?? null);
  });

  const effectiveSrc = () => proxyUrl() ?? iconSrc();

  const tryProxy = () => {
    if (proxyAttempted) return;
    const url = props.tab.favIconUrl;
    if (!url) {
      setIconFailed(true);
      return;
    }
    proxyAttempted = true;
    sendMessage("fetchFavicon", { url })
      .then((res) => {
        if (res?.dataUrl) {
          setProxyUrl(res.dataUrl);
        } else {
          setIconFailed(true);
        }
      })
      .catch(() => setIconFailed(true));
  };

  const showOtherWindow = () =>
    Boolean(
      props.isMultiWindow && props.focusedWindowId && props.tab.windowId !== props.focusedWindowId,
    );

  return (
    <div
      ref={props.rowRef}
      class={`at-row ${props.selected && !props.isLeaving ? "at-selected" : ""} ${props.isLeaving ? "at-row-leaving at-leaving" : ""} ${props.isStaged ? "at-row-staged" : ""}`.trim()}
      data-tab-id={props.tab.id}
      data-tab-domain={props.tab.domain}
      on:click={(e: MouseEvent) => {
        e.stopPropagation();
        props.onClick();
      }}
      on:mouseenter={props.onMouseEnter}
      aria-selected={props.selected ? "true" : "false"}
      tabIndex={props.selected ? 0 : -1}
    >
      <div class="at-row-icon-wrap">
        <div class="at-row-icon">
          <Show
            when={effectiveSrc() && !iconFailed()}
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
              src={effectiveSrc() ?? ""}
              alt=""
              class="at-favicon"
              referrerPolicy="no-referrer"
              onError={() => {
                const attempt = retryCount();
                const url = props.tab.favIconUrl;
                if (!url) {
                  setIconFailed(true);
                  return;
                }
                if (attempt < 3) {
                  const delay = 500 * 2 ** attempt;
                  clearRetryTimer();
                  retryTimer = setTimeout(() => {
                    setRetryCount(attempt + 1);
                    setIconSrc(`${url}${url.includes("?") ? "&" : "?"}r=${attempt + 1}`);
                  }, delay);
                  return;
                }
                tryProxy();
              }}
              onLoad={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                if (img.naturalWidth === 0 || img.naturalHeight === 0) {
                  const attempt = retryCount();
                  const url = props.tab.favIconUrl;
                  if (!url) {
                    setIconFailed(true);
                    return;
                  }
                  if (attempt < 3) {
                    const delay = 500 * 2 ** attempt;
                    clearRetryTimer();
                    retryTimer = setTimeout(() => {
                      setRetryCount(attempt + 1);
                      setIconSrc(`${url}${url.includes("?") ? "&" : "?"}r=${attempt + 1}`);
                    }, delay);
                    return;
                  }
                  tryProxy();
                }
              }}
            />
          </Show>
        </div>
        <div
          class={`at-row-stage-check ${props.isStaged ? "at-staged-active" : ""}`}
          title={props.isStaged ? "Unstage tab (Space)" : "Stage tab (Space)"}
          on:click={(e: MouseEvent) => {
            e.stopPropagation();
            props.onToggleStage?.(props.tab.id);
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
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
