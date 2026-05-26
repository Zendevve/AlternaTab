# Development

## Prerequisites

- **Node.js** 18+
- **npm** 9+
- **Google Chrome** 114+ (for extension testing)

## Setup

```bash
git clone <repository-url>
cd alternaTab
npm install
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | TypeScript check + production build to `dist/` |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Build extension + run Playwright E2E tests |
| `npm run package` | Build + create release ZIP in `release/` |
| `npm run verify:release` | Verify release artifact integrity |

## Dev Workflow

### Development Build

```bash
npm run dev
```

This starts Vite in watch mode. The extension is rebuilt on file changes. Reload the extension at `chrome://extensions` after each build.

### Production Build

```bash
npm run build
```

Output goes to `dist/`. The build performs TypeScript type checking first, then bundles with Vite. Console and debugger statements are stripped in production.

### Creating a Release

```bash
npm run package
```

Creates `release/alternatab-v1.0.0.zip` with the contents of `dist/`.

## Project Structure

```
src/
├── background/       # Service worker (MRU tracking, command routing)
├── content/          # Content script (overlay UI via Shadow DOM)
├── popup/            # Quick-action popup (toolbar icon)
├── options/          # Full settings page
├── onboarding/       # First-run walkthrough
└── shared/           # Adapter, storage, types (shared across contexts)
```

Each module has a corresponding `__tests__/` directory.

## Code Conventions

- **TypeScript** — strict mode enabled, `ES2022` target
- **Module resolution** — `bundler` mode, `@/` alias maps to `src/`
- **Imports** — ES modules with named exports. No default exports.
- **CSS** — Vanilla CSS, CSS custom properties for theming, no preprocessors
- **Shadow DOM** — content scripts use `mode: "closed"` for DOM isolation
<!-- VERIFY: all conventions are enforced by tsconfig.json and build tooling -->

## Constraints

- **Manifest V3** — service workers are short-lived. Use `chrome.alarms` for periodic tasks.
- **CSP** — no `unsafe-inline` or `unsafe-eval`. All styles bundled, textContent for DOM text.
- **Storage quotas** — sync storage capped at 100KB. Keep settings lightweight.
