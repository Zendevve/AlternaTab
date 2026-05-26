# Phase 3: Service Worker & Background Wiring - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase implements the background Service Worker message bus router, captures browser global command keyboard bindings (Alt+Q), coordinates active content script overlay triggers, implements hourly storage database pruning alarms, and isolates private incognito session lists. It does not handle options config pages (Phase 4) or accessibility ARIA audits (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Global Command Capture
- **D-01:** Binds a listener using `chrome.commands.onCommand` catching our switcher action (default: `_execute_action` or custom hotkey command).
- **D-02:** Upon hotkey trigger:
  - Prune closed/stale IDs from MRU sequences.
  - Retrieve the clean recent `TabInfo[]` list (up to `UserSettings.maxVisible`).
  - Retrieve current `UserSettings`.
  - Check if the currently focused active tab resides on a restricted browser domain (e.g. `chrome://*`, `chrome-extension://*`, Chrome Web Store `chromewebstore.google.com`).
    - If restricted: Fire a rich system notification or simple message indicating switcher is restricted.
    - If valid: Send a `"toggle-switcher"` runtime message with tab list and settings directly into the active tab content script.

### Background Message Routing (MessageBus)
- **D-03:** Wire a centralized runtime message bus in the background service worker:
  - `"switch-to-tab"`: Switches focus to the requested tab id (`chrome.tabs.update`) and focuses the corresponding window (`chrome.windows.update`).
  - `"dismiss-switcher"`: Ends tracking loop gracefully.

### Hourly Pruning Alarms
- **D-04:** Establish a `chrome.alarms` periodic hourly task that runs background checks across all recorded MRU IDs against active browser states, pruning any phantom or orphaned tab entries that managed to bypass standard `onRemoved` lifecycle triggers.

### Private Incognito Splits
- **D-05:** Regular background tasks query all standard tab spaces. Incognito windows run in split mode, meaning Chrome spawns a completely separate background service instance where standard local and sync options are readable but MRU lists are kept strictly inside private memory maps and `chrome.storage.session`, leaving absolutely zero disk imprint.

</decisions>

<canonical_refs>
## Canonical References

### Requirements Spec
- `.planning/REQUIREMENTS.md` §v1 — PRD requirements covering trigger restrictions (FR-001), selection confirms (FR-004), isolated incognito sessions (FR-009), background footprint limits (NFR-002), and CSP standards (NFR-007).

</canonical_refs>

<specifics>
## Specific Ideas

- Display a elegant notifications toast if triggered on restricted pages so that the user receives responsive visual feedback instead of silent failure.
- Background worker must run with minimal allocations, staying under the 5MB memory limit (NFR-002).

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/background/tracker.ts`: Contains the robust `MRUTracker` class which tracks tab recency, prunes, and separates incognito windows.
- `src/shared/adapter.ts`: Decoupled `ChromeTabAdapter` maps tab events and switches focus cleanly.

### Integration Points
- Background worker acts as the orchestrator, coupling `MRUTracker` updates, listening to commands, and pushing tab arrays into the content script overlays.

</code_context>

<deferred>
## Deferred Ideas

- Options screen popup toggles — Phase 4.

</deferred>

---

*Phase: 03-service-worker-background-wiring*
*Context gathered: 2026-05-26*
