# Tab Launcher Powerhouse: Staging, Universal Fallback & Workspaces Plan

## Context
AlternaTab NextGen is an ultra-fast keyboard tab switcher for Chrome (SolidJS + WXT + uFuzzy). While single-tab switching and basic bulk commands (`close-duplicates`, `close-other`) are implemented, the launcher lacks three critical capabilities required for power use:
1. **Multi-Tab Staging & Batch Actions**: Users cannot non-contiguously select 3-10 tabs across query filters and execute batch operations (close, move to new window, suspend/discard, copy links, group).
2. **Universal Fallback on Restricted Pages**: On `chrome://*`, Web Store, or empty/unloaded tabs where content scripts cannot run, `toggle-overlay` fails silently and AlternaTab appears dead.
3. **Named Workspaces & Session Stashing**: Users cannot snapshot the current window or staged tabs into a named workspace and lazily restore them later directly from search.

This plan details the full implementation of all 3 phases in order.

---

## Approach

### Phase 1: Multi-Tab Staging & Non-Contiguous Batch Operations

#### 1.1 Messaging Protocol & Background Slices
- In `src/types/protocol.ts`:
  - Add `moveTabsToNewWindow(data: { tabIds: number[] }): Result<{ windowId: number; movedCount: number }>`.
  - Add `groupTabs(data: { tabIds: number[]; title?: string; color?: TabGroupColor }): Result<{ groupId: number; count: number }>`.
- In `src/background/tabs.ts`:
  - Implement `moveTabsToNewWindow(tabIds: number[])`:
    - Validates `tabIds.length > 0`.
    - Creates a new window using `chrome.windows.create({ tabId: tabIds[0] })`.
    - If `tabIds.length > 1`, calls `chrome.tabs.move(tabIds.slice(1), { windowId: newWindow.id, index: -1 })`.
    - Refreshes `tabStore`.
  - Implement `groupTabs(tabIds: number[], title?: string, color?: TabGroupColor)`:
    - Calls `chrome.tabs.group({ tabIds })`.
    - If `title` or `color` provided, calls `chrome.tabGroups.update(groupId, { title, color })`.
    - Refreshes `tabStore`.
- In `src/background/messaging.ts`:
  - Wire handlers for `moveTabsToNewWindow` and `groupTabs`.

#### 1.2 Interactive Staging State in Overlay UI
- In `src/content/App.tsx`:
  - Maintain `stagedTabIds` signal: `const [stagedTabIds, setStagedTabIds] = createSignal<Set<number>>(new Set())`.
  - Add helper `toggleStageTab(tabId: number)`:
    - Creates a new `Set` toggling presence of `tabId`.
  - Add helper `clearStagedTabs()`:
    - Resets `stagedTabIds` to empty `Set`.
  - Keyboard triggers:
    - In `src/content/hooks/useKeyboard.ts`:
      - Add `onToggleStageCurrent?: () => void` and `onClearStaged?: () => boolean` to `KeyboardHandlers`.
      - When typing in search input: `Shift+Space` or `Alt+Space` calls `handlers.onToggleStageCurrent()`.
      - When search input is empty: `Space` calls `handlers.onToggleStageCurrent()`.
      - In Vim mode: key `m` (mark/stage) calls `handlers.onToggleStageCurrent()`.
      - `Escape`: if `stagedTabIds().size > 0`, first `Escape` clears staging and returns true; second `Escape` dismisses the overlay.
  - Action hotkeys when `stagedTabIds().size > 0`:
    - `x` or `Delete` (when search query is empty or Shift modifier held): triggers `executeBatchClose()`.
    - `w`: triggers `executeBatchMove()`.
    - `s`: triggers `executeBatchSuspend()`.
    - `c`: triggers `executeBatchCopy()`.
    - `g`: triggers `executeBatchGroup()`.
- Batch Handlers in `src/content/App.tsx`:
  - `executeBatchClose()`:
    - Collects `const ids = Array.from(stagedTabIds())`.
    - Adds `ids` to `leavingTabIds` signal to trigger exit animations.
    - Calls `sendMessage("closeTabs", { tabIds: ids })`.
    - Clears staging.
  - `executeBatchMove()`:
    - Calls `sendMessage("moveTabsToNewWindow", { tabIds: Array.from(stagedTabIds()) })`.
    - Clears staging and closes overlay.
  - `executeBatchSuspend()`:
    - Calls `sendMessage("discardTabs", { tabIds: Array.from(stagedTabIds()) })`.
    - Clears staging, displays brief status confirmation ("Suspended N tabs").
  - `executeBatchCopy()`:
    - Gathers matching tabs from `store.tabs()`.
    - Formats Markdown list: `tabs.map(t => `- [${t.title}](${t.url})`).join("\n")`.
    - Copies to clipboard via `navigator.clipboard.writeText`.
    - Clears staging and displays status toast ("Copied N URLs to clipboard").
  - `executeBatchGroup()`:
    - Calls `sendMessage("groupTabs", { tabIds: Array.from(stagedTabIds()) })`.
    - Clears staging.

#### 1.3 Staging Visuals & DOM Representation
- In `src/content/components/TabRow.tsx`:
  - Accept `isStaged?: boolean` and `onToggleStage?: (tabId: number) => void`.
  - Render an interactive checkbox / staging indicator before favicon:
    - `class={`at-row-stage-check ${props.isStaged ? "at-staged-active" : ""}`}`
    - Clicking the checkmark toggles staging without activating the tab.
  - When `isStaged` is true, add `.at-row-staged` class to `div.at-row`.
- In `src/content/components/TabList.tsx`:
  - Pass `stagedTabIds` through to rows.
