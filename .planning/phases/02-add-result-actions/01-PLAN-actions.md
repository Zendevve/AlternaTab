# Phase 2: Add Result Actions

## Frontmatter
- wave: 1
- depends_on: ["Phase 1"]
- files_modified: ["src/shared/messages.ts", "src/background/tabs.ts", "src/background/router.ts", "src/launcher/App.tsx", "src/launcher/components/FooterHints.tsx"]
- autonomous: false
- requirements_addressed: ["REQ-201", "REQ-202", "REQ-203"]

## Objectives
- Introduce a suite of tab management actions executable directly from the launcher.

## Tasks

<task>
<description>Extend Message Router</description>
<read_first>
- src/shared/messages.ts
- src/background/router.ts
</read_first>
<action>
1. Add `PIN_TAB`, `UNPIN_TAB`, `DUPLICATE_TAB`, `MUTE_TAB`, `UNMUTE_TAB`, `MOVE_TO_NEW_WINDOW` to `MESSAGE_TYPES` in `messages.ts`.
2. Define their `Request` and `Response` generic shapes and union them into `ExtensionMessage` and `ExtensionResponse`.
3. Update `validateMessage` to parse the new generic payloads properly (they all just require `tabId: number`).
</action>
<acceptance_criteria>
- TypeScript compiles cleanly with the new discriminated unions.
</acceptance_criteria>
</task>

<task>
<description>Implement Background Handlers</description>
<read_first>
- src/background/tabs.ts
- src/background/router.ts
</read_first>
<action>
1. In `tabs.ts`, implement `handleTogglePin`, `handleDuplicate`, `handleToggleMute`, `handleMoveToNewWindow`, and full logic for `handleCloseTab`.
2. Ensure they return standardized `Success<T>` or `Failure` responses.
3. Wire the new handlers into the `chrome.runtime.onMessage` listener switch statement inside `router.ts`.
</action>
<acceptance_criteria>
- Background service worker can successfully execute all tab actions via Chrome APIs.
</acceptance_criteria>
</task>

<task>
<description>Action UI and Keyboard Shortcuts</description>
<read_first>
- src/launcher/App.tsx
- src/launcher/components/FooterHints.tsx
</read_first>
<action>
1. Update keyboard event handling in `App.tsx` (or an extracted `useTabActions.ts` hook) to intercept `Ctrl/Meta` modifier keys paired with `W, P, D, M, C, N`.
2. Dispatch the respective messages to the background script.
3. Re-query the tab list (or optimistically update the UI) after a mutating action like closing a tab.
4. Update `FooterHints.tsx` to display key combinations (e.g. `⌘W Close`, `⌘P Pin`).
</action>
<acceptance_criteria>
- Keyboard shortcuts trigger background runtime messages.
- Footer displays new hints.
</acceptance_criteria>
</task>

## Verification
<must_haves>
- Sending an action like Close Tab immediately removes the tab from the Chrome browser and updates the launcher list.
- Modifiers don't conflict with system shortcuts (use `e.preventDefault()`).
</must_haves>
