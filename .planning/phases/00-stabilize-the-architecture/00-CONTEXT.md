# Phase 0: Stabilize the architecture - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning
**Source:** PRD Express Path

<domain>
## Phase Boundary
Make MVP robust enough to extend. Focus on removing fragility, improving debuggability, making behavior deterministic, and creating strong extension boundaries.
</domain>

<decisions>
## Implementation Decisions

### MRU persistence
- Create a persisted MRU service `src/background/services/mruService.ts`
- Hydrate from storage on startup, update on tab activation, prune invalid tab IDs
- Persist bounded list, provide rank lookups
- Storage choice: start with `chrome.storage.local`, keep last 200–500 tab ids
- Key methods: hydrate, touch, remove, rank, getOrderedIds, pruneAgainstOpenTabs
- Done criteria: MRU survives restart, stale tabs removed, ranking consistent

### Runtime message router
- Centralize all extension messages in one router `src/background/router.ts` using `src/shared/messages.ts` and `contracts.ts`
- Use discriminated unions for requests/responses (Success/Failure)
- Done criteria: every message has one handler, standard response, invalid payloads fail gracefully

### Logging conventions
- Create lightweight logger wrapper `src/shared/logger.ts`
- Levels: debug, info, warn, error
- Usage: message failures, tab switch failures, launcher window failures
- Done criteria: critical paths log failures, logs include context

### Launcher window lifecycle
- Create launcher window manager `src/background/services/launcherWindowService.ts`
- Responsibilities: create popup, focus existing, track/clear window ID, center on display
- Done criteria: one launcher at a time, repeated hotkey focuses same launcher

### Tests
- Add tests for ranking (`fuzzy.ts`, `ranking.ts`) and MRU (`mruService.test.ts`)
- Done criteria: deterministic ranking, verified MRU persistence, covered tie-breakers

### the agent's Discretion
- Exactly how to inject the logger into services
- Storage key names for MRU
</decisions>

<canonical_refs>
## Canonical References
No external specs — requirements fully captured in decisions above
</canonical_refs>

<specifics>
## Specific Ideas
- Data model for PersistedMRUState: `{ orderedTabIds: number[]; updatedAt: number; }`
- Response model: `type Success<T> = { ok: true; data: T }; type Failure = { ok: false; error: string; code?: string };`
</specifics>

<deferred>
## Deferred Ideas
None — PRD covers phase scope
</deferred>
