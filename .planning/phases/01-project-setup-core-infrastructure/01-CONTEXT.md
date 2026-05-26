# Phase 01: Project Setup & Core Infrastructure - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning
**Source:** User MVP Specification

<domain>
## Phase Boundary

This phase establishes the scaffolding of our Chrome Extension project using Vite 5 and TypeScript 5, builds the clean folder structure, and implements the decoupled core components for browser storage (`StorageManager`), tab recency sorting (`MRUTracker`), and tab API operations (`TabAdapter` with Chrome and Mock implementations).

</domain>

<decisions>
## Implementation Decisions

### Project Scaffolding
- **Bundler**: Vite 5 with `vite-plugin-web-extension` to handle entrypoints automatically.
- **Languages**: TypeScript 5 for type safety.
- **Dependencies**: React 18 (for options/popup pages), Vitest (for unit testing), Playwright (for E2E browser tests).
- **Target Target**: Chrome 114+ (Manifest V3).

### Storage Architecture (`StorageManager`)
- **Sync Storage (`chrome.storage.sync`)**: Persists lightweight configuration under key `settings`.
- **Local Storage (`chrome.storage.local`)**: Persists regular window MRU histories under key `mru_history`.
- **Session Storage (`chrome.storage.session`)**: Tracks incognito tab MRU order under key `incognito_mru_history` (isolated and ephemeral).
- **Zero Loss**: Write updates immediately upon state changes.

### Adapter Design Pattern (`TabAdapter`)
- An abstract `TabAdapter` interface decouples Chrome extension APIs from business logic to enable 100% mocked testing.
- **Interface Definition**:
  ```typescript
  export interface TabInfo {
    id: number;
    windowId: number;
    title: string;
    url: string;
    favIconUrl?: string;
  }

  export interface TabAdapter {
    getActiveTab(): Promise<TabInfo | null>;
    getRecentTabs(limit: number): Promise<TabInfo[]>;
    switchToTab(tabId: number, windowId: number): Promise<void>;
    onTabActivated(callback: (tabId: number, windowId: number) => void): void;
    onTabRemoved(callback: (tabId: number) => void): void;
    onTabCreated(callback: (tab: TabInfo) => void): void;
  }
  ```
- **Concrete Implementations**:
  - `ChromeTabAdapter`: Invokes real `chrome.tabs` and `chrome.windows` APIs.
  - `MockTabAdapter`: In-memory implementation utilizing fake list stores for unit testing.

### MRU Recency Tracker (`MRUTracker`)
- Handles business logic for tab lists: tracks focus events, moves current to top, prunes stale/deleted IDs, caps active array to 50 items.

### target Content
No UI components are built in this phase. The core is 100% focused on setup and data plumbing.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/PROJECT.md` — Active and out-of-scope requirements.
- `.planning/REQUIREMENTS.md` — FR-004, FR-006, NFR-003 definitions.

</canonical_refs>

<specifics>
## Specific Ideas

- Setup strict TypeScript `tsconfig.json` configurations.
- Design `StorageManager` helper to gracefully ignore standard permission errors when running outside extension context.

</specifics>

<deferred>
## Deferred Ideas

- Shadow DOM overlay UI rendering (Phase 2).
- Keyboard activation command registration (Phase 3).

</deferred>

---

*Phase: 01-project-setup-core-infrastructure*
*Context gathered: 2026-05-26 via User Specification*
