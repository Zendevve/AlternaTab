# Configuration

## User Settings

Settings are stored in `chrome.storage.sync` under the `user_settings` key and sync across Chrome profiles.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `maxVisible` | number (3–15) | `9` | Maximum tabs shown in the switcher overlay |
| `activationMode` | `"hold"` or `"toggle"` | `"hold"` | Hold: release Alt to switch. Toggle: stay open until Enter/click |
| `theme` | `"auto"`, `"light"`, or `"dark"` | `"auto"` | Color scheme. Auto follows `prefers-color-scheme` |
| `cardLayout` | `"grid"` or `"list"` | `"grid"` | Overlay card arrangement |
| `showWindowBadge` | boolean | `true` | Show window ID badge for tabs in other windows |

## Storage Schema

### Normal MRU History (`chrome.storage.local`)

Key: `mru_history`  
Value: `MRUEntry[]`

```
{
  tabId: number,
  windowId: number,
  lastActive: number  // Unix timestamp
}
```

Max 50 entries. Persisted after every tab activation, creation, or removal.

### Incognito MRU History (`chrome.storage.session`)

Key: `incognito_mru_history`  
Same schema as normal MRU. Uses session storage so data is never persisted to disk and is cleared when the browser closes.

## Keyboard Shortcuts

| Shortcut | Context | Action |
|----------|---------|--------|
| **Alt+Q** (default) | Global | Toggle tab switcher overlay |
| **Alt+Q** | Overlay open | Cycle forward through tabs |
| **Alt+Shift+Q** | Overlay open | Cycle backward through tabs |
| **Arrow keys** | Overlay open | Navigate (grid: 4-directional, list: up/down) |
| **Enter / Space** | Overlay open | Confirm selection |
| **Esc** | Overlay open | Dismiss without switching |
| **Tab / Alt+Tab** | Overlay open | Cycle forward (while Alt held) |

Shortcuts can be customized at `chrome://extensions/shortcuts`.
