# AlternaTab

## What This Is
AlternaTab is a high-performance, keyboard-first browser tab launcher extension. It turns the browser into a command platform, offering best-in-class tab switching, result actions, unified search, personalization, and workspace management.

## Core Value
The fastest way to find, switch, restore, organize, and control anything in the browser.

## Requirements

### Validated
(None yet)

### Active
- [ ] Phase 0: Stabilize the architecture (MRU, router, logging)
- [ ] Phase 1: Best-in-class tab switcher (ranking, UX)
- [ ] Phase 2: Add result actions (close, pin, duplicate)
- [ ] Phase 3: Unified browser search (history, bookmarks)
- [ ] Phase 4: Personalization and adaptive ranking
- [ ] Phase 5: Workspaces and session memory
- [ ] Phase 6: Command mode
- [ ] Phase 7: Moat features (plugins, session timeline)

### Out of Scope
- [Adding AI without deterministic ranking] — Need strict ranking foundation first
- [Overwhelming history results] — Focus on open tabs as primary

## Context
Goal is to turn AlternaTab from a strong MVP into a category-killer browser launcher. It should evolve into a browser operating layer.

## Constraints
- **Performance**: Must be instant and reliable — keyboard UX is paramount.
- **Architecture**: Must handle MV3 Service Worker lifecycle correctly (e.g. MRU persistence).

## Key Decisions
| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Start with Phase 0 | Stabilize MV3 fragility before adding features | — Pending |

---
*Last updated: 2026-03-24 after Initial PRD ingestion*
