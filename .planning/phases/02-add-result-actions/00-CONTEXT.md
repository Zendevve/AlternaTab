# Phase 2: Add Result Actions - Context

**Gathered:** 2026-03-24
**Status:** Planning
**Source:** PRD

<domain>
## Phase Boundary
Transform the switcher into a command center. Allow users to perform actions on tabs directly from the search interface without having to switch to them first.
</domain>

<decisions>
## Implementation Decisions

### Action Architecture
- Extend `src/shared/messages.ts` with new discriminated union types for: `PIN_TAB`, `UNPIN_TAB`, `DUPLICATE_TAB`, `MUTE_TAB`, `UNMUTE_TAB`, `MOVE_TO_NEW_WINDOW`.
- `SWITCH_TAB`, `CLOSE_TAB`, and `COPY_URL` are partially defined but need complete handler implementations or wire-ups if not already done.

### Background Handlers
- Update `src/background/tabs.ts` to export handlers for each action (e.g., `handlePinTab`, `handleMoveToNewWindow`).
- Update `src/background/router.ts` to decode these messages and route to the respective handlers.

### Action UI
- Update `src/launcher/hooks/useKeyboardNavigation.ts` or `App.tsx` to listen for action modifiers on the selected tab:
  - `Cmd/Ctrl + W`: Close tab
  - `Cmd/Ctrl + P`: Toggle Pin
  - `Cmd/Ctrl + D`: Duplicate
  - `Cmd/Ctrl + M`: Toggle Mute
  - `Cmd/Ctrl + C`: Copy URL (and write to clipboard)
  - `Cmd/Ctrl + N`: Move to new window
- Update `src/launcher/components/FooterHints.tsx` to display these shortcut hints so users can discover them.
</decisions>
