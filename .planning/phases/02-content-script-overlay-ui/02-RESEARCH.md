# Phase 2: Content Script & Overlay UI - Research

## Styles Isolation in MV3 closed Shadow DOM

### Problem
When rendering UI widgets within an arbitrary page content script, two style injection hazards exist:
1. **Style Pollution from Page**: Host page global rules (e.g. `div { margin: 20px; }`) bleed into and warp our overlay structure.
2. **Style Pollution to Page**: Our custom styling classes could conflict and override host layout structures.

### Solution
Wrap the overlay widget within a `closed` Shadow DOM:
```typescript
const host = document.createElement("div");
host.id = "alternatab-overlay-host";
document.body.appendChild(host);

const shadowRoot = host.attachShadow({ mode: "closed" });
```

To load styles cleanly with Vite 5:
Instead of utilizing standard stylesheets or linking external resources via `web_accessible_resources`, import our CSS sheet in the content script as an inline compiled string:
```typescript
import styles from "./overlay.css?inline";

const styleTag = document.createElement("style");
styleTag.textContent = styles;
shadowRoot.appendChild(styleTag);
```
This guarantees zero asset dependency fetches, instant rendering, and complete security containment.

---

## Alt Key Holding Detection Mechanics

### Problem
Under **Hold Mode**, the user fires `Alt+Q` and keeps `Alt` held down while repeatedly pressing `Q` to navigate. Upon releasing `Alt`, the overlay must instantly select the highlighted card and dismiss.

### Solution
1. On initial `Alt+Q` press, intercept standard browser actions and block default window events (`e.preventDefault()`, `e.stopPropagation()`).
2. Keep state: `isAltHeld = true`.
3. Bind a keyup event listener on `window` to detect when the `Alt` key is released:
```typescript
window.addEventListener("keyup", (e) => {
  if (e.key === "Alt") {
    isAltHeld = false;
    // Trigger confirm logic instantly in hold mode
  }
});
```
4. **Safety Escape Hatch**: If the window loses focus (e.g. due to system overlays or popups), the keyup event for "Alt" might be swallowed by the OS. To prevent the overlay from getting stuck on screen, also bind to `window.onblur`:
```typescript
window.addEventListener("blur", () => {
  // Dismiss overlay gracefully without action to prevent sticking
});
```

---

## Responsive Grid / List Density Layouts

To maintain top-tier visual aesthetics:
- **Grid Layout**: A responsive flex or CSS Grid wrapping exactly N tab items (up to 15) with automatic columns (e.g. `grid-template-columns: repeat(auto-fill, minmax(140px, 1fr))`).
- **List Layout**: A neat vertical stack of rows (`flex-direction: column`) with clear tab indexes.
- **Glassmorphic HARMONIC colors**:
  - Darkmode: `rgba(18, 18, 22, 0.75)` container with `backdrop-filter: blur(16px)` and a subtle `box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37)`.
  - Border highlight: 1px borders using `rgba(255, 255, 255, 0.08)`.
