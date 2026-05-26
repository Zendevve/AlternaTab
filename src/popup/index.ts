import { StorageManager, UserSettings } from "../shared/storage";

// DOM controls mapping
const trackedCountLabel = document.getElementById("trackedCount") as HTMLSpanElement;

const themeButtons = document.querySelectorAll("#themeGroup .toggle-btn");
const layoutButtons = document.querySelectorAll("#layoutGroup .toggle-btn");

const openOptionsBtn = document.getElementById("openOptionsBtn") as HTMLButtonElement;
const openShortcutsBtn = document.getElementById("openShortcutsBtn") as HTMLButtonElement;

/**
 * Renders settings active states on toggle button elements
 */
function renderActiveButtons(buttons: NodeListOf<Element>, activeValue: string) {
  buttons.forEach((btn) => {
    if (btn.getAttribute("data-value") === activeValue) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

/**
 * Loads current settings and statistics to update popup UI
 */
async function initPopup() {
  try {
    // 1. Fetch current settings and style active buttons
    const settings = await StorageManager.getSettings();
    renderActiveButtons(themeButtons, settings.theme);
    renderActiveButtons(layoutButtons, settings.cardLayout);

    // 2. Fetch normal MRU history length and display count
    const normalHistory = await StorageManager.getMRUHistory(false);
    trackedCountLabel.textContent = `${normalHistory.length} tab${normalHistory.length === 1 ? "" : "s"}`;
  } catch (error) {
    console.error("Failed to initialize popup:", error);
  }
}

/**
 * Saves updated single setting field and re-renders popup
 */
async function updateSettingField<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
  try {
    const settings = await StorageManager.getSettings();
    settings[key] = value;
    await StorageManager.saveSettings(settings);
    
    if (key === "theme") {
      renderActiveButtons(themeButtons, value as string);
    } else if (key === "cardLayout") {
      renderActiveButtons(layoutButtons, value as string);
    }
  } catch (error) {
    console.error("Failed to update setting:", error);
  }
}

// Attach Event Listeners on DOM Load
document.addEventListener("DOMContentLoaded", () => {
  initPopup();

  // Theme quick-change event listeners
  themeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const themeVal = btn.getAttribute("data-value") as "auto" | "light" | "dark";
      updateSettingField("theme", themeVal);
    });
  });

  // Card layout quick-change event listeners
  layoutButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const layoutVal = btn.getAttribute("data-value") as "grid" | "list";
      updateSettingField("cardLayout", layoutVal);
    });
  });

  // Open full Options settings dashboard
  openOptionsBtn.addEventListener("click", () => {
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      console.warn("chrome.runtime.openOptionsPage is not available. Emulating action.");
      window.open("../options/index.html", "_blank");
    }
  });

  // Redirect to chrome keyboard settings triggers
  openShortcutsBtn.addEventListener("click", () => {
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
    } else {
      console.warn("chrome.tabs.create is not available. Emulating action redirect.");
      window.open("chrome://extensions/shortcuts", "_blank");
    }
  });
});
