# Testing Strategy

## Overview

AlternaTab is a Chrome extension with limited automated testing options. This document defines the manual testing approach and potential automation paths.

## Test Levels

### Manual Testing (Primary)

All features are verified through manual testing before release.

#### Overlay Core

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Open overlay | Press Alt+Q on any web page | Overlay appears with tab list |
| Close overlay | Press Escape or Alt+Q | Overlay hides |
| Tab count | Open overlay | Shows correct number of tabs |
| MRU order | Switch between tabs, open overlay | Most recent tab is near top |

#### Navigation

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Arrow navigation | Press Up/Down arrows | Selection moves, scrolls if needed |
| Wrap navigation | Press Up at first item | Selection wraps to last item |
| Switch tab | Press Enter | Switches to selected tab |
| Close tab | Press Delete | Closes selected tab, updates list |

#### Search/Filter

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Type-ahead | Start typing | Filter appears, list filters |
| Clear filter | Press Escape | Filter clears |
| No results | Filter for non-existent text | Empty state shown |
| Ctrl+F | Press Ctrl+F | Search input focuses |

#### Options Page

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Load settings | Open options page | Current settings displayed |
| Save changes | Modify setting, save | Toast confirms, setting persists |
| Reset defaults | Click reset | All settings restored |
| Domain colors | Add domain color | Reflected in overlay accent |

### Edge Cases

- Chrome new tab page (`chrome://newtab`)
- Extension pages
- PDF viewer
- Pages with strict CSP
- Pinned tabs
- Incognito mode (if enabled)

## Automated Testing Options

### Potential Approaches

1. **Unit tests** — Extract pure functions (e.g., `extractDomain`, `deriveInitials`) to testable modules
2. **Puppeteer + extension** — Load extension in Puppeteer, test overlay programmatically
3. **Chrome DevTools Protocol** — Direct extension testing via CDP

### Current Status

No automated tests implemented. Priority is on stable manual testing flows.

### Recommended First Steps

1. Extract utility functions to separate module
2. Add Jest for unit testing utilities
3. Document manual test results in PR descriptions

## Pre-Release Checklist

- [ ] Extension loads without errors
- [ ] Alt+Q works on standard web pages
- [ ] Navigation (arrows, Enter, Delete) works
- [ ] Search/filter functions correctly
- [ ] Options page loads and saves
- [ ] No console errors in background script
- [ ] No obvious visual regressions
- [ ] Tested on at least 3 different websites

## Test Environments

| Browser | Priority | Notes |
|---------|----------|-------|
| Chrome (stable) | High | Primary target |
| Chrome (beta) | Medium | Catch breaking changes early |
| Chromium-based (Edge, Brave) | Low | Should work, not actively tested |

---

*See [Development Setup](../Development/setup.md) for debugging instructions.*
