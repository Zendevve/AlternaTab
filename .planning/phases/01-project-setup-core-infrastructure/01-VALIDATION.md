---
phase: 1
slug: project-setup-core-infrastructure
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-26
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/shared/__tests__/storage.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01 | 01 | 1 | N/A | static | `test -f src/manifest.json` | ❌ W0 | ⬜ pending |
| 01-02 | 01 | 1 | NFR-003 | unit | `npx vitest run src/shared/__tests__/storage.test.ts` | ❌ W0 | ⬜ pending |
| 01-03 | 01 | 1 | FR-006 | unit | `npx vitest run src/background/__tests__/tracker.test.ts` | ❌ W0 | ⬜ pending |
| 01-04 | 01 | 1 | FR-004 | unit | `npx vitest run src/shared/__tests__/adapter.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/shared/__tests__/storage.test.ts` — stubs for NFR-003
- [ ] `src/background/__tests__/tracker.test.ts` — stubs for FR-006
- [ ] `src/shared/__tests__/adapter.test.ts` — stubs for FR-004

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending 2026-05-26
