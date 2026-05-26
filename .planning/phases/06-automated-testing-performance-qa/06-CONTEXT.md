# Phase 6: Automated Testing & Performance QA - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Establishes full automated testing including Playwright E2E browser tests to assert extension correctness, and verifies execution speed constraints. Unit tests are already in place and fully passing (45 tests covering popup, options, background, content, onboarding, and storage). This phase will focus on setting up Playwright for E2E tests, verifying that the built extension can be loaded by Playwright, and asserting core user lifecycles (opening options, popup, running onboarding, injecting overlay content scripts, and measuring render speeds).

</domain>

<decisions>
## Implementation Decisions

### E2E Testing with Playwright
- Scaffold a Playwright setup inside `e2e/` folder.
- Configure `playwright.config.ts` to launch Chromium with the unpacked extension loaded from the `dist/` folder.
- Build fixtures to dynamically resolve the loaded extension's ID.
- Create tests for:
  - Welcome Onboarding flow page loading and wizard navigation.
  - Options page form updates and instant sync persistence.
  - Popup layout elements and links redirection.
  - Injecting switcher overlay mock environment or testing overlay rendering behavior.

### Performance QA Benchmarks
- Measure first-load and render latency of the switcher overlay to ensure it meets our target of under 16ms (60 FPS rendering latency) or typical loading times under 100ms.
- Log average launch speeds inside the test reports.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets & Integration Points
- `dist/` - Playwright will load this directory directly as the unpacked extension.
- `package.json` - Add scripts `test:e2e` for Playwright execution.
- Existing `vitest` config for unit tests, ensuring no conflict.

</code_context>

<specifics>
## Specific Ideas
- Set up a robust `fixtures.ts` that launches Chromium and extracts the dynamic extension ID safely.
- Write tests that open the onboarding, popup, and options page.

</specifics>

<deferred>
## Deferred Ideas
None.

---
*Phase: 06-automated-testing-performance-qa*
*Context gathered: 2026-05-26*
