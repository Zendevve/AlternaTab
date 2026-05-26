import { StorageManager } from "../shared/storage";

// Wizard State Management
let currentStep = 1;
const totalSteps = 3;

// Simulated Tab list mock data
const mockTabs = [
  { id: 101, title: "GitHub - Dashboard", domain: "github.com", icon: "🐙" },
  { id: 102, title: "Google Docs - Product Proposal", domain: "docs.google.com", icon: "📝" },
  { id: 103, title: "Chrome Extensions - Keyboard Shortcuts", domain: "chrome://extensions", icon: "⚙️" }
];
let activeSimIndex = 0;
let sandboxMode: "hold" | "toggle" = "hold";

// DOM References
let slide1: HTMLElement;
let slide2: HTMLElement;
let slide3: HTMLElement;
let btnBack: HTMLButtonElement;
let btnNext: HTMLButtonElement;
let dot1: HTMLElement;
let dot2: HTMLElement;
let dot3: HTMLElement;
let progressBar: HTMLElement;
let modeHold: HTMLElement;
let modeToggle: HTMLElement;
let saveToast: HTMLElement;
let btnShortcuts: HTMLButtonElement;
let sandboxElement: HTMLElement;
let simulatedList: HTMLElement;
let switchToast: HTMLElement;

// Initialize elements once DOM loads
document.addEventListener("DOMContentLoaded", async () => {
  slide1 = document.getElementById("slide-1")!;
  slide2 = document.getElementById("slide-2")!;
  slide3 = document.getElementById("slide-3")!;
  btnBack = document.getElementById("btn-back") as HTMLButtonElement;
  btnNext = document.getElementById("btn-next") as HTMLButtonElement;
  dot1 = document.querySelector('[data-step="1"]')!;
  dot2 = document.querySelector('[data-step="2"]')!;
  dot3 = document.querySelector('[data-step="3"]')!;
  progressBar = document.querySelector(".steps-indicator")!;
  modeHold = document.getElementById("mode-hold")!;
  modeToggle = document.getElementById("mode-toggle")!;
  saveToast = document.getElementById("toast-saved")!;
  btnShortcuts = document.getElementById("btn-open-shortcuts") as HTMLButtonElement;
  sandboxElement = document.getElementById("playground-sandbox")!;
  simulatedList = document.getElementById("simulated-list")!;
  switchToast = document.getElementById("switch-toast")!;

  // Load saved settings if any
  const settings = await StorageManager.getSettings();
  sandboxMode = settings.activationMode || "hold";
  updateModeVisuals(sandboxMode);

  // Wire Welcome Mode Cards
  modeHold.addEventListener("click", () => saveActivationMode("hold"));
  modeToggle.addEventListener("click", () => saveActivationMode("toggle"));
  
  modeHold.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      saveActivationMode("hold");
    }
  });

  modeToggle.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      saveActivationMode("toggle");
    }
  });

  // Wire Welcome Navigation
  btnBack.addEventListener("click", handleBack);
  btnNext.addEventListener("click", handleNext);

  // Wire Sandbox Playground
  renderSimulatedTabs();
  setupSandboxListeners();

  // Wire Shortcuts button
  btnShortcuts.addEventListener("click", () => {
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
    } else {
      alert("Please open chrome://extensions/shortcuts in a new tab.");
    }
  });
});

// Update selected UI highlights for modes
function updateModeVisuals(mode: "hold" | "toggle") {
  if (mode === "hold") {
    modeHold.classList.add("selected");
    modeHold.setAttribute("aria-checked", "true");
    modeToggle.classList.remove("selected");
    modeToggle.setAttribute("aria-checked", "false");
  } else {
    modeToggle.classList.add("selected");
    modeToggle.setAttribute("aria-checked", "true");
    modeHold.classList.remove("selected");
    modeHold.setAttribute("aria-checked", "false");
  }
}

// Persist mode choice to extension settings
async function saveActivationMode(mode: "hold" | "toggle") {
  sandboxMode = mode;
  updateModeVisuals(mode);
  const currentSettings = await StorageManager.getSettings();
  await StorageManager.saveSettings({
    ...currentSettings,
    activationMode: mode
  });
  
  // Show quick status toast
  saveToast.classList.add("visible");
  setTimeout(() => {
    saveToast.classList.remove("visible");
  }, 1200);
}

