import { render } from "solid-js/web";
import overlayCss from "../assets/styles/overlay.css?raw";
import { App } from "./App";

let overlayHost: HTMLDivElement | null = null;
let disposeApp: (() => void) | null = null;

export function mountOverlay(): { host: HTMLDivElement; shadow: ShadowRoot } {
  if (overlayHost) {
    return {
      host: overlayHost,
      shadow: overlayHost.shadowRoot as unknown as ShadowRoot,
    };
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

  const shadow = host.attachShadow({ mode: "closed" });

  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(overlayCss);
    shadow.adoptedStyleSheets = [sheet];
  } catch {
    const styleEl = document.createElement("style");
    styleEl.textContent = overlayCss;
    shadow.appendChild(styleEl);
  }

  const setHostVisible = (isVisible: boolean) => {
    if (isVisible) {
      host.style.display = "block";
      host.style.pointerEvents = "auto";
    } else {
      host.style.display = "none";
      host.style.pointerEvents = "none";
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
