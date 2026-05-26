# Getting Started

## Installation

### From Chrome Web Store
<!-- VERIFY: link requires publishing to Chrome Web Store -->
Install from the Chrome Web Store (link TBD — extension not yet published).

### From Source (Developer Mode)

```bash
git clone <repository-url>
cd alternaTab
npm install
npm run build
```

Then load the extension in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist/` directory

## Usage

### Basic Switching

1. Press **Alt+Q** on any page — the tab switcher overlay appears
2. While **Alt** is held, press **Q** repeatedly to cycle through recent tabs
3. Release **Alt** to switch to the selected tab
4. Press **Esc** to dismiss without switching

### Hold Mode (Default)

The overlay appears as long as **Alt** is held. Releasing **Alt** confirms the selection. This mirrors the OS-level Alt+Tab behavior.

### Toggle Mode

The overlay stays open after you release **Alt**. Navigate with arrow keys or Q, confirm with **Enter**, dismiss with **Esc**.

Switch between modes in the popup (click the extension toolbar icon) or in the Options page.

### Navigation Controls

| Action | Input |
|--------|-------|
| Cycle forward | **Alt+Q** or **Alt+Tab** |
| Cycle backward | **Alt+Shift+Q** |
| Navigate (grid) | Arrow keys (4-directional) |
| Navigate (list) | Up/Down arrows |
| Confirm | **Enter** or **Space** |
| Dismiss | **Esc** or release **Alt** (hold mode) |

### First Run

On first install, the onboarding walkthrough opens automatically with:

1. **Welcome** — overview and mode selection (Hold vs Toggle)
2. **Playground** — an interactive sandbox to try the switcher before using it on real tabs
3. **Shortcuts** — configure your preferred hotkey

### Popup

Click the extension toolbar icon to:

- Toggle **theme** (auto/light/dark)
- Toggle **card layout** (grid/list)
- View tracked tab count
- Open full Options page
- Configure keyboard shortcuts

### Options Page

Right-click the toolbar icon and select **Options**, or open from the popup:

- Adjust **max visible tabs** (3–15 slider)
- Choose **activation mode** (hold / toggle)
- Select **theme** (auto/light/dark)
- Choose **card layout** (grid / list)
- Toggle **window badges**
