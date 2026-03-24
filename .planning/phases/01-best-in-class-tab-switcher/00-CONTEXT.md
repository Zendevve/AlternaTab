# Phase 1: Best-in-class tab switcher - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning
**Source:** PRD Express Path

<domain>
## Phase Boundary
Make the actual tab switcher best-in-class. Goal: unbeatable search + ranking + keyboard flow.
</domain>

<decisions>
## Implementation Decisions

### Real ranking engine
- Move ranking into a dedicated module `src/launcher/lib/ranking.ts`
- Inputs: title, hostname, URL, MRU rank, current tab, pinned status
- Add named Stable Tie-Breaker rules (lower MRU rank first, active tab last, alphabetic title fallback)
- Document the constant weights: Exact title match > title prefix > exact host > host prefix > pinned bonus > current tab penalty > MRU top N.

### Improved result rendering
- Update `src/launcher/components/ResultItem.tsx` and `format.ts`
- Features: favicon fallback, highlighted matching characters, clean domain/path formatting, badges for current/pinned/window statuses.

### Keyboard UX
- Hook `src/launcher/hooks/useKeyboardNavigation.ts`
- Behaviors: Enter to switch, Esc to close, Cmd/Ctrl+1..9 jump, wrap-around navigation, auto-scroll selected into view (critical), preserve selection behavior.

### UI States
- Loading tabs state
- No matching results
- Failed to load data / fallback
</decisions>