- In `src/content/components/StatusBar.tsx` & `App.tsx`:
  - When `stagedTabIds().size > 0`, render a prominent staged action pill in the footer:
    - `[✓ N tabs selected · (x) Close · (w) Move · (s) Sleep · (c) Copy · (g) Group · (Esc) Clear]`
- In `src/assets/styles/overlay.css`:
  - Add styles for `.at-row-staged` (subtle accent left-border and tinted background).
  - Add styles for `.at-row-stage-check` (Apple-style rounded check indicator with smooth transition).

---

### Phase 2: Universal Fallback on Restricted Browser Pages

#### 2.1 Fallback Detection in Background Service Worker
- In `src/background/events.ts`:
  - When `chrome.commands.onCommand` fires for `toggle-overlay`:
    1. Query active tab: `const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })`.
    2. Check if page is restricted:
       - URL matches restricted patterns: `!activeTab?.url || activeTab.url.startsWith("chrome://") || activeTab.url.startsWith("chrome-extension://") || activeTab.url.startsWith("https://chromewebstore.google.com") || activeTab.url.startsWith("view-source:")`.
    3. If not restricted, attempt `await chrome.tabs.sendMessage(activeTab.id, { type: "TOGGLE_ALTERNATAB_OVERLAY" })`.
    4. If restricted OR `sendMessage` throws:
       - Fallback to opening the action popup / side panel fallback:
         - Call `chrome.action.openPopup()` (supported in Chrome 99+ MV3).
         - If `openPopup()` fails or is unavailable, create a standalone pinned overlay tab: `chrome.tabs.create({ url: chrome.runtime.getURL("options.html?mode=hud") })`.
- In `src/options/App.tsx`:
  - Check for URL parameter `mode=hud`.
  - When `mode=hud`, render the overlay UI directly in full-frame viewport so the user gets identical functionality on any restricted surface.

---

### Phase 3: Named Workspaces & Session Stashing

#### 3.1 Data Model & Persistence
- In `src/types/models.ts`:
  - Define `WorkspaceTab`: `{ title: string; url: string; pinned: boolean; favIconUrl?: string; domain: string }`.
  - Define `WorkspaceItem`:
    ```ts
    export interface WorkspaceItem {
      id: string;
      name: string;
      createdAt: number;
      updatedAt: number;
      tabs: WorkspaceTab[];
    }
    ```
  - Add `"workspaces"` to `SearchScope`.
  - Add `"workspaces"` to `LauncherKind`.
- In `src/background/storage.ts`:
  - Add storage key `WORKSPACES_STORAGE_KEY = "alternatab_workspaces"`.
  - Implement `loadWorkspaces(): Promise<WorkspaceItem[]>`.
  - Implement `saveWorkspace(name: string, windowId?: number): Promise<WorkspaceItem>`.
  - Implement `deleteWorkspace(id: string): Promise<void>`.
  - Implement `restoreWorkspace(id: string, newWindow?: boolean): Promise<{ openedCount: number }>`.
    - Reads workspace tabs.
    - Creates window or tabs with `chrome.tabs.create({ url, active: index === 0 })`.
    - If `index > 0`, calls `chrome.tabs.discard(newTab.id)` so tabs are restored without consuming RAM.

#### 3.2 Protocol & Commands
- In `src/types/protocol.ts`:
  - Add `getWorkspaces(): WorkspaceItem[]`.
  - Add `saveWorkspace(data: { name: string; windowId?: number }): Result<WorkspaceItem>`.
  - Add `deleteWorkspace(data: { id: string }): Result<void>`.
  - Add `restoreWorkspace(data: { id: string; newWindow?: boolean }): Result<{ openedCount: number }>`.
- In `src/background/commands.ts`:
  - Add built-in command `save-workspace`:
    - Prompts or generates workspace named `"Workspace <Date/Window>"`.
  - Add built-in command `view-workspaces`:
    - Switches search scope to `workspaces`.

#### 3.3 Search & Launching Integration
- In `src/state/searchStore.ts`:
  - Add `workspaces` signal and index workspace items into fuzzy search.
  - When selected item is a `WorkspaceItem`:
    - Hitting `Enter` restores the workspace.
    - Context actions allow deleting or opening in new window.

---

## Critical files & anchors

1. `src/types/protocol.ts` (`ProtocolMap`): Type-safe message contracts for batch operations and workspaces.
2. `src/background/tabs.ts` (`moveTabsToNewWindow`, `groupTabs`): Background Chrome API implementations.
3. `src/content/App.tsx` (`stagedTabIds`, `handleKeyDown`, batch handlers): Interactive staging orchestration.
4. `src/content/components/TabRow.tsx` (`isStaged`, `at-row-stage-check`): Staging checkmark and visual styling.
5. `src/background/events.ts` (`toggle-overlay` listener): Fallback dispatch when active page is restricted.

---

## Verification

1. **Unit & Logic Tests**:
   - Add `tests/unit/staging.test.ts`:
     - Test toggling IDs in `Set<number>`.
     - Test markdown link formatter for batch copy.
   - Add `tests/unit/workspaces.test.ts`:
     - Test serializing and deserializing workspace records with validation.
   - Run `pnpm test`.
2. **Typecheck & Build**:
   - Run `pnpm run typecheck` (`tsc --noEmit`).
   - Run `pnpm run build` (`wxt build`).
3. **End-to-End Observable Behavior**:
   - Load built extension into Chrome.
   - Press `Alt+Q`, type a query, press `Space` or `Shift+Space` on 3 tabs. Observe checkmarks and status pill displaying `3 tabs selected`.
   - Press `c`: verify clipboard contains 3 markdown formatted links.
   - Press `x`: verify all 3 tabs animate out and close simultaneously.
   - Navigate to `chrome://extensions`, press `Alt+Q`: verify fallback view triggers instead of failing silently.
