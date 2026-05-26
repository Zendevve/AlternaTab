import { TabInfo } from "../shared/adapter";
import { UserSettings } from "../shared/storage";
import { KeyHandler } from "./keyhandler";
import styles from "./overlay.css?inline";

class OverlayController {
  private host: HTMLDivElement | null = null;
  private shadow: ShadowRoot | null = null;
  private backdrop: HTMLDivElement | null = null;
  private container: HTMLDivElement | null = null;
  private listContainer: HTMLDivElement | null = null;
  private keyHandler: KeyHandler;
  private settings: UserSettings | null = null;

  constructor() {
    this.keyHandler = new KeyHandler({
      onSwitch: (tabId, windowId) => this.handleSwitch(tabId, windowId),
      onDismiss: () => this.handleDismiss(),
      onRender: (tabs, activeIndex) => this.render(tabs, activeIndex),
    });

    this.initDOM();
    this.listenToMessages();
  }

  private initDOM(): void {
    // 1. Check if host already exists (prevent duplicate setups)
    const existing = document.getElementById("alternatab-overlay-host");
    if (existing) {
      existing.remove();
    }

    // 2. Create the hidden host container element
    this.host = document.createElement("div");
    this.host.id = "alternatab-overlay-host";
    
    // 3. Attach a closed Shadow DOM
    this.shadow = this.host.attachShadow({ mode: "closed" });

    // 4. Inject compiled CSS style tag
    const styleTag = document.createElement("style");
    styleTag.textContent = styles;
    this.shadow.appendChild(styleTag);

    // 5. Build markup structure
    this.backdrop = document.createElement("div");
    this.backdrop.className = "alternatab-backdrop";

    this.container = document.createElement("div");
    this.container.className = "alternatab-container";

    const header = document.createElement("div");
    header.className = "alternatab-header";

    const title = document.createElement("span");
    title.className = "alternatab-title";
    title.textContent = "Tab Switcher";

    const badge = document.createElement("span");
    badge.className = "alternatab-badge";
    badge.textContent = "Alt + Q to Cycle";

    header.appendChild(title);
    header.appendChild(badge);

    this.listContainer = document.createElement("div");
    this.listContainer.className = "alternatab-list";

    this.container.appendChild(header);
    this.container.appendChild(this.listContainer);
    this.backdrop.appendChild(this.container);
    this.shadow.appendChild(this.backdrop);

    // Inject globally into DOM
    document.body.appendChild(this.host);
  }

  private listenToMessages(): void {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.action === "toggle-switcher") {
        const { tabs, settings } = message as { tabs: TabInfo[]; settings: UserSettings };
        this.settings = settings;

        if (this.keyHandler.isOpen) {
          // If overlay is already open, cycle forward (this is called if global hotkey triggers again)
          this.keyHandler.cycleSelection(1);
        } else {
          // Open new instance
          this.openOverlay(tabs, settings);
        }
        sendResponse({ success: true });
      }
    });
  }

  private openOverlay(tabs: TabInfo[], settings: UserSettings): void {
    if (!this.backdrop || !this.container) return;

    // Resolve system dark scheme if set to auto
    let theme = settings.theme;
    if (theme === "auto") {
      theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    // Configure layout options
    this.container.className = `alternatab-container theme-${theme} layout-${settings.cardLayout}`;

    // Reveal container instantly
    this.backdrop.classList.add("visible");

    // Open KeyHandler state machine
    this.keyHandler.open(tabs, settings);
  }

  private handleSwitch(tabId: number, windowId: number): void {
    this.closeOverlay();
    // Dispatch navigation request back to background worker
    chrome.runtime.sendMessage({
      action: "switch-to-tab",
      tabId,
      windowId,
    });
  }

  private handleDismiss(): void {
    this.closeOverlay();
  }

  private closeOverlay(): void {
    if (this.backdrop) {
      this.backdrop.classList.remove("visible");
    }
    this.keyHandler.close();
  }

  private render(tabs: TabInfo[], activeIndex: number): void {
    const listContainer = this.listContainer;
    const settings = this.settings;
    if (!listContainer || !settings) return;

    // Flush active contents
    listContainer.innerHTML = "";

    // Determine current window reference to display cross-window badges
    const currentWindowId = tabs[0]?.windowId || -1;

    tabs.forEach((tab, index) => {
      const isActive = index === activeIndex;

      const card = document.createElement("div");
      card.className = `alternatab-card${isActive ? " active" : ""}`;
      card.id = `alternatab-card-${tab.id}`;

      // Bind Mouse Handlers for natural high-fidelity hovering
      card.addEventListener("mouseenter", () => {
        this.keyHandler.setSelectionIndex(index);
      });

      card.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.keyHandler.setSelectionIndex(index);
        this.keyHandler.confirmSelection();
      });

      // Render Favicon / Initial letter avatar
      const fav = document.createElement("div");
      fav.className = "alternatab-favicon";

      if (tab.favIconUrl && tab.favIconUrl.startsWith("http")) {
        const img = document.createElement("img");
        img.src = tab.favIconUrl;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "contain";
        img.onerror = () => {
          img.remove();
          fav.textContent = this.getInitial(tab.title);
        };
        fav.appendChild(img);
      } else {
        fav.textContent = this.getInitial(tab.title);
      }

      // Render Details
      const details = document.createElement("div");
      details.className = "alternatab-details";

      const title = document.createElement("div");
      title.className = "alternatab-card-title";
      title.textContent = tab.title || "Untitled Tab";

      const domain = document.createElement("div");
      domain.className = "alternatab-card-domain";
      domain.textContent = this.getDomain(tab.url);

      details.appendChild(title);
      details.appendChild(domain);

      card.appendChild(fav);
      card.appendChild(details);

      // Render window identity badge for tabs residing in other browser windows
      if (settings.showWindowBadge && tab.windowId !== currentWindowId) {
        const badge = document.createElement("span");
        badge.className = "alternatab-window-badge";
        badge.textContent = `W${tab.windowId}`;
        card.appendChild(badge);
      }

      listContainer.appendChild(card);
    });

    // Smart Scroll: ensure active element is scrolled into view smoothly
    const activeElement = listContainer.children[activeIndex] as HTMLElement;
    if (activeElement) {
      activeElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }

  private getInitial(title: string): string {
    if (!title) return "T";
    const letter = title.trim().charAt(0);
    return letter ? letter.toUpperCase() : "T";
  }

  private getDomain(urlStr: string): string {
    if (!urlStr) return "";
    try {
      const url = new URL(urlStr);
      return url.hostname.replace("www.", "");
    } catch {
      return "";
    }
  }
}

// Instantiate overlay controller singleton on content script initialization
new OverlayController();
