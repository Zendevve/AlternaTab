import { TabInfo } from "../shared/adapter";
import { UserSettings } from "../shared/storage";

export class KeyHandler {
  public activeSelectionIndex = 0;
  public tabs: TabInfo[] = [];
  public settings: UserSettings | null = null;
  public isAltHeld = false;
  public isOpen = false;

  private onSwitch: (tabId: number, windowId: number) => void;
  private onDismiss: () => void;
  private onRender: (tabs: TabInfo[], activeIndex: number) => void;

  // Track bound event listener references for clean removals
  private boundKeyDown = this.handleKeyDown.bind(this);
  private boundKeyUp = this.handleKeyUp.bind(this);
  private boundBlur = this.handleBlur.bind(this);

  constructor(options: {
    onSwitch: (tabId: number, windowId: number) => void;
    onDismiss: () => void;
    onRender: (tabs: TabInfo[], activeIndex: number) => void;
  }) {
    this.onSwitch = options.onSwitch;
    this.onDismiss = options.onDismiss;
    this.onRender = options.onRender;
  }

  public open(tabs: TabInfo[], settings: UserSettings): void {
    this.tabs = tabs;
    this.settings = settings;
    this.isOpen = true;
    this.isAltHeld = true; // Assumed true on hotkey trigger start

    // Standard Alt+Tab behavior: preselect index 1 (the last active tab), wrapping to index 0 if only 1 tab exists
    this.activeSelectionIndex = tabs.length > 1 ? 1 : 0;

    // Bind event listeners globally
    window.addEventListener("keydown", this.boundKeyDown, true);
    window.addEventListener("keyup", this.boundKeyUp, true);
    window.addEventListener("blur", this.boundBlur, true);

    this.triggerRender();
  }

  public close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.isAltHeld = false;

    // Unbind listeners cleanly
    window.removeEventListener("keydown", this.boundKeyDown, true);
    window.removeEventListener("keyup", this.boundKeyUp, true);
    window.removeEventListener("blur", this.boundBlur, true);
  }

  public cycleSelection(offset: number): void {
    if (this.tabs.length === 0) return;
    const len = this.tabs.length;
    // Modulo wrapping that handles negative values correctly
    this.activeSelectionIndex = (this.activeSelectionIndex + offset + len) % len;
    this.triggerRender();
  }

  public setSelectionIndex(index: number): void {
    if (index >= 0 && index < this.tabs.length) {
      this.activeSelectionIndex = index;
      this.triggerRender();
    }
  }

  public confirmSelection(): void {
    if (this.tabs.length === 0) {
      this.onDismiss();
      return;
    }
    const selectedTab = this.tabs[this.activeSelectionIndex];
    if (selectedTab) {
      this.onSwitch(selectedTab.id, selectedTab.windowId);
    } else {
      this.onDismiss();
    }
  }

  private triggerRender(): void {
    this.onRender(this.tabs, this.activeSelectionIndex);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.isOpen) return;

    // 1. Esc: instant cancel/dismiss
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      this.onDismiss();
      return;
    }

    // 2. Enter / Space: confirm selection
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      this.confirmSelection();
      return;
    }

    // 3. Tab cycling or Alt+Q cycling
    // Match "Tab" (standard OS style) or "q"/"Q" (default extension key) while Alt is held
    const isTabCycle = e.key === "Tab";
    const isQCycle = e.key === "q" || e.key === "Q";

    if ((isTabCycle || isQCycle) && e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) {
        this.cycleSelection(-1);
      } else {
        this.cycleSelection(1);
      }
      return;
    }

    // 4. Directional Arrow Keys Navigation
    if (e.key.startsWith("Arrow")) {
      e.preventDefault();
      e.stopPropagation();

      const layout = this.settings?.cardLayout || "grid";
      if (layout === "list") {
        if (e.key === "ArrowUp") {
          this.cycleSelection(-1);
        } else if (e.key === "ArrowDown") {
          this.cycleSelection(1);
        }
      } else {
        // Grid Layout: 3 columns layout
        const cols = 3;
        const total = this.tabs.length;
        if (e.key === "ArrowUp") {
          // Move up 1 row (-3)
          this.cycleSelection(-cols);
        } else if (e.key === "ArrowDown") {
          // Move down 1 row (+3)
          this.cycleSelection(cols);
        } else if (e.key === "ArrowLeft") {
          // Move left (-1)
          this.cycleSelection(-1);
        } else if (e.key === "ArrowRight") {
          // Move right (+1)
          this.cycleSelection(1);
        }
      }
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (!this.isOpen) return;

    if (e.key === "Alt") {
      this.isAltHeld = false;
      // In hold mode, releasing Alt immediately triggers tab selection switch
      if (this.settings?.activationMode === "hold") {
        this.confirmSelection();
      }
    }
  }

  private handleBlur(): void {
    // If the viewport loses focus, immediately dismiss to avoid leaving sticky widgets
    if (this.isOpen) {
      this.onDismiss();
    }
  }
}
