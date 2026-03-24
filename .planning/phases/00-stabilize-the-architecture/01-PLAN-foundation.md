# Phase 0: Stabilize the architecture

## Frontmatter
- wave: 1
- depends_on: []
- files_modified: ["src/shared/logger.ts", "src/shared/messages.ts", "src/shared/contracts.ts", "src/background/router.ts", "src/background/services/mruService.ts", "src/background/services/launcherWindowService.ts", "src/background/index.ts"]
- autonomous: false
- requirements_addressed: ["REQ-001", "REQ-002", "REQ-003", "REQ-004", "REQ-005"]

## Objectives
- Remove fragility, improve debuggability, make behavior deterministic, create strong extension boundaries to support later phases.

## Tasks

<task>
<description>Implement Logger and Typed Message Router</description>
<read_first>
- src/background/index.ts
</read_first>
<action>
1. Create `src/shared/logger.ts` exporting an object with `debug`, `info`, `warn`, and `error` parameters. It should wrap console logging.
2. Create `src/shared/messages.ts` and `src/shared/contracts.ts` (if it doesn't exist). Define a discriminated union `RequestMessage` (e.g. GET_RESULTS, SWITCH_TAB, etc.) and a generic `Response<T>` type with Success or Failure branches.
3. Create `src/background/router.ts` to expose a function that registers a `chrome.runtime.onMessage` listener and centralizes the routing using the discriminated union.
</action>
<acceptance_criteria>
- `src/shared/logger.ts` contains `export const logger =`
- `src/shared/messages.ts` contains `type RequestMessage`
- `src/background/router.ts` contains `chrome.runtime.onMessage.addListener`
</acceptance_criteria>
</task>

<task>
<description>Implement Persisted MRU Service</description>
<read_first>
- src/background/mru.ts
</read_first>
<action>
1. Create `src/background/services/mruService.ts`.
2. Define `PersistedMRUState` type with `orderedTabIds: number[]` and `updatedAt: number`.
3. Implement `chrome.storage.local` persistence for MRU to store up to 500 tab IDs.
4. Export functions: `hydrate()`, `touch(tabId)`, `remove(tabId)`, `rank(tabId)`, `getOrderedIds()`, `pruneAgainstOpenTabs(openTabIds)`.
</action>
<acceptance_criteria>
- `src/background/services/mruService.ts` contains `hydrate(): Promise<void>`
- `src/background/services/mruService.ts` uses `chrome.storage.local`
</acceptance_criteria>
</task>

<task>
<description>Implement Launcher Window Manager</description>
<read_first>
- src/background/window.ts
</read_first>
<action>
1. Create `src/background/services/launcherWindowService.ts`.
2. Move the window creation and tracking logic from `src/background/window.ts` into this service.
3. Export functions: `openOrFocusLauncher()`, `isLauncherOpen()`, `clearLauncherReference()`.
4. Register the close listener within the service to clear the reference when the window closes or loses focus.
</action>
<acceptance_criteria>
- `src/background/services/launcherWindowService.ts` contains `openOrFocusLauncher()`
- The service maintains a reference to the active launcher window ID to prevent duplicates.
</acceptance_criteria>
</task>

<task>
<description>Update Background Entry Point</description>
<read_first>
- src/background/index.ts
- src/background/window.ts
- src/background/mru.ts
</read_first>
<action>
1. Update `src/background/index.ts` to call `hydrate()` on the `mruService` at startup.
2. Hook up `chrome.tabs.onActivated` and `chrome.tabs.onRemoved` to call the `mruService` methods.
3. Initialize the message router from `src/background/router.ts`.
4. Update command listeners (e.g., standard extension hotkeys) to trigger `launcherWindowService.openOrFocusLauncher()`.
</action>
<acceptance_criteria>
- `src/background/index.ts` imports and calls `hydrate()`
- No raw MRU state remains in `index.ts`
</acceptance_criteria>
</task>

<task>
<description>Add Tests for Services and Ranking</description>
<read_first>
- src/background/services/mruService.ts
</read_first>
<action>
1. Set up a testing framework (e.g. Vitest) if not already configured in `package.json`.
2. Create `src/background/services/__tests__/mruService.test.ts` to verify tab addition, pruning, and ranking queries.
3. Create `src/launcher/lib/__tests__/ranking.test.ts` outlining deterministic ranking constants.
</action>
<acceptance_criteria>
- `src/background/services/__tests__/mruService.test.ts` exists and contains at least one test block verifying MRU persistence behavior.
</acceptance_criteria>
</task>

## Verification
<must_haves>
- MRU ordering persists across extension service worker reloads.
- The extension message router has typed responses and catches unexpected errors gracefully.
- Only one launcher window opens at a time (preventing duplicates).
</must_haves>
