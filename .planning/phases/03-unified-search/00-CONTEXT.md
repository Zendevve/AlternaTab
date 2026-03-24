# Phase 3: Unified Browser Search - Context

**Gathered:** 2026-03-24
**Status:** Planning
**Source:** PRD

<domain>
## Phase Boundary
Transform the switcher from a Tab Searcher into a Universal Browser Asset Searcher. The launcher should search open tabs, closed sessions, bookmarks, and browsing history.
</domain>

<decisions>
## Implementation Decisions

### Unified Result Type
- Rename/Refactor `LauncherTab` vs introducing a unified `LauncherItem` in `src/shared/types.ts`.
- `LauncherItem` properties: `id` (string), `type` ('tab' | 'closed_tab' | 'bookmark' | 'history'), `title`, `url`, `host`, `path`, `favIconUrl`, `score`.
- Specialized properties: `tabId`, `windowId`, `sessionId`, `bookmarkId`.
- Add source-specific badges (e.g., "History", "Bookmark", "Closed").

### Background Providers
- The `handleGetTabs` background route needs to be expanded or renamed to `handleGetResults` to query from `chrome.tabs`, `chrome.sessions.getRecentlyClosed()`, `chrome.bookmarks.search()`, and `chrome.history.search()`.
- Wait, doing `search()` in the background on every keystroke might be slow and flood message passing, OR we can fetch them all upfront on `GET_TABS` (maybe rename to `GET_INITIAL_DATA` or `GET_SEARCH_RESULTS`).
- Actually, since `chrome.history` and `chrome.bookmarks` can be massive, caching *all* of them upfront in memory could be expensive. The standard extension architectural pattern is to keep active/closed tabs in memory, but execute background search queries for bookmarks/history *dynamically* on keystrokes.
- We will change the search flow: We will have the UI send a `SEARCH_QUERY` message to the background script, which will aggregate results and return them, *instead of* the UI doing client-side fuzzy search, OR the UI continues client-side search for tabs but queries background for Bookmarks/History.
- Given the PRD doesn't explicitly dictate client vs. background search execution, moving search to the background makes the most sense because `chrome.bookmarks` and `chrome.history` APIs accept search queries directly.
- BUT Phase 1 built a rich client-side `rankResults` ranking engine in `src/launcher/lib/ranking.ts`! Moving it to background means duplicating logic or moving `ranking.ts` to `shared`.

### Search Architecture Refactoring
- Move `src/launcher/lib/ranking.ts` to `src/shared/ranking.ts`.
- Expand `handleGetTabs` to include `chrome.sessions.getRecentlyClosed()`.
- Wait, history and bookmarks can be queried dynamically when `query` is not empty. We'll add a new message: `SEARCH_ASSETS`, passing the `query`. The background uses `chrome.history.search` and `chrome.bookmarks.search`, maps them to `LauncherItem`, applies ranking alongside tabs, and returns top 50 results.

### Permissions
- Ensure `bookmarks`, `history`, and `sessions` are in `manifest.json`. (Wait, I need to check `manifest.json`).
</decisions>
