# Roadmap: alternatab (TabSwitcher)

## Overview

TabSwitcher (packaged as `alternatab`) brings OS-style Alt+Tab keyboard switching to Google Chrome. This roadmap guides the development from a blank greenfield repo to a highly polished, high-performance, production-ready Chrome Web Store extension.

## Phases

- [x] **Phase 1: Project Setup & Core Infrastructure** - Configure the extension Vite bundling pipeline and write the core tab adapter, storage, and tracking logic.
- [x] **Phase 2: Content Script & Overlay UI** - Implement the isolated Shadow DOM overlay card renderer, keyboard key cycling state machine, and glassmorphism styling.
- [x] **Phase 3: Service Worker & Background Wiring** - Wire up background message routers, hotkey commands, stale tab pruning alarms, and split-incognito separation.
- [x] **Phase 4: Settings UI & Quick Action Popup** - Create the sync options page and the lightweight action popup for configuration toggles. (completed 2026-05-26)
- [ ] **Phase 5: First-Run Onboarding & Accessibility** - Build the first-install interactive welcome wizard and implement WCAG 2.2 accessibility keyboard focus and ARIA roles.
- [ ] **Phase 6: Automated Testing & Performance QA** - Implement Vitest unit/integration tests and Playwright E2E browser tests to verify performance and correctness.
- [ ] **Phase 7: Production Release Prep** - Complete optimized build compiling, manifest audit checks, zip packaging, and Chrome Web Store listing assets.

---

## Phase Details

### Phase 1: Project Setup & Core Infrastructure
**Goal**: Scaffold project directories, set up Vite bundler for Manifest V3, and implement underlying tab adapters, storage managers, and MRU recency tracking layers.
**Depends on**: Nothing
**Requirements**: FR-004, FR-006, NFR-003
**Success Criteria**:
  1. Vite compiles without errors and produces a valid MV3 extension bundle in the `dist` directory.
  2. Tab recency order is accurately tracked in memory and saved to/restored from local storage.
  3. All tab queries and activations are decoupled via the adapter pattern, making them fully testable via a mock adapter.
**Plans**:
- [x] 01-01: Scaffold project layout, configs, and implement StorageManager settings/MRU isolation.
- [x] 01-02: Implement abstract TabAdapter (Chrome/Mock) and MRUTracker recency tracker.

### Phase 2: Content Script & Overlay UI
**Goal**: Build the floating overlay rendered inside an isolated, closed Shadow DOM, implementing fast selection highlights, key cycle navigation, and fluid animations.
**Depends on**: Phase 1
**Requirements**: FR-002, FR-003, FR-005, NFR-007
**Success Criteria**:
  1. Switcher overlay is successfully injected and rendered within a closed Shadow DOM (impervious to page style leakage).
  2. Alt+Q/Alt+Shift+Q and arrow keys correctly cycle active selection on screen with visual highlights.
  3. Light/dark themes and list/grid layouts look beautiful and scale correctly on different display sizes.
**Plans**:
- [x] 02-01: Build content script closed Shadow DOM, overlay vanilla css glassmorphic layout, and navigation KeyHandler with tests.

### Phase 3: Service Worker & Background Wiring
**Goal**: Implement Service Worker message bus, capture global commands, route hotkey events to active tab content scripts, and handle incognito sandboxing.
**Depends on**: Phase 2
**Requirements**: FR-001, FR-009, NFR-006
**Success Criteria**:
  1. Pressing Alt+Q globally triggers background event and correctly sends tab data to the active page content script.
  2. Incognito window tabs are tracked isolated in session storage and fully pruned when closed, leaving zero footprint.
  3. Restricting pages (chrome:// and CWS) are caught gracefully, displaying a notification toast instead of throwing errors.
**Plans**:
- [x] 03-01: Implement Service Worker messaging routing, global commands, periodic maintenance alarms, and unit tests.

### Phase 4: Settings UI & Quick Action Popup
**Goal**: Build Options dashboard and lightweight toolbar popup to give users immediate toggle control over preferences and hotkeys.
**Depends on**: Phase 3
**Requirements**: FR-007, FR-008
**Success Criteria**:
  1. Options page reads/writes UserSettings to sync storage and changes take effect instantly.
  2. Toolbar action popup successfully displays active settings and launches shortcut configuration page.
**Plans**:
- [x] 04-01: Design and implement the full Options page (options.html, options.css, options.ts).
- [x] 04-02: Design and implement the lightweight action popup (popup.html, popup.css, popup.ts).

### Phase 5: First-Run Onboarding & Accessibility
**Goal**: Build onboarding walkthrough on first install and audit interactive elements to exceed WCAG 2.2 accessibility guidelines.
**Depends on**: Phase 4
**Requirements**: NFR-005
**Success Criteria**:
  1. Installing extension automatically opens a beautiful 3-step onboarding guide.
  2. Switcher overlay is fully keyboard navigable and screen-reader readable with semantic tags and ARIA labels.
**Plans**:
- [ ] 05-01: Build multi-step onboarding wizard inside the Options page.
- [ ] 05-02: Implement complete keyboard navigation accessibility (tabIndex, focus rings, ARIA roles).

### Phase 6: Automated Testing & Performance QA
**Goal**: Establish Vitest unit tests and Playwright end-to-end browser tests to assert correct navigation, recency logic, and target render latency.
**Depends on**: Phase 5
**Requirements**: NFR-001, NFR-002
**Success Criteria**:
  1. Unit and integration tests cover >90% of business logic with zero failures.
  2. Automated Playwright tests successfully trigger overlay in real Chromium instances and measure launch speed.
**Plans**:
- [ ] 06-01: Set up Vitest framework and write unit/integration tests for MRUTracker, StorageManager, and KeyHandler.
- [ ] 06-02: Set up Playwright browser testing and verify full E2E lifecycle and load rendering speeds.

### Phase 7: Production Release Prep
**Goal**: Compile optimized, source-map-free bundles, audit the manifest, create release packaging, and assemble store listing assets.
**Depends on**: Phase 6
**Success Criteria**:
  1. Bundle contains zero console logs, source maps, or inline code scripts.
  2. Release zip packages successfully and is fully ready for Chrome Web Store submission.
**Plans**:
- [ ] 07-01: Perform final bundle optimization, manifest verification, zip bundling, and list-ready checklists.

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Project Setup & Core Infrastructure | 2/2 | Complete | 2026-05-26 |
| 2. Content Script & Overlay UI | 1/1 | Complete | 2026-05-26 |
| 3. Service Worker & Background Wiring | 1/1 | Complete | 2026-05-26 |
| 4. Settings UI & Quick Action Popup | 1/1 | Complete    | 2026-05-26 |
| 5. First-Run Onboarding & Accessibility | 0/2 | Not started | - |
| 6. Automated Testing & Performance QA | 0/2 | Not started | - |
| 7. Production Release Prep | 0/1 | Not started | - |
