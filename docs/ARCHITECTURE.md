# Architecture

## Overview

alternaTab is a Manifest V3 Chrome extension built with TypeScript 5, Vite 5, and vanilla CSS. It uses an adapter pattern to decouple business logic from the Chrome API, enabling unit-testable core modules.

## Module Layout

```
src/
├── background/       # Service worker (persistent MRU tracking, command routing)
│   ├── index.ts      # Extension entry point: command handler, alarms, messaging
│   └── tracker.ts    # MRUTracker — in-memory MRU list with chrome.storage persistence
├── content/          # Content script (overlay UI injected into every page)
│   ├── index.ts      # OverlayController — Shadow DOM, rendering, event wiring
│   ├── keyhandler.ts # KeyHandler — keyboard state machine, modal cycle logic
│   └── overlay.css   # Glassmorphism styles with light/dark theme variables
├── popup/            # Popup UI (quick-action settings from toolbar icon)
│   ├── index.html
│   ├── index.ts
│   └── index.css
├── options/          # Full settings page (opened in a tab)
│   ├── index.html
│   ├── index.ts
│   └── index.css
├── onboarding/       # First-run walkthrough (3-step wizard with sandbox demo)
│   ├── index.html
│   ├── index.ts
│   └── index.css
└── shared/           # Shared logic used by all extension contexts
    ├── adapter.ts    # TabAdapter interface + ChromeTabAdapter + MockTabAdapter
    └── storage.ts    # StorageManager — chrome.storage wrapper with in-memory fallback
```

## Data Flow

### Tab Switching Flow

1. User presses **Alt+Q** in any page
2. **Background service worker** receives `chrome.commands.onCommand`
3. Worker checks `isRestrictedUrl()` — blocks on `chrome://` and CWS pages
4. Worker loads `UserSettings` from `chrome.storage.sync` and MRU list from `chrome.storage.local` (or `chrome.storage.session` for incognito)
5. Worker sends `toggle-switcher` message to the active tab's content script
6. **Content script** `OverlayController` receives the message, creates a closed Shadow DOM overlay
7. **KeyHandler** manages keyboard input — cycling, confirming, dismissing
8. On confirm, the content script sends `switch-to-tab` back to the worker
9. Worker calls `chrome.tabs.update` + `chrome.windows.update`

### MRU Tracking Flow

1. On extension start, `MRUTracker.initialize()` loads persisted MRU history from storage
2. Listens to `onTabActivated`, `onTabCreated`, `onTabRemoved` events via the adapter
3. Maintains two separate MRU lists (normal + incognito) with max 50 entries each
4. Persists to `chrome.storage.local` (normal) or `chrome.storage.session` (incognito) after every change
5. Hourly `mru-cleanup` alarm prunes stale/closed tab references

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Closed Shadow DOM** | Prevents host page from reading or tampering with the switcher overlay |
| **Adapter Pattern** | `TabAdapter` interface abstracts Chrome API for testability with `MockTabAdapter` |
| **Split Incognito Storage** | Incognito MRU stored only in `chrome.storage.session` to prevent leaks |
| **Glassmorphism Theme** | CSS custom properties enable light/dark/auto themes without a CSS-in-JS dependency |
| **Vanilla HTML/CSS** | No framework dependency — popup, options, and onboarding use plain HTML and CSS for minimal bundle size |

## Extension Contexts

| Context | Runtime | Lifetime | Responsibilities |
|---------|---------|----------|------------------|
| Background Service Worker | Chrome Extension API | Short-lived (MV3 sleep after ~30s) | MRU tracking, command handling, tab switching |
| Content Script | Injected into each tab | Per page session | Overlay rendering, keyboard handling |
| Popup | Toolbar click | While popup is open | Quick settings toggles, MRU count display |
| Options Page | User-opened tab | While tab is open | Full settings management |
| Onboarding | First install | Until closed | 3-step wizard, mode selection, sandbox demo |