// Step Slide Navigation
function updateWizardProgress() {
  // Update step progress dots status
  dot1.classList.remove("active", "completed");
  dot2.classList.remove("active", "completed");
  dot3.classList.remove("active", "completed");

  progressBar.setAttribute("aria-valuenow", currentStep.toString());

  if (currentStep === 1) {
    dot1.classList.add("active");
  } else if (currentStep === 2) {
    dot1.classList.add("completed");
    dot2.classList.add("active");
  } else if (currentStep === 3) {
    dot1.classList.add("completed");
    dot2.classList.add("completed");
    dot3.classList.add("active");
  }
}

function handleNext() {
  if (currentStep < totalSteps) {
    // Hide current
    getCurrentSlideElement().classList.remove("active");
    currentStep++;
    // Show next
    getCurrentSlideElement().classList.add("active");
    
    btnBack.classList.remove("invisible");
    if (currentStep === totalSteps) {
      btnNext.textContent = "Finish";
    }
    updateWizardProgress();
  } else {
    // On Finish, close onboarding or redirect to shortcuts
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.remove) {
      chrome.tabs.getCurrent((tab) => {
        if (tab && tab.id !== undefined) {
          chrome.tabs.remove(tab.id);
        }
      });
    } else {
      alert("Onboarding Complete! Enjoy alternaTab!");
    }
  }
}

function handleBack() {
  if (currentStep > 1) {
    // Hide current
    getCurrentSlideElement().classList.remove("active");
    currentStep--;
    // Show previous
    getCurrentSlideElement().classList.add("active");
    
    btnNext.textContent = "Next";
    if (currentStep === 1) {
      btnBack.classList.add("invisible");
    }
    updateWizardProgress();
  }
}

function getCurrentSlideElement(): HTMLElement {
  if (currentStep === 1) return slide1;
  if (currentStep === 2) return slide2;
  return slide3;
}

// Simulated switcher sandbox engine
function renderSimulatedTabs() {
  simulatedList.innerHTML = "";
  mockTabs.forEach((tab, index) => {
    const card = document.createElement("div");
    card.className = `sim-card ${index === activeSimIndex ? "active" : ""}`;
    card.setAttribute("role", "option");
    card.setAttribute("aria-selected", index === activeSimIndex ? "true" : "false");
    card.id = `sim-option-${tab.id}`;
    
    card.innerHTML = `
      <div class="sim-fav">${tab.icon}</div>
      <div class="sim-details">
        <span class="sim-card-title">${tab.title}</span>
        <span class="sim-card-domain">${tab.domain}</span>
      </div>
    `;

    // Click triggers instant selection and confirmation
    card.addEventListener("click", () => {
      activeSimIndex = index;
      updateSandboxHighlight();
      triggerMockSwitch();
    });

    simulatedList.appendChild(card);
  });
  
  updateSandboxActiveDescendant();
}

function updateSandboxHighlight() {
  const cards = simulatedList.querySelectorAll(".sim-card");
  cards.forEach((card, index) => {
    if (index === activeSimIndex) {
      card.classList.add("active");
      card.setAttribute("aria-selected", "true");
    } else {
      card.classList.remove("active");
      card.setAttribute("aria-selected", "false");
    }
  });
  updateSandboxActiveDescendant();
}

function updateSandboxActiveDescendant() {
  const activeCard = simulatedList.children[activeSimIndex];
  if (activeCard) {
    const listContainer = document.getElementById("simulated-overlay");
    if (listContainer) {
      listContainer.setAttribute("aria-activedescendant", activeCard.id);
    }
  }
}

function triggerMockSwitch() {
  const tab = mockTabs[activeSimIndex];
  switchToast.textContent = `Switched to "${tab.title}"!`;
  switchToast.classList.remove("hidden");
  
  // Flash toast
  setTimeout(() => {
    switchToast.classList.add("hidden");
  }, 1800);
}

function setupSandboxListeners() {
  // Capture keydown only when sandbox is focused
  sandboxElement.addEventListener("keydown", (e) => {
    if (e.key === "q" && e.altKey) {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift+Q cycles backwards
        activeSimIndex = (activeSimIndex - 1 + mockTabs.length) % mockTabs.length;
      } else {
        // Q cycles forwards
        activeSimIndex = (activeSimIndex + 1) % mockTabs.length;
      }
      updateSandboxHighlight();
    }

    if (sandboxMode === "toggle" && e.key === "Enter") {
      e.preventDefault();
      triggerMockSwitch();
    }
  });

  // Release of Alt key in Hold mode triggers mock confirmation
  sandboxElement.addEventListener("keyup", (e) => {
    if (sandboxMode === "hold" && e.key === "Alt") {
      e.preventDefault();
      triggerMockSwitch();
    }
  });
}
