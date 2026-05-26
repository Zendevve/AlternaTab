# Phase 5: First-Run Onboarding & Accessibility - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Builds a beautiful, premium dedicated onboarding tab page (`src/onboarding/index.html`) that opens automatically upon first extension install to welcome and train users. Additionally audits the content script switcher overlay to ensure strict WCAG 2.2 keyboard navigation, focus outlines, screen-reader compatibility (ARIA listbox roles, labels), and complete accessibility.

</domain>

<decisions>
## Implementation Decisions

### Onboarding Format
- Dedicated onboarding web page `src/onboarding/index.html` styled with a sleek glassmorphic theme matching the options page.
- Outfit/Inter Google typography and HSL variables used to present a unified design system.

### Interactive Switcher Playground
- An in-page simulated sandbox switcher container.
- Simulates the Alt+Q cycling mechanism directly on the page so users can practice cycling tabs before enabling the extension globally.

### Walkthrough Flow (3 Guided Steps)
- **Step 1: Core Mode Configuration**: Explains and lets users toggle between **Hold Mode** (default Alt+Q, release Alt to switch) and **Toggle Mode**.
- **Step 2: Interactive Sandbox**: Prompts users to focus a sandbox area and press Alt+Q (or mock keyboard commands) to switch between simulated tabs.
- **Step 3: Global Hotkey Wiring**: Instructs users on native hotkey binding constraints and provides a direct launcher to `chrome://extensions/shortcuts`.

### Accessibility Audit (WCAG 2.2 compliance)
- The extension switcher overlay DOM elements are marked with ARIA roles: `role="listbox"` on the main list container, `role="option"` and `aria-selected` state on each card.
- Supports screen readers via explicit labels (`aria-label="Tab Switcher"`).
- Keyboard accessibility matches proper outline indicators for selection overlays.

### the agent's Discretion
- Choice of illustration graphics, transitions, and slide animations inside the onboarding wizard are at the agent's discretion.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StorageManager` (`src/shared/storage.ts`): Reads and saves `UserSettings` like `activationMode`, `theme`, and `cardLayout`.
- HSL visual tokens and design styles used in `src/options/index.css` can be adapted for the onboarding page.

### Established Patterns
- Storage sync state binding: Options change handlers auto-saving with instant temporary toast notifications.
- Isolated Shadow DOM architecture in `src/content/index.ts`.

### Integration Points
- `src/background/index.ts` triggers redirect using `chrome.runtime.onInstalled`:
  ```typescript
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
      chrome.tabs.create({ url: "src/onboarding/index.html" });
    }
  });
  ```

</code_context>

<specifics>
## Specific Ideas
- The walkthrough page should have an interactive card list that allows users to instantly toggle hold/toggle settings and see changes persist in sync storage instantly.

</specifics>

<deferred>
## Deferred Ideas
None - discussion stayed within phase scope.

</deferred>

---
*Phase: 05-first-run-onboarding-accessibility*
*Context gathered: 2026-05-26*
