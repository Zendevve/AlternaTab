# ADR-001: Chrome Extension Manifest V3

## Status

**Accepted** — Implemented in current version

## Context

Chrome extensions can use Manifest V2 or V3. Google announced deprecation of MV2 with timeline:
- June 2024: MV2 extensions disabled in Chrome Beta, Dev, Canary
- January 2025: MV2 extensions disabled in Chrome stable

AlternaTab needs to function reliably for the foreseeable future.

## Decision

Use **Manifest V3** for the extension manifest.

Key changes from MV2:
- Background pages → Service workers (`background.js` as service worker)
- Blocking `webRequest` → `declarativeNetRequest` (not needed for this extension)
- Remote code execution blocked
- Promise-based APIs (optional, we use callbacks)

## Consequences

### Positive

- Future-proof against Chrome deprecation timeline
- Better resource usage (service workers unload when idle)
- Modern extension practices

### Negative

- Service workers don't have persistent state (must use `chrome.storage`)
- Some APIs behave differently in service worker context
- Limited debugging tools compared to background pages

### Mitigations

- Configuration stored in `chrome.storage.local`
- Config hydration on service worker startup
- Console logging for debugging

## References

- [Chrome Extension Migration Guide](https://developer.chrome.com/docs/extensions/develop/migrate)
- [Manifest V3 Overview](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)

---

*Decision date: Initial development*
