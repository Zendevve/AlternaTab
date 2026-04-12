# Phase 1: Best-in-class tab switcher

## Frontmatter
- wave: 2
- depends_on: ["01-PLAN-ranking.md"]
- files_modified: ["src/launcher/hooks/useKeyboardNavigation.ts", "src/launcher/components/ResultItem.tsx", "src/launcher/lib/format.ts", "src/launcher/hooks/useSearch.ts", "src/launcher/components/ErrorBoundary.tsx"]
- autonomous: false
- requirements_addressed: ["REQ-102", "REQ-103", "REQ-104"]

## Objectives
- Elevate the UI layer with refined render quality, keyboard navigation, and boundary states.

## Tasks

<task>
<description>Update Search Hook and Rendering</description>
<read_first>
- src/launcher/hooks/useSearch.ts
- src/launcher/components/ResultItem.tsx
</read_first>
<action>
1. Update `src/launcher/hooks/useSearch.ts` to use `rankResults` from `ranking.ts`.
2. Create `src/launcher/lib/format.ts` for clean domain formatting.
3. In `ResultItem.tsx`, add badges for Pinned and Active states, and provide fallback `favicon` logic using `chrome-extension://` favicons trick or a fallback local icon depending on domain.
</action>
<acceptance_criteria>
- `ResultItem.tsx` renders conditional badges.
- `useSearch.ts` imports from `ranking.ts`.
</acceptance_criteria>
</task>

<task>
<description>Implement Keyboard Navigation Hook</description>
<read_first>
- src/launcher/hooks/useKeyboardNavigation.ts
</read_first>
<action>
1. Extrapolate keyboard handling logic into `src/launcher/hooks/useKeyboardNavigation.ts`.
2. Support `ArrowDown`, `ArrowUp` (with wrap-around).
3. Support `Enter` to switch, `Escape` to close window.
4. Support `Cmd+1..9` (or `Ctrl+1..9`) mapping to result indices `0` to `8`.
5. Call `element.scrollIntoView({ block: 'nearest' })` on the selected item to autoscroll.
</action>
<acceptance_criteria>
- `useKeyboardNavigation.ts` exists and handles all specified keys.
</acceptance_criteria>
</task>

<task>
<description>Add Empty and Loading States</description>
<read_first>
- src/launcher/App.tsx
</read_first>
<action>
1. Modify `App.tsx` or the list component to handle zero-results elegantly ("No tabs found matching query").
2. Ensure `isLoading` flag from `useSearch.ts` renders a minimalist spinner or skeleton.
3. Validate that `ErrorBoundary.tsx` is wrapping the list effectively to trap generic failures.
</action>
<acceptance_criteria>
- Empty state text is rendered when results length is 0.
</acceptance_criteria>
</task>

## Verification
<must_haves>
- User can never lose focus or see a completely blank screen under normal use.
- Keyboard navigation flows seamlessly with scrolling support.
</must_haves>

## Completion Summary
- Rendering improvements implemented in `src/launcher/components/ResultItem.tsx` and `src/launcher/lib/format.ts`, including cleaner domain formatting plus active and pinned visual indicators.
- Keyboard UX implemented in `src/launcher/hooks/useKeyboardNavigation.ts` with wrap-around arrow navigation, Enter and Escape actions, Ctrl/Cmd numeric shortcuts, and selected-item auto-scroll behavior.
- Loading, empty, and error handling refined across `src/launcher/hooks/useSearch.ts`, `src/launcher/components/EmptyState.tsx`, `src/launcher/App.tsx`, and `src/launcher/components/ErrorBoundary.tsx` to avoid blank states and keep user feedback visible.
- Verification evidence: `npm run test` exits successfully, including launcher ranking tests and updated shared/background test coverage.
- Requirement mapping: **REQ-102** satisfied by rendering clarity and result presentation updates; **REQ-103** satisfied by full keyboard-first navigation behavior; **REQ-104** satisfied by resilient loading, empty, and error-state UX.
