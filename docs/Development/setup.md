# Development Setup

## Prerequisites

- Google Chrome (latest stable)
- Text editor (VS Code recommended)
- Git (optional, for version control)

## Installation

1. **Clone or download** this repository to your local machine
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the `alternaTab` folder

## Keyboard Shortcut

The default shortcut is **Alt+Q**. If Chrome blocks it or it conflicts with another extension:

1. Go to `chrome://extensions/shortcuts`
2. Find **AlternaTab**
3. Set your preferred key combination for "Toggle AlternaTab overlay"

## Development Workflow

### Making Changes

1. Edit the source files directly
2. Go to `chrome://extensions`
3. Click the **refresh** icon on the AlternaTab card
4. Test your changes (Alt+Q on any web page)

### Debugging

- **Background script**: `chrome://extensions` → AlternaTab → "Inspect views: service worker"
- **Content script**: Open DevTools on any page → Console (errors prefixed with `[AlternaTab]`)
- **Options page**: Right-click extension icon → Options → DevTools

### File Roles

| File | Purpose |
|------|---------|
| `manifest.json` | Extension configuration, permissions, commands |
| `background.js` | Service worker: tab queries, message routing, config storage |
| `content.js` | Overlay UI: rendering, keyboard handling, filtering |
| `overlay.css` | Overlay appearance |
| `options.html/js/css` | Settings page |

## Common Tasks

### Add a new message type

1. Add to `MESSAGE_TYPES` in `background.js`
2. Add matching entry in `content.js` `MESSAGE_TYPES`
3. Add handler in `inboundHandlers` object

### Add a new config option

1. Add default value in `cloneDefaultConfig()` in `background.js`
2. Add UI control in `options.html`
3. Handle in `populateForm()` and `buildPayload()` in `options.js`
4. Use in `content.js` via config hydration

### Modify overlay appearance

1. Edit `overlay.css` for styling
2. Refresh extension at `chrome://extensions`
3. Test on pages with different backgrounds

---

*See [Testing Strategy](../Testing/strategy.md) for verification steps.*
