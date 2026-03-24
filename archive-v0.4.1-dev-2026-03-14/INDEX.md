# AlternaTab Archive - v0.4.1-dev

**Archived:** 2026-03-14
**Original Version:** 0.4.1-dev

---

## Archive Contents

### Root Level Files
- `manifest.json` - Chrome Extension Manifest V3
- `background.js` - Service worker (commands, tab queries, config)
- `content.js` - Overlay injection + UI
- `overlay.css` - Overlay styles
- `options.html` - Settings page structure
- `options.js` - Settings logic
- `options.css` - Settings styles
- `AGENTS.md` - AI agent rules and guidelines
- `README.md` - User-facing documentation

### Documentation (`docs/`)
- `DESIGN_PRINCIPLES.md` - Five Pillars design philosophy
- `Home.md` - Project home/documentation index
- `ADR/001-manifest-v3.md` - Architecture decision record
- `ADR/002-message-passing.md` - Architecture decision record
- `Development/setup.md` - Development setup guide
- `Features/search-filter.md` - Search/filter feature specification
- `Features/settings.md` - Settings feature specification
- `Features/tab-overlay.md` - Tab overlay feature specification
- `Testing/strategy.md` - Testing strategy document

### Source Code (`src/`)
- `shared/constants.js` - Shared constants
- `shared/utils.js` - Utility functions

### Icons (`icons/`)
- `icon16.png` - 16x16 extension icon
- `icon48.png` - 48x48 extension icon
- `icon128.png` - 128x128 extension icon

---

## Version History

### v0.4.1-dev (This Archive)
- Chrome Extension (Manifest V3)
- Alt+Tab-like overlay for Chrome tabs
- Alt+Q shortcut to trigger overlay
- Keyboard navigation support
- Search/filter functionality
- Settings/options page
- Domain color customization

---

## Notes for Future Development

This archive contains the complete codebase for AlternaTab version 0.4.1-dev. The user plans to build a better version from the ground up, incorporating lessons learned and new improvements.

### Key Features Implemented
1. Overlay toggle (Alt+Q)
2. Tab navigation (arrows, Enter, Delete)
3. Search/filter (typing, Escape, Ctrl+F)
4. Recently closed tabs (Z key)
5. Multi-select (Ctrl+Click, Ctrl+A, Delete)
6. Audio control (M key to mute/unmute)
7. Options page with domain colors

### Architecture
- Service worker (`background.js`) for Chrome API
- Content script (`content.js`) for overlay UI
- Message passing between background and content
- Local storage for settings

---

*This archive was automatically created to preserve the progress of AlternaTab v0.4.1-dev before starting development of a new version.*
