# Phase 3: Unified Browser Search

## Frontmatter
- wave: 1
- depends_on: ["Phase 2"]
- files_modified: ["public/manifest.json", "src/shared/types.ts", "src/shared/messages.ts", "src/shared/rankingEngine.ts", "src/background/search.ts", "src/background/router.ts", "src/launcher/hooks/useSearch.ts", "src/launcher/components/ResultItem.tsx"]
- autonomous: false
- requirements_addressed: ["REQ-301", "REQ-302", "REQ-303", "REQ-304", "REQ-305"]

## Objectives
- Integrate Chrome History, Bookmarks, and Sessions (recently closed tabs) into the launcher search, transforming it into a universal search bar.

## Tasks

<task>
<description>Update Manifest Permissions</description>
<read_first>
- public/manifest.json
</read_first>
<action>
1. Add `"bookmarks"`, `"history"`, and `"sessions"` to the `permissions` array in `public/manifest.json`.
</action>
<acceptance_criteria>
- Extension requests the new permissions on reload.
</acceptance_criteria>
</task>

<task>
<description>Define Unified Result Type</description>
<read_first>
- src/shared/types.ts
</read_first>
<action>
1. Refactor `LauncherTab` to `LauncherItem`.
2. Add a `type: 'tab' | 'bookmark' | 'history' | 'closed_tab'` field.
3. Make tab-specific fields optional (`windowId`, `isCurrentTab`, etc.).
4. Add specific IDs (`sessionId: string`, `bookmarkId: string`).
</action>
<acceptance_criteria>
- `LauncherItem` exists and accurately describes diverse search results.
</acceptance_criteria>
</task>

<task>
<description>Shift Ranking to Background</description>
<read_first>
- src/launcher/lib/ranking.ts
- src/shared/ranking.ts
</read_first>
<action>
1. Move the search engine logic from `src/launcher/lib/ranking.ts` to `src/background/search.ts` (or `src/shared/ranking.ts` if shared).
2. Because history and bookmarks can be massive, the UI cannot efficiently download them all to search them. The UI must send the search query to the background.
3. Update `rankResults` to handle scoring for all `LauncherItem` types.
4. Establish Source weights (e.g., Tabs > Closed Tabs > Bookmarks > History).
</action>
<acceptance_criteria>
- Ranking logic can process an array of generic `LauncherItem` objects and sort them definitively.
</acceptance_criteria>
</task>

<task>
<description>Implement Background Universal Search</description>
<read_first>
- src/background/router.ts
- src/shared/messages.ts
</read_first>
<action>
1. Create a `SEARCH_ASSETS` message that takes a `query: string`.
2. In `src/background/search.ts`, implement `handleSearchAssets(query)`:
   - Always fetch open tabs (via `chrome.tabs.query`).
   - If query is empty, fetch `chrome.sessions.getRecentlyClosed()`.
   - If query is not empty, fetch `chrome.bookmarks.search(query)` and `chrome.history.search({ text: query, maxResults: 100 })`.
   - Map all results to `LauncherItem`.
   - Run the aggregate list through the ranking algorithm.
   - Return the top 50 results.
</action>
<acceptance_criteria>
- `SEARCH_ASSETS` accurately aggregates from 4 different Chrome APIs based on query context.
</acceptance_criteria>
</task>

<task>
<description>Update UI to use Background Search</description>
<read_first>
- src/launcher/hooks/useSearch.ts
- src/launcher/hooks/useLauncherData.ts
- src/launcher/App.tsx
</read_first>
<action>
1. Deprecate `GET_TABS` or adapt it into the dynamic `SEARCH_ASSETS`.
2. Update `useSearch` to actually fire background messages when `query` changes (debounced by ~100ms) instead of filtering a static list.
3. Update `ResultItem.tsx` to display type badges (e.g. `Bookmark`, `History`, `Closed`).
</action>
<acceptance_criteria>
- Typing in the search bar dynamically fetches universal results.
</acceptance_criteria>
</task>

## Execution Order (Waves)

### Wave 1 — Contracts and Compatibility Foundation
- Files: `src/shared/types.ts`, `src/shared/messages.ts`
- Deliverables:
  - Finalize `LauncherItem` contract and source-specific optional IDs.
  - Confirm `SEARCH_ASSETS` message request/response shape for all sources.
- Dependency notes:
  - Blocks all downstream implementation because router, search provider, and UI consume these contracts.

### Wave 2 — Background Aggregation and Ranking Policy
- Files: `src/background/search.ts`, `src/shared/rankingEngine.ts`, `src/background/router.ts`
- Deliverables:
  - Aggregate from tabs always.
  - Empty query path adds recently closed sessions.
  - Non-empty query path adds bookmarks + history.
  - Enforce source ranking policy and cap results to top 50.
- Dependency notes:
  - Depends on Wave 1 types/messages.
  - Produces stable API for UI integration in Wave 3.

### Wave 3 — UI Query Flow and Rendering
- Files: `src/launcher/hooks/useSearch.ts`, `src/launcher/components/ResultItem.tsx`
- Deliverables:
  - Debounced background query flow.
  - No client-side re-ranking duplication once background ranking is authoritative.
  - Source badges visible for Bookmark, History, Closed.
- Dependency notes:
  - Depends on Wave 2 response behavior and ranking.

### Wave 4 — Permission + Verification Hardening
- Files: `public/manifest.json` and tests under `src/shared/__tests__`, `src/background/__tests__`, `src/launcher/lib/__tests__` as needed
- Deliverables:
  - Confirm required permissions are present.
  - Add/adjust tests for unified type mapping and source ordering policy.
  - Validate must-haves and regressions for Phase 1/2 flows.

## Explicit Decisions
- Background remains the source of truth for search aggregation and ranking.
- UI must not apply a second ranking pass to `SEARCH_ASSETS` results.
- Empty query behavior: open tabs first, then recently closed; bookmarks/history only on non-empty query.
- Result limit remains top 50 after ranking.

## Verification
<must_haves>
- Typing a known bookmark title successfully displays it as a Bookmark item.
- Typing a known history entry successfully displays it as a History item.
- Empty query shows currently open tabs first, followed by recently closed tabs.
- Ranking order honors source policy when text relevance is comparable.
</must_haves>
