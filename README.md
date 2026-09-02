# AlternaTab NextGen

> Ultra-fast, keyboard-first tab switcher, fuzzy search, and command HUD for Chromium browsers.

Why not Chrome's Ctrl+Shift+A? — frecency-ranked tabs + history/bookmarks, Vim/Emacs keys, 20+ commands, no mouse, quicklinks (!yt/!gh) and web fallback.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Solid.js](https://img.shields.io/badge/Solid.js-1.9+-2C4F7C?logo=solid&logoColor=white)](https://www.solidjs.com/)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest_V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: Proprietary](https://img.shields.io/badge/License-Personal_Use_Only-orange.svg)](#license)

AlternaTab NextGen replaces slow, mouse-bound tab browsing with a high-performance, command-driven HUD that opens with a single keystroke. Search across hundreds of tabs, manage windows, deduplicate tabs, suspend idle memory, and execute browser commands without leaving the keyboard.
---

## Highlights

- **Zero UI Bleed**: Isolated in a closed Shadow DOM (`#alternatab-host`) with constructable stylesheets (`adoptedStyleSheets`). Immune to host page styles and prevents style leaks.
- **Sub-Millisecond Search**: Local search indexing via `@leeoniya/ufuzzy` against a local cache snapshot. Never stalls on network or API latency.
- **Frecency Ranking**: Combines activation count frequency ($\ln(1 + C)$) with exponential time decay ($H = 180\text{ min}$) and contextual multipliers (pinned 1.35x, audio 1.50x, current window 1.20x).
- **Prefix Scopes**: Instantly filter query targets using prefix triggers:
  - `@` &rarr; Tabs
  - `#` &rarr; Native Chrome Tab Groups
  - `*` &rarr; Bookmarks
  - `>` &rarr; Command Palette
- **20 Built-in Commands**: Tab deduplication, domain clustering, background suspending, session export, URL copying, and window consolidation.
- **Keyboard Profiles**: Full out-of-the-box support for **Standard** (arrow keys), **Vim** (`j`/`k`/`d`/`x`/`o`/`p`/`m`/`gg`/`G`), and **Emacs** (`Ctrl+N`/`Ctrl+P`/`Ctrl+W`/`Ctrl+G`).
- **MV3 Resilient**: Robust three-tier architecture (L1 memory cache, L2 `chrome.storage.session`, L3 `chrome.storage.local`). Survives arbitrary service worker restarts without state corruption.
- **Visual Themes**: Dark Slate, Light, OLED True Black, and System Adaptive with customizable glass blur (0–24px) and domain accents.

---

## Default Global Hotkey

- **Windows & Linux**: `Alt+Q`
- **macOS**: `Command+Shift+K`

*(Customizable via `chrome://extensions/shortcuts`)*

---

## Keyboard Profiles

### Standard Profile (Default)
| Key | Action |
|---|---|
| `↑` / `↓` | Navigate results |
| `Enter` | Activate selected tab / execute command |
| `Ctrl+Enter` / `Cmd+Enter` | Move selected tab to new window |
| `Tab` | Cycle search scope (`all` &rarr; `window` &rarr; `tabs` &rarr; `groups` &rarr; `bookmarks` &rarr; `commands`) |
| `Shift+Tab` | Toggle Context Actions drawer |
| `Delete` / `Backspace` | Close selected tab (when query is empty) |
| `Escape` | Clear search query / Close overlay |

### Vim Profile
| Key | Action |
|---|---|
| `j` / `k` | Next / Previous result |
| `Enter` / `o` | Open selected tab |
| `d` / `x` | Close selected tab |
| `p` | Toggle pin on selected tab |
| `m` | Toggle mute on selected tab |
| `gg` | Jump to first result |
| `G` | Jump to last result |
| `/` | Focus search input |
| `Escape` | Clear query / Close overlay |

### Emacs Profile
| Key | Action |
|---|---|
| `Ctrl+N` | Next result |
| `Ctrl+P` | Previous result |
| `Ctrl+W` | Close selected tab |
| `Ctrl+G` | Cancel / Close overlay |
| `Enter` | Open selected tab |

---

## Built-In Commands (`>`)

Type `>` in the search input to enter Command Palette mode:

| Command | Action |
|---|---|
| `> close duplicates` | Closes tabs with duplicate normalized URLs (keeps active/pinned copy) |
| `> group domain` | Groups tabs into native Chrome groups by hostname with stable colors |
| `> suspend inactive` | Discards tabs inactive > 30 mins to reclaim system memory |
| `> close left` | Closes unpinned tabs to the left of the selected tab |
| `> close right` | Closes unpinned tabs to the right of the selected tab |
| `> close other` | Closes all other unpinned tabs in the current window |
| `> mute all` | Mutes all currently audible tabs |
| `> pin toggle` | Toggles pinned state on the selected tab |
| `> split window` | Detaches selected tab into a new window |
| `> merge windows` | Merges all open windows into the active window |
| `> sort title` | Alphabetically sorts tabs in current window |
| `> sort domain` | Groups/sorts tabs by domain then title |
| `> sort mru` | Sorts tabs by most recently used order |
| `> restore tab` | Reopens the most recently closed tab |
| `> export session` | Exports window & tab tree as JSON to clipboard |
| `> copy urls` | Formats all tabs as a Markdown link list |
| `> reload all` | Reloads all tabs in the active window |
| `> toggle theme` | Cycles theme (Light &rarr; Dark &rarr; OLED) |
| `> toggle vim` | Toggles Vim keybindings on/off |
| `> open settings` | Opens the AlternaTab configuration page |

---

## Architecture & Codebase

```text
src/
├── types/          # Strict TypeScript interfaces, models, and messaging protocols
├── utils/          # Pure modules: frecency, search, sorting, domain, URL normalization
├── state/          # L1 memory caches: tabStore, configStore, sessionStore, searchStore
├── background/     # MV3 Service Worker: Chrome API orchestration, RPC handlers, events
├── content/        # Closed Shadow DOM HUD, Solid.js UI, keyboard state machine
└── options/        # Options UI: theme switcher, keyboard profiles, blur & ranking dials

entrypoints/        # WXT bundle entrypoints (background, content, options)
tests/
├── unit/           # Vitest unit test suites
└── e2e/            # Playwright browser integration tests with live extension loading
```

---

## Development & Build

### Prerequisites
- Node.js 20+
- pnpm 9+

### Commands
```bash
# Install dependencies
pnpm install

# Run linter
pnpm run lint

# Check TypeScript strict typing
pnpm run typecheck

# Run unit tests (Vitest)
pnpm run test

# Run end-to-end tests in Chromium (Playwright)
pnpm run test:e2e

# Build extension for Chrome MV3 (.output/chrome-mv3)
pnpm run build
```

### Loading into Chrome
1. Navigate to `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select the `.output/chrome-mv3` directory.
5. Press `Alt+Q` (or `Command+Shift+K` on macOS) to launch AlternaTab.

---

## License

Copyright &copy; 2026 Zendevve. All rights reserved.

Licensed under the **Limited Personal Use Terms**. See [LICENSE](LICENSE) for full details.
