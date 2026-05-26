import { StorageManager, UserSettings } from "../shared/storage";

// DOM elements mapping
const maxVisibleInput = document.getElementById("maxVisible") as HTMLInputElement;
const maxVisibleValue = document.getElementById("maxVisibleValue") as HTMLSpanElement;

const activationModeHold = document.getElementById("activationModeHold") as HTMLInputElement;
const activationModeToggle = document.getElementById("activationModeToggle") as HTMLInputElement;

const themeSelect = document.getElementById("theme") as HTMLSelectElement;

const cardLayoutGrid = document.getElementById("cardLayoutGrid") as HTMLInputElement;
const cardLayoutList = document.getElementById("cardLayoutList") as HTMLInputElement;

const showWindowBadgeInput = document.getElementById("showWindowBadge") as HTMLInputElement;
const configureShortcutsBtn = document.getElementById("configureShortcutsBtn") as HTMLButtonElement;
const toast = document.getElementById("toast") as HTMLDivElement;

let toastTimeout: number | undefined;

/**
 * Loads current settings from StorageManager and populates DOM inputs
 */
async function loadSettings() {
  try {
    const settings = await StorageManager.getSettings();
    
    // populate inputs
    maxVisibleInput.value = settings.maxVisible.toString();
    maxVisibleValue.textContent = settings.maxVisible.toString();

    if (settings.activationMode === "hold") {
      activationModeHold.checked = true;
    } else {
      activationModeToggle.checked = true;
    }

    themeSelect.value = settings.theme;

    if (settings.cardLayout === "grid") {
      cardLayoutGrid.checked = true;
    } else {
      cardLayoutList.checked = true;
    }

    showWindowBadgeInput.checked = settings.showWindowBadge;

    // Apply data-theme to HTML tag for preview styling
    document.documentElement.setAttribute("data-theme", settings.theme);
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
}

/**
 * Reads form DOM inputs and saves them as active UserSettings
 */
async function saveSettings() {
  const currentSettings: UserSettings = {
    maxVisible: parseInt(maxVisibleInput.value, 10),
    activationMode: activationModeHold.checked ? "hold" : "toggle",
    theme: themeSelect.value as "auto" | "light" | "dark",
    cardLayout: cardLayoutGrid.checked ? "grid" : "list",
    showWindowBadge: showWindowBadgeInput.checked
  };

  try {
    await StorageManager.saveSettings(currentSettings);
    
    // Update HTML tag data-theme for immediate style preview updates
    document.documentElement.setAttribute("data-theme", currentSettings.theme);
    
    showToast();
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}

/**
 * Triggers a temporary success notification toast
 */
function showToast() {
  if (toastTimeout) {
    window.clearTimeout(toastTimeout);
  }
  
  toast.classList.add("show");
  
  toastTimeout = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

// Attach Event Listeners on DOM Load
document.addEventListener("DOMContentLoaded", () => {
  loadSettings();

  // Slider update indicator
  maxVisibleInput.addEventListener("input", () => {
    maxVisibleValue.textContent = maxVisibleInput.value;
  });

  // Range Slider change listener
  maxVisibleInput.addEventListener("change", saveSettings);

  // Radio button click listeners
  activationModeHold.addEventListener("change", saveSettings);
  activationModeToggle.addEventListener("change", saveSettings);
  cardLayoutGrid.addEventListener("change", saveSettings);
  cardLayoutList.addEventListener("change", saveSettings);

  // Select theme change listener
  themeSelect.addEventListener("change", saveSettings);

  // Checkbox toggle listener
  showWindowBadgeInput.addEventListener("change", saveSettings);

  // Redirect to chrome keyboard settings triggers
  configureShortcutsBtn.addEventListener("click", () => {
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
    } else {
      console.warn("chrome.tabs.create is not available. Emulating action redirect.");
      window.open("chrome://extensions/shortcuts", "_blank");
    }
  });
});
