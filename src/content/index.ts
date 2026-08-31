import { mountOverlay } from "./overlay";

export function initContentScript(): void {
  if (typeof document === "undefined" || !document.documentElement) {
    return;
  }

  // Prevent multiple injections
  if (document.getElementById("alternatab-host")) {
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        mountOverlay();
      },
      { once: true },
    );
  } else {
    mountOverlay();
  }
}

// Auto-run when injected into webpage
initContentScript();
