import { delegateEvents, render } from "solid-js/web";
import overlayCss from "../assets/styles/overlay.css?raw";
import { App } from "./App";

let overlayHost: HTMLDivElement | null = null;
let disposeApp: (() => void) | null = null;

function getFontUrl(): string {
  const candidate = "/assets/InterVariable.woff2";
  try {
    const g = globalThis as unknown as Record<string, unknown>;
    const chromeRT =
      g["chrome"] && typeof g["chrome"] === "object" && "runtime" in (g["chrome"] as Record<string, unknown>)
        ? (g["chrome"] as Record<string, unknown>)["runtime"]
        : undefined;
    const browserRT =
      g["browser"] && typeof g["browser"] === "object" && "runtime" in (g["browser"] as Record<string, unknown>)
        ? (g["browser"] as Record<string, unknown>)["runtime"]
        : undefined;
    const rt = (chromeRT as { getURL?: (p: string) => string } | undefined)?.getURL
      ? (chromeRT as { getURL: (p: string) => string })
      : (browserRT as { getURL?: (p: string) => string } | undefined)?.getURL
        ? (browserRT as { getURL: (p: string) => string })
        : undefined;
    if (rt) return rt.getURL(candidate);
  } catch {}
  return candidate;
}
const fontFaceCss = `
@font-face {
  font-family: "Inter Variable";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url("${getFontUrl()}") format("woff2-variations"),
       url("${getFontUrl()}") format("woff2");
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
