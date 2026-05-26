# Testing

## Test Suites

| Suite | Tool | Location | Purpose |
|-------|------|----------|---------|
| Unit tests | Vitest | `src/**/__tests__/` | Core logic: MRU tracking, storage, key handling, adapter |
| E2E tests | Playwright | `e2e/` | Extension behavior: overlay, popup, options, onboarding |

## Running Tests

```bash
# Unit tests (fast, no browser needed)
npm test

# E2E tests (requires Chrome + built extension)
npm run test:e2e
```

## Unit Tests

Unit tests use Vitest with the `node` environment and globals enabled. They validate:

- **MRUTracker** — tab ordering, incognito isolation, pruning, history persistence
- **StorageManager** — CRUD operations, in-memory fallback, incognito vs normal storage
- **KeyHandler** — keyboard navigation, cycle logic, hold/toggle modes
- **ChromeTabAdapter** — API querying, tab switching (using MockTabAdapter for isolation)
- **Background index** — restricted URL detection, command routing

The `MockTabAdapter` provides simulated Chrome API events (`triggerActivated`, `triggerRemoved`, `triggerCreated`) for deterministic testing without a real browser.

## E2E Tests

E2E tests use Playwright with a real Chrome profile. Run with:

```bash
npm run build    # Build extension first
npm run test:e2e # Run Playwright tests
```

The extension must be built before running E2E tests (they test the built `dist/` output).

**Important:** E2E tests run sequentially (`workers: 1`) to avoid profile lock conflicts. They run in headed mode because Chrome extensions require it.

### Test Files

| File | Covers |
|------|--------|
| `e2e/switcher.spec.ts` | Overlay rendering, keyboard navigation, tab switching |
| `e2e/popup.spec.ts` | Popup UI, quick toggles, tracked tab count |
| `e2e/options.spec.ts` | Settings page, save/load flow |
| `e2e/onboarding.spec.ts` | Walkthrough wizard, mode selection, sandbox demo |

## Test Configuration

- **Vitest config:** `vitest.config.ts` — `node` environment, `@/` alias
- **Playwright config:** `playwright.config.ts` — sequential workers, headed mode
