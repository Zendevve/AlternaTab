# Phase 1: Best-in-class tab switcher

## Frontmatter
- wave: 1
- depends_on: []
- files_modified: ["src/shared/constants/ranking.ts", "src/launcher/lib/ranking.ts", "src/launcher/lib/fuzzy.ts", "src/launcher/lib/__tests__/ranking.test.ts"]
- autonomous: false
- requirements_addressed: ["REQ-101", "REQ-105"]

## Objectives
- Extract search ad-hoc logic into a formally defined ranking engine.

## Tasks

<task>
<description>Create Ranking Constants & Types</description>
<read_first>
- src/launcher/lib/__tests__/ranking.test.ts
</read_first>
<action>
1. Create `src/shared/constants/ranking.ts` with export constant `RANKING` map:
   `EXACT_TITLE_MATCH: 120, TITLE_PREFIX_MATCH: 80, EXACT_HOST_MATCH: 70, HOST_PREFIX_MATCH: 60, PINNED_BONUS: 8, CURRENT_TAB_PENALTY: -20, MRU_TOP_1: 30, MRU_TOP_2: 24, MRU_TOP_3: 18, MINIMUM_INCLUDED_SCORE: 1`.
</action>
<acceptance_criteria>
- `src/shared/constants/ranking.ts` exports `RANKING`.
</acceptance_criteria>
</task>

<task>
<description>Implement Ranking Algorithm</description>
<read_first>
- src/shared/constants/ranking.ts
- src/launcher/lib/fuzzy.ts
</read_first>
<action>
1. Move the search query matching logic to `src/launcher/lib/ranking.ts`.
2. Export `function rankResults(query: string, results: LauncherTab[]): SearchResult[]`.
3. In `ranking.ts`, apply the weights from the RANKING constant to calculate the score.
4. Apply stable tie-breakers: higher score, then lower MRU rank, then active tab last, then alphabetic.
</action>
<acceptance_criteria>
- `src/launcher/lib/ranking.ts` contains `rankResults`.
- Returns an array ordered descending by score.
</acceptance_criteria>
</task>

<task>
<description>Update Tests</description>
<read_first>
- src/launcher/lib/__tests__/ranking.test.ts
</read_first>
<action>
1. Update tests in `ranking.test.ts` to assert that an exact title string out-scores an exact host string.
2. Assert that a lower MRU rank wins a tie-breaker.
3. Assert that the current active tab is penalized.
</action>
<acceptance_criteria>
- `npm run test` exits 0.
- `ranking.test.ts` tests all conditions enumerated.
</acceptance_criteria>
</task>

## Verification
<must_haves>
- The ranking engine uses predefined constants instead of magic numbers.
- MRU effectively acts as a solid tie-breaker.
</must_haves>

## Completion Summary
- Implemented `src/shared/constants/ranking.ts` with centralized ranking weights and updated `src/launcher/lib/ranking.ts` to score and order results with deterministic tie-breakers.
- Updated `src/launcher/lib/__tests__/ranking.test.ts` to verify exact-title priority, MRU tie-break behavior, and active-tab penalty behavior.
- Verification evidence: `npm run test` now exits successfully with ranking assertions passing.
- Requirement mapping: **REQ-101** satisfied via explicit scoring constants, stable ranking order, and test-backed ranking behavior.
