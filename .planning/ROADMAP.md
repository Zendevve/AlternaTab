# Roadmap

## Phase 0: Stabilize the architecture
Goal: remove fragility, improve debuggability, make behavior deterministic, create strong extension boundaries.
Requirements:
- REQ-001: Persist MRU safely
- REQ-002: Build a typed runtime message router
- REQ-003: Introduce logging conventions
- REQ-004: Harden launcher window lifecycle
- REQ-005: Add tests for ranking and MRU

## Phase 1: Best-in-class tab switcher
Goal: unbeatable search + ranking + keyboard flow.
Requirements:
- REQ-101: Refactor search into a real ranking engine
- REQ-102: Improve result rendering
- REQ-103: Improve keyboard UX
- REQ-104: Add loading, empty, and error states

## Phase 2: Add result actions
Goal: switcher becomes command center.
Requirements:
- REQ-201: Introduce action architecture
- REQ-202: Implement tab actions
- REQ-203: Add action UI

## Phase 3: Expand into unified browser search
Goal: tabs + closed tabs + bookmarks + history.
Requirements:
- REQ-301: Introduce a unified result type
- REQ-302: Add recently closed tabs
- REQ-303: Add bookmarks search
- REQ-304: Add history search
- REQ-305: Introduce result source ranking policy

## Phase 4: Add personalization and adaptive ranking
Goal: launcher starts feeling smart.
Requirements:
- REQ-401: Track selection history
- REQ-402: Add learning-based ranking boosts
- REQ-403: Add domain aliases

## Phase 5: Add workspaces and session memory
Goal: create lock-in and real workflow value.
Requirements:
- REQ-501: Add workspace model
- REQ-502: Save workspace command
- REQ-503: Restore workspace
- REQ-504: Show workspaces in search results

## Phase 6: Introduce command mode
Goal: evolve into browser launcher.
Requirements:
- REQ-601: Add parser for command mode
- REQ-602: Add command result provider

## Phase 7: Add moat features
Goal: plugins, domain integrations, AI-ish intent.
Requirements:
- REQ-701: Duplicate tab detection
- REQ-702: Domain-specific actions
- REQ-703: Session timeline
- REQ-704: Plugin architecture
