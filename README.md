# AlternaTab — Alt-Tab for Chrome Tabs

## Installation (developer mode)

1. Save this folder to disk.
2. Open `chrome://extensions` in Chrome.
3. Enable "Developer mode".
4. Click "Load unpacked" and select this folder.
5. Press Alt+Q to toggle the overlay. If Chrome blocks the shortcut, set it under `chrome://extensions/shortcuts`.

## Usage

- Use Arrow Up/Down to navigate.
- Press Enter to switch to the selected tab.
- Press Delete to close the selected tab.
- Press Escape to hide the overlay.

## Files

- `manifest.json`
- `background.js`
- `content.js`
- `overlay.css`
- `icons/` (place `icon16.png`, `icon48.png`, `icon128.png` here)

## Notes

- Tab list is ordered by `lastAccessed` (MRU) where available.
- `chrome://` and extension pages are filtered out.
- Content script runs on all pages at `document_idle` for responsiveness.
- Keyboard shortcut: Alt+Q (configurable in Chrome shortcuts).
