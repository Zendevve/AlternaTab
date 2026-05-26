# Phase 4: Settings UI & Quick Action Popup - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase implements the fully polished Settings options page (options.html, options.css, options.ts) and the toolbar Action popover (popup.html, popup.css, popup.ts). It includes instant storage synchronization, beautiful dark/light harmonized themes, and hotkey configuration redirect links. It does not include first-run walkthrough structures (Phase 5) or automated E2E browser tests (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### Premium Aesthetic Blueprint
- **D-01 (Aesthetics):** Apply a consistent, sleek HSL tailormade grid theme matching the content script overlay exactly. Use Outfits/Inter modern typography, rounded borders, soft gradients, and glassmorphism cards.
- **D-02 (Layouts):** Responsive multi-panel columns inside Options page, and a compact visual card in the Action popup.

### Settings Options Page
- **D-03 (Fields):** Support complete UserSettings keys:
  - `maxVisible`: number input/slider (3 to 15).
  - `activationMode`: radio inputs ("Hold active overlay keys" vs "Toggle overlay display").
  - `theme`: select options ("Auto dynamic matches", "Light tailored HSL", "Dark deep glass").
  - `cardLayout`: radio options ("Responsive Grid layout", "Vertical List layout").
  - `showWindowBadge`: checkbox toggle.
- **D-04 (Sync):** Reading and saving settings directly triggers options page updates and updates the shared storage engine, firing settings-updated events.

### Toolbar Action Popover
- **D-05 (Quick Actions):** Includes a quick summary card showing how many tabs are currently tracked, visual toggle buttons for theme/layout options, and a premium "Configure Keyboard Shortcut" button redirecting users instantly to Chrome's native shortcuts tab (`chrome://extensions/shortcuts`).

</decisions>

<canonical_refs>
## Canonical References

### Requirements Spec
- `.planning/REQUIREMENTS.md` §v1 — PRD requirements covering settings persistence (FR-007) and quick action shortcut setup redirects (FR-008).

</canonical_refs>

<deferred>
## Deferred Ideas

- First-install wizard setup — Phase 5.

</deferred>

---

*Phase: 04-settings-ui-quick-action-popup*
*Context gathered: 2026-05-26*
