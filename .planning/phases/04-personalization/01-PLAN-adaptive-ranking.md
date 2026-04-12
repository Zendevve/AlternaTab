# Phase 4: Personalization and Adaptive Ranking

## Frontmatter
- wave: 1
- depends_on: ["Phase 3"]
- files_modified: ["src/background/services/selectionHistory.ts", "src/background/services/aliases.ts", "src/background/index.ts", "src/background/tabs.ts", "src/shared/constants/ranking.ts", "src/shared/rankingEngine.ts", "src/background/search.ts"]
- autonomous: false
- requirements_addressed: ["REQ-401", "REQ-402", "REQ-403"]

## Objectives
- Track what the user actually clicks on, increment score modifiers, and bias future searches towards historically selected options. Provide domain aliasing for custom shortcut queries.

## Tasks

<task>
<description>Build Selection History Service</description>
<read_first>
- src/background/services/mruService.ts
</read_first>
<action>
1. Create `src/background/services/selectionHistory.ts`.
2. Model a persistent store `Record<string, number>` saving frequencies to `chrome.storage.local`.
3. Provide methods: `recordSelection(id: string)`, `getFrequencies()`.
</action>
<acceptance_criteria>
- Clicking an item successfully increments its internal counter in `chrome.storage.local`.
</acceptance_criteria>
</task>

<task>
<description>Wire Selection Tracking</description>
<read_first>
- src/background/tabs.ts
</read_first>
<action>
1. Update `handleSwitchTab` in `src/background/tabs.ts`. When a switch action completes successfully, map the parameters to a unique ID (e.g. `tab-25`, `history-3882`) and call `recordSelection(id)`.
</action>
<acceptance_criteria>
- Switching tabs triggers frequency learning implicitly.
</acceptance_criteria>
</task>

<task>
<description>Apply Adaptive Ranking Boosts</description>
<read_first>
- src/shared/rankingEngine.ts
- src/background/search.ts
</read_first>
<action>
1. Add `selectionCount?: number` to `LauncherItem` in `src/shared/types.ts`.
2. Add `SELECTION_BOOST: 10` to `src/shared/constants/ranking.ts`.
3. Update `src/background/search.ts` to map `selectionCount` onto the `LauncherItem`s using `selectionHistoryService.getFrequencies()`.
4. Update `rankResults` to apply `score += (item.selectionCount || 0) * SELECTION_BOOST`.
</action>
<acceptance_criteria>
- Items chosen multiple times reliably bubble to the top against identical static text matches.
</acceptance_criteria>
</task>

<task>
<description>Implement Domain Aliases</description>
<read_first>
- src/shared/rankingEngine.ts
</read_first>
<action>
1. Create a simple constant or configurable alias map (e.g. `const ALIASES = { 'git': 'github.com', 'mail': 'mail.google.com' }`).
2. Update `rankResults` in `rankingEngine.ts` to check if `ALIASES[query]` matches `item.host`. If true, apply an `ALIAS_MATCH` bonus (e.g. `+50`).
</action>
<acceptance_criteria>
- Typing "mail" will force "mail.google.com" assets to the absolute top regardless of MRU status.
</acceptance_criteria>
</task>

## Verification
<must_haves>
- Frequently visited specific history links outrank open tabs with similar names when repeatedly selected.
- Aliases successfully map un-related text directly to target domains.
</must_haves>
