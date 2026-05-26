# alternatab (TabSwitcher)

## What This Is

A Chrome extension that brings OS-style Alt+Tab window switching to browser tabs, displaying a floating overlay of recently-used tabs so users can cycle and switch between them instantly without lifting hands from the keyboard. It is optimized for power users (developers, researchers, managers) who maintain dozens of open tabs.

## Core Value

Instant, keyboard-driven navigation between recently-active browser tabs with minimal latency (<80ms P50) and zero mouse dependency.

## Requirements

### Validated

- **FR-001**: Hotkey Activation (Alt+Q default, configurable, disabled on chrome:// and CWS pages) - Validated in Phase 3
- **FR-002**: Overlay Display (centered floating panel, max N MRU tabs, favicons, titles, domains, active indicator, cross-window index badges) - Validated in Phase 2
- **FR-003**: Navigation (Alt+Q cycles, Alt+Shift+Q reverses, Arrows navigate, Enter/Space confirms, Esc cancels, mouse hover/click) - Validated in Phase 2
- **FR-004**: Switching Behavior (activates selected tab + focuses window, moves selected to top of MRU, closes overlay) - Validated in Phase 1
- **FR-005**: Dismiss Behavior (Hold mode: dismisses/switches on Alt release; Toggle mode: stays open until Enter/click) - Validated in Phase 2
- **FR-006**: MRU Tracking (tracks activations, prunes closed/stale tabs, persists to storage, max 50 entries) - Validated in Phase 1
- **FR-007**: Options / Settings (maxVisible 3-15, activationMode hold/toggle, theme auto/light/dark, layout grid/list, showWindowBadge) - Validated in Phase 4
- **FR-008**: Popup Interface (popup.html with quick mode toggles, shortcut display, links to options page and chrome shortcut manager) - Validated in Phase 4
- **FR-009**: Incognito Support (split mode support, stores MRU only in storage.session, prunes on close, zero leaks to sync/local) - Validated in Phase 3
- **NFR-003**: Reliability (zero MRU data loss on browser crash, written after each activation) - Validated in Phase 1
- **NFR-006**: Privacy (100% local, no network requests, no analytics in v1.0) - Validated in Phase 3
- **NFR-007**: Security (strict CSP: no unsafe-inline, no unsafe-eval, isolated closed Shadow DOM, textContent only to prevent XSS) - Validated in Phase 2

### Active

<!-- Current scope. Building toward these. -->

- [ ] **NFR-001**: Performance (overlay first paint <80ms P50, <200ms P99)
- [ ] **NFR-002**: Resource Footprint (background service worker memory footprint <5MB)
- [ ] **NFR-005**: Accessibility (all items keyboard accessible, proper tabIndex and ARIA roles)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- **Firefox/Edge/Safari support** — Defer to future milestones to reduce initial cross-browser complexity.
- **Tab Groups integration** — Defer to v1.1+; standard tab recency order is the primary MVP value.
- **Cross-device sync of recency order** — Defer; tab recency is highly device-specific and sync adds high complexity.
- **Tab preview screenshots (thumbnails)** — High performance/memory overhead; text + domain is highly efficient.
- **Search/fuzzy find within overlay** — Keep the overlay focused on muscle memory cycling; search is a separate interaction model.
- **Custom themes beyond light/dark auto-detect** — Keep visual branding unified and clean; auto-detection covers 95% of user preferences.

## Context

- Target ecosystem is Google Chrome 114+ (Manifest V3 compliance is mandatory).
- Built with TypeScript 5, Vite 5, `vite-plugin-web-extension`, and Vanilla CSS.
- Deploys as a self-contained ZIP bundle for Chrome Web Store.
- Shadow DOM is utilized in content script to prevent host page CSS pollution.

## Constraints

- **Manifest V3**: Extension service workers are short-lived and sleep after 30s. Must use alarms or events to wake up and perform background tracking/cleanup.
- **CSP Safety**: Strict Content Security Policy requires all styles and scripts to be extension-bundled (no inline injections, no eval).
- **DOM Isolation**: Shadow DOM must be created with `mode: "closed"` to prevent host page scripts from tampering with the switcher overlay.
- **Local Quotas**: Sync storage is capped at 100KB. Keep settings sync extremely lightweight, keeping the heavy MRU tab list in local/session storage.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Closed Shadow DOM | Prevent host page scripts from reading switcher DOM or hijacking inputs | — Implemented in Phase 2 |
| Adapter Pattern | Decouple tab logic from browser APIs for 100% unit-testability | — Implemented in Phase 1 |
| Split Incognito | Ensure strict sandbox isolation for private tabs, session storage only | — Implemented in Phase 3 |
| Glassmorphism Theme | Vanilla HSL variables styling for options & popup to feel premium | — Implemented in Phase 4 |
| JSDOM Unit Testing | Run lightweight and fast in-memory DOM unit tests with Vitest | — Implemented in Phase 4 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-26 after Phase 4 completion*
