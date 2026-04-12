# Phase 4: Personalization and Adaptive Ranking - Context

**Gathered:** 2026-03-24
**Status:** Planning
**Source:** Configuration / System

<domain>
## Phase Boundary
Make the launcher "smart". Currently, the ranking logic is static and entirely dependent on text string matching and raw MRU/active tabs. In this phase, we introduce a tracking system that learns which items the user prefers (Selection History) and uses that historical data to boost those items in future queries. Furthermore, we will implement domain aliases to allow the user to find tabs using personalized shorthand (e.g. typing "w" to find a "work" portal).
</domain>

<decisions>
## Implementation Decisions

### Tracking Selection History (REQ-401)
- We will create `selectionHistoryService.ts` in `src/background/services`.
- Data Structure: A `Map<string, number>` storing `itemId -> total_selections`.
- Storage: `chrome.storage.local` to survive sessions.

### Adaptive Ranking Boosts (REQ-402)
- In `src/shared/rankingEngine.ts`, we'll need selection metadata. But where does the metadata enter?
- The background `SEARCH_ASSETS` flow will fetch `selectionHistory` from `selectionHistoryService` and inject the selection count into the item scoring algorithm.
- Math: `score += selectionCount * RANKING.SELECTION_BOOST;`

### Domain Aliases (REQ-403)
- We need configurable aliases (e.g., mapping `"mail"` to `"mail.google.com"`).
- We'll create an `aliasService.ts` running against defaults or user config.
- When ranking in `rankingEngine.ts`, the matching mechanism will check if the user's explicit query matches any known alias for the item's domain. If so, a massive score boost is applied.
</decisions>
