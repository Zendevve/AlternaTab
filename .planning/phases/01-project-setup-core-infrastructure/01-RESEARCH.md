# Phase 01: Project Setup & Core Infrastructure - Research

## Overview & Architecture

We are building a Manifest V3 Google Chrome extension using:
- **TypeScript 5.x**
- **Vite 5.x** with `vite-plugin-web-extension` to simplify build mappings for content scripts, options page, popup, and background service worker.
- **Vitest** for robust in-memory unit testing of core trackers and storage.

```
                  ┌──────────────────────┐
                  │   Chrome Extension   │
                  └──────────┬───────────┘
                             │
                             ▼
                 ┌───────────────────────┐
                 │      TabAdapter       │
                 └─────┬───────────┬─────┘
                       │           │
           ┌───────────┘           └───────────┐
           ▼                                   ▼
┌────────────────────┐               ┌───────────────────┐
│  ChromeTabAdapter  │               │  MockTabAdapter   │
│ (Uses Chrome APIs) │               │ (For Unit Tests)  │
└────────────────────┘               └───────────────────┘
```

---

## Technical Feasibility

### 1. Build Scaffolding
- `vite-plugin-web-extension` allows specifying the target manifest file (e.g. `src/manifest.json`). The plugin handles compiling TypeScript sources for background service workers, content scripts, and pages seamlessly.
- Project structure:
  - `src/manifest.json`: Defines extension metadata, background service worker, actions, and permissions.
  - `src/background/index.ts`: The main Service Worker entry point.
  - `src/background/tracker.ts`: Core MRU tracking logic.
  - `src/shared/storage.ts`: Core storage abstractions.
  - `src/shared/adapter.ts`: The `TabAdapter` interface and concrete implementations.

### 2. Manifest V3 Permissions
To track tabs and manage focus across windows, we require the following permissions in `manifest.json`:
- `"tabs"`: Access to page titles, URLs, and favicons.
- `"storage"`: Access to `chrome.storage.local` and `chrome.storage.sync`.

```json
{
  "manifest_version": 3,
  "name": "TabSwitcher",
  "version": "1.0.0",
  "description": "Alt+Tab tab switcher for Chrome.",
  "permissions": ["tabs", "storage"],
  "background": {
    "service_worker": "background/index.ts",
    "type": "module"
  }
}
```

### 3. Storage Layer (`StorageManager`)
We need to access three storage areas:
- `chrome.storage.sync` for user settings (capped at 100KB, syncs across browsers).
- `chrome.storage.local` for regular window MRU histories.
- `chrome.storage.session` for incognito tab recency tracking (holds state in memory only, cleared on browser close).

To work both in content scripts, background workers, and standard node testing environments, the storage manager will fall back to an in-memory dictionary if `chrome.storage` is not defined.

### 4. Adapter & Mock Design Pattern
The `TabAdapter` isolates our business logic from actual browser APIs, allowing us to simulate tab creations, active updates, and removals during tests.

---

## Validation Architecture

To ensure correctness of the core infrastructure:
1. **Unit Testing Strategy**: Write Vitest tests for the `StorageManager` to verify sync/local/session reading/writing works, using an in-memory mock when browser APIs are absent.
2. **MRU Recency Verification**: Write tests simulating multiple tab activation sequences, confirming that:
   - Newly activated tabs move to the head (index 0).
   - The overall capacity does not exceed 50 items.
   - Stale tab IDs are correctly pruned when non-existent tabs are identified.
3. **TypeScript Compliance**: Verify compiling with `tsc --noEmit` returns zero errors.

---

*Phase: 01-project-setup-core-infrastructure*
*Research date: 2026-05-26*
