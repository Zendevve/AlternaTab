# ADR-002: Message Passing Architecture

## Status

**Accepted** — Implemented in current version

## Context

Chrome extensions have isolated contexts:
- **Service worker** (`background.js`) — Has access to `chrome.tabs`, `chrome.storage`, privileged APIs
- **Content scripts** (`content.js`) — Run in web page context, can manipulate DOM
- **Options page** (`options.js`) — Extension page context

These contexts cannot directly share state or call each other's functions.

## Decision

Use **chrome.runtime.sendMessage/onMessage** for all cross-context communication with a typed message protocol.

```javascript
const MESSAGE_TYPES = Object.freeze({
  SHOW_OVERLAY: 'SHOW_OVERLAY',
  ACTIVATE_TAB: 'ACTIVATE_TAB',
  CLOSE_TAB: 'CLOSE_TAB',
  REQUEST_CONFIG: 'REQUEST_CONFIG',
  UPDATE_CONFIG: 'UPDATE_CONFIG',
  RESET_CONFIG: 'RESET_CONFIG',
  CONFIG_CHANGED: 'CONFIG_CHANGED',
  ERROR: 'ERROR'
});
```

All messages include:
- `type` — Constant from `MESSAGE_TYPES`
- Payload fields as needed
- Responses wrapped in `{ ok: boolean, ...data }` or `{ ok: false, error: string }`

## Consequences

### Positive

- Clear contract between contexts
- Easy to add new message types
- Debuggable via console logging
- Type constants prevent typos

### Negative

- `MESSAGE_TYPES` must be duplicated in each file (no ES modules)
- Async response handling adds complexity
- Service worker may be unloaded between messages

### Mitigations

- `MESSAGE_TYPES` kept in sync manually (documented in AGENTS.md)
- Consistent `try/catch` and error responses
- `configReady` promise in background.js ensures config loaded before handling messages

## Alternatives Considered

| Alternative | Why Rejected |
|-------------|--------------|
| Shared state via storage | Too slow for UI interactions, polling required |
| Direct DOM manipulation from background | Not possible in MV3 service workers |
| External messaging (native) | Overkill for this use case |

## References

- [Chrome Message Passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)
- [content.js](../../content.js) — Message handling
- [background.js](../../background.js) — Message routing

---

*Decision date: Initial development*
