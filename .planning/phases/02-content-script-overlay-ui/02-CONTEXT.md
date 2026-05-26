# Phase 2: Content Script & Overlay UI - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase implements the isolated Shadow DOM overlay card renderer, keyboard key cycling state machine, and glassmorphism visual styling inside a content script. It handles the complete frontend visual rendering, keyboard/mouse selection capture, and theme layout modes. It does not handle global hotkey hook bindings or service-worker message dispatching (Phase 3).

</domain>

<decisions>
## Implementation Decisions

### Overlay Encapsulation
- **D-01:** The overlay must be rendered inside a **closed Shadow DOM** (`mode: "closed"`) attached to a host container element injected into the page. This guarantees complete style isolation, protecting the overlay from host page CSS leakage and preventing host page scripts from reading or mutating switcher state.

### Visual Styling & Design System
- **D-02:** A **glassmorphism styling system** will be applied utilizing:
  - `backdrop-filter: blur(12px) saturate(180%)` for modern depth.
  - Harmonics: Sleek dark theme (`background: rgba(18, 18, 22, 0.7)`) and clean light theme (`background: rgba(255, 255, 255, 0.7)`).
  - Borders: 1px semi-transparent borders (`rgba(255, 255, 255, 0.08)` in dark; `rgba(0, 0, 0, 0.08)` in light).
  - Fonts: Inter fallback to system UI sans-serif.
- **D-03:** The overlay supports both **grid** and **list** layouts based on settings, centering on the screen with dynamic container resizing.

### Cycle State Machine & Hotkey Capturing
- **D-04:** Content script binds a keyboard listener capturing `keyup` and `keydown` events:
  - `Alt + Q`: Cycle selection forward (loops back to index 0).
  - `Alt + Shift + Q`: Cycle selection backward.
  - `ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight`: Dynamic navigation through list/grid rows and columns.
  - `Escape`: Instantly dismisses overlay without action.
  - `Enter` or `Space` or mouse click: Triggers selection confirmation message to background.
  - Mouse hover highlights the hovered card.

### Activation Mode Lifecycles
- **D-05:** **Hold Mode**: Overlay remains open as long as the user holds down `Alt`. Releasing `Alt` triggers immediate confirmation of the currently highlighted card.
- **D-06:** **Toggle Mode**: Releasing `Alt` keeps the overlay visible. The user must press Enter/Space or click a card to confirm, or press Escape/click outside to dismiss.

### the agent's Discretion
- Spacing values, rounded corner radii (defaulting to standard 8-12px modern roundness).
- Specific entrance/exit animation transition timings (recommend ~150ms cubic-bezier).

</decisions>

<canonical_refs>
## Canonical References

### Requirements Spec
- `.planning/REQUIREMENTS.md` §v1 — PRD requirements covering overlay display (FR-002), navigation (FR-003), activation modes (FR-005), and closed Shadow DOM security (NFR-007).

</canonical_refs>

<specifics>
## Specific Ideas

- Visual designs must feel premium, aligning with modern WebUI layout patterns like Linear or Vercel dashboards.
- Ensure all interactive elements have unique and descriptive DOM IDs (e.g., `alternatab-card-X`) to support testing.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/shared/storage.ts`: `UserSettings` schema matches UI layout variables (theme, cardLayout, maxVisible, activationMode).

### Integration Points
- Content script must listen for background messages containing the MRU list of `TabInfo` to construct and display cards.
- Content script must send selection messages back to the background worker to trigger tab switching on selection confirmation.

</code_context>

<deferred>
## Deferred Ideas

- Global key binding configurations inside Chrome preferences — Phase 3.
- Onboarding guides and welcome screen styling — Phase 5.

</deferred>

---

*Phase: 02-content-script-overlay-ui*
*Context gathered: 2026-05-26*
