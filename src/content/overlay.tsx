import { delegateEvents, render } from "solid-js/web";
import interVariableUrl from "../assets/fonts/InterVariable.woff2?url";
import overlayCss from "../assets/styles/overlay.css?raw";
import { App } from "./App";

let overlayHost: HTMLDivElement | null = null;
let disposeApp: (() => void) | null = null;

// Self-host Inter Variable so the HUD renders with a consistent typeface
// regardless of the user's installed system fonts. The woff2 is OFL-licensed
// (https://github.com/rsms/inter). injected via @font-face into the shadow
// stylesheet so it is fully scoped to the HUD and never leaks to the host page.
const fontFaceCss = `
@font-face {
  font-family: "Inter Variable";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url("${interVariableUrl}") format("woff2-variations"),
       url("${interVariableUrl}") format("woff2");
}
`;

export function mountOverlay(): { host: HTMLDivElement; shadow: ShadowRoot } {
  if (overlayHost) {
    const existingShadow = overlayHost.shadowRoot as unknown as ShadowRoot;
    return { host: overlayHost, shadow: existingShadow };
  }

  const host = document.createElement("div");
  host.id = "alternatab-host";
  host.style.cssText = `
    all: initial;
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    pointer-events: none;
    display: none;
  `;

  const shadow = host.attachShadow({ mode: "open" });

  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(fontFaceCss + overlayCss);
    shadow.adoptedStyleSheets = [sheet];
  } catch {
    const styleEl = document.createElement("style");
    styleEl.textContent = fontFaceCss + overlayCss;
    shadow.appendChild(styleEl);
  }

  delegateEvents(
    ["click", "mousedown", "mouseup", "keydown", "input"],
    shadow as unknown as Document,
  );

  let savedBodyOverflow = "";
  const setHostVisible = (isVisible: boolean) => {
    if (isVisible) {
      host.style.display = "block";
      host.style.pointerEvents = "auto";
      if (document.body) {
        savedBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
      }
    } else {
      host.style.display = "none";
      host.style.pointerEvents = "none";
      if (document.body) {
        document.body.style.overflow = savedBodyOverflow;
      }
    }
  };

  disposeApp = render(() => <App onVisibilityChange={setHostVisible} />, shadow);

  document.documentElement.appendChild(host);
  overlayHost = host;

  return { host, shadow };
}

export function unmountOverlay(): void {
  if (disposeApp) {
    disposeApp();
    disposeApp = null;
  }
  if (overlayHost?.parentNode) {
    overlayHost.parentNode.removeChild(overlayHost);
    overlayHost = null;
  }
}
