# Requirements

## Phase 0
- **REQ-001**: Persist MRU safely (survive service worker restart, prune stale tabs, consistent ranking)
- **REQ-002**: Build a typed runtime message router (centralize messages, discriminated unions, standard responses)
- **REQ-003**: Introduce logging conventions (debug, info, warn, error)
- **REQ-004**: Harden launcher window lifecycle (one launcher at a time, center on display, clear ID on close)
- **REQ-005**: Add tests for ranking and MRU (deterministic behavior, tie-breaking rules)

## Phase 1
- **REQ-101**: Refactor search into a real ranking engine (stable tie-breakers, documented weights)
- **REQ-102**: Improve result rendering (favicon fallback, formatting, badges)
- **REQ-103**: Improve keyboard UX (Enter, Esc, Cmd/Ctrl 1-9, wrap-around, scroll)
- **REQ-104**: Add loading, empty, and error states (no blank UI, user-facing fallbacks)

## Phase 2
- **REQ-201**: Introduce action architecture (switch, close, pin, unpin, duplicate, copy_url, move_to_new_window, mute, unmute)
- **REQ-202**: Implement tab actions (background handlers)
- **REQ-203**: Add action UI (keyboard shortcuts, footer hints)

## Phase 3
- **REQ-301**: Introduce a unified result type (tabs, closed, bookmarks, history, workspaces)
- **REQ-302**: Add recently closed tabs (sessions API)
- **REQ-303**: Add bookmarks search (bookmarks API)
- **REQ-304**: Add history search (history API, intelligent querying)
- **REQ-305**: Introduce result source ranking policy

## Phase 4
- **REQ-401**: Track selection history
- **REQ-402**: Add learning-based ranking boosts
- **REQ-403**: Add domain aliases (gh, yt, mail, fig, jira, docs, cal)

## Phase 5
- **REQ-501**: Add workspace model
- **REQ-502**: Save workspace command
- **REQ-503**: Restore workspace
- **REQ-504**: Show workspaces in search results

## Phase 6
- **REQ-601**: Add parser for command mode (`>` trigger)
- **REQ-602**: Add command result provider

## Phase 7
- **REQ-701**: Duplicate tab detection
- **REQ-702**: Domain-specific actions
- **REQ-703**: Session timeline
- **REQ-704**: Plugin architecture
