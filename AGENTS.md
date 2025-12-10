# AGENTS.md — AlternaTab

> This file defines how AI coding agents work in this repository.
> It follows the [MCAF Guide](https://mcaf.guide) v1.0.

---

## Project Overview

| Attribute | Value |
|-----------|-------|
| **Name** | AlternaTab |
| **Type** | Chrome Extension (Manifest V3) |
| **Version** | 0.4.1-dev |
| **Language** | JavaScript (ES6+, vanilla) |
| **Purpose** | Alt+Tab-like overlay for Chrome tabs (Alt+Q shortcut) |

### Architecture

```
background.js    ← Service worker (commands, tab queries, config)
     ↓ messages
content.js       ← Overlay UI (keyboard nav, filtering, accents)
     ↓ events
options.js       ← Settings page (domain colors, preferences)
     ↓ storage
chrome.storage   ← Persistent configuration
```

### Design Philosophy

All development adheres to the [Five Pillars](docs/DESIGN_PRINCIPLES.md):

1. **Invisible Interface** — Content-first, zero visual noise
2. **Radical Efficiency** — Instant, lightweight, space-conscious
3. **Ergonomic Intelligence** — Keyboard-first, shortcut-driven
4. **Complexity on Demand** — Simple surface, deep power
5. **User Sovereignty** — Customizable, transparent, private

---

## Commands

| Task | Command |
|------|---------|
| **Load Extension** | Open `chrome://extensions`, enable Developer mode, click "Load unpacked", select this folder |
| **Test Overlay** | Press `Alt+Q` on any web page |
| **Open Options** | Right-click extension icon → Options, or navigate to `chrome-extension://<id>/options.html` |
| **Format** | Not configured (vanilla JS) |
| **Lint** | Not configured |

---

## Task Delivery

### Development Flow

1. **Read docs first** — Check `docs/Features/` for behavior specs, `docs/ADR/` for architecture decisions.
2. **Plan before coding** — For non-trivial changes, propose a plan including files to modify and test steps.
3. **Test manually** — Load extension, verify Alt+Q overlay, test keyboard navigation.
4. **Update docs** — If behavior changes, update relevant feature docs.

### Commit Messages

```
<type>: <short description>

<body if needed>
```

Types: `feat`, `fix`, `refactor`, `docs`, `chore`

---

## Testing Discipline

### Manual Testing (Required)

Chrome extensions have limited automated testing options. Manual verification is the primary method.

**Core Test Flows:**

1. **Overlay Toggle**
   - Press Alt+Q → Overlay appears with tab list
   - Press Alt+Q again or Escape → Overlay hides

2. **Tab Navigation**
   - Arrow Up/Down → Selection moves
   - Enter → Switches to selected tab
   - Delete → Closes selected tab

3. **Search/Filter**
   - Type characters → Filter appears, list filters
   - Escape → Clears filter
   - Ctrl+F → Opens search explicitly

4. **Options Page**
   - Open options → Settings load correctly
   - Change domain color → Saves and reflects in overlay
   - Reset → Restores defaults

5. **Recently Closed (Z)**
   - Close a tab with Delete → Press Z → Tab reopens
   - Verify multiple closes track correctly

6. **Multi-Select**
   - Ctrl+Click tabs → Checkboxes appear, items highlight
   - Ctrl+A → All tabs selected
   - Delete → All selected tabs close
   - Escape → Clears selection

7. **Audio Control (M)**
   - Play video in a tab → 🔊 icon appears
   - Press M → Tab mutes, icon changes to 🔇
   - Press M again → Tab unmutes

### Before Merging

- [ ] Extension loads without errors
- [ ] Alt+Q works on standard web pages
- [ ] All keyboard shortcuts function
- [ ] Options page saves/loads correctly
- [ ] No console errors in background script

---

## Code Style

### JavaScript

- **No framework** — Vanilla JavaScript only
- **IIFE pattern** — `content.js` uses an IIFE to avoid global pollution
- **Message types** — Use `MESSAGE_TYPES` constants, not string literals
- **Error handling** — Wrap chrome API calls in try/catch with console logging
- **Naming** — camelCase for functions/variables, UPPER_SNAKE for constants

### CSS

- **BEM-like classes** — `.alternatab-overlay`, `.alternatab-item`
- **CSS variables** — Use for theming and configuration
- **Transitions** — 150-200ms for UI feedback

### File Organization

```
alternaTab/
├── manifest.json       ← Extension manifest (MV3)
├── background.js       ← Service worker
├── content.js          ← Overlay injection + UI
├── overlay.css         ← Overlay styles
├── options.html        ← Settings page structure
├── options.js          ← Settings logic
├── options.css         ← Settings styles
├── icons/              ← Extension icons
├── docs/               ← MCAF documentation
│   ├── Features/       ← Feature specifications
│   ├── ADR/            ← Architecture decisions
│   ├── Development/    ← Setup and workflow
│   └── Testing/        ← Test strategy
├── AGENTS.md           ← This file
└── README.md           ← User-facing readme
```

---

## Boundaries

### Protected Areas

- **manifest.json** — Changes affect permissions and extension loading. Review carefully.
- **MESSAGE_TYPES** — Shared between files. Changes require updates in all files.

### Critical Patterns

- **Tab filtering** — `chrome://` and extension pages are excluded by design
- **MRU ordering** — Tabs sorted by `lastAccessed` for Alt+Tab behavior
- **Compact mode** — User preference persisted locally

---

## Self-Learning

When receiving feedback, categorize and act:

| Category | Action |
|----------|--------|
| **Directive** (must do/not do) | Add to Code Style or Boundaries |
| **Preference** (style, tone) | Add to Code Style |
| **Correction** (this is wrong) | Add to Boundaries with explanation |
| **Pattern** (recurring feedback) | Extract to relevant section |
| **Process** (workflow) | Update Task Delivery |

### Update Protocol

1. Identify if feedback applies locally (this file) or globally (docs)
2. Write the rule clearly and specifically
3. Remove conflicting or outdated rules
4. Keep rules actionable — avoid vague guidance

---

## Maintainer Preferences

- Keep code simple and readable over clever
- Prefer fewer files over many small ones
- Console logging is acceptable for debugging
- User-facing strings should be clear and helpful
- Prioritize keyboard users — this is a keyboard-first extension

---

*Last updated: 2025-12-08*
