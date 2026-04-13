import { MESSAGE_TYPES, validateMessage } from '../messages';

describe('messages contracts', () => {
  it('accepts SEARCH_ASSETS with string query', () => {
    expect(validateMessage({ type: MESSAGE_TYPES.SEARCH_ASSETS, query: '' })).toBe(true);
    expect(validateMessage({ type: MESSAGE_TYPES.SEARCH_ASSETS, query: 'git' })).toBe(true);
  });

  it('validates SWITCH_TAB variants by source type', () => {
    expect(validateMessage({ type: MESSAGE_TYPES.SWITCH_TAB, tabId: 1, windowId: 2 })).toBe(true);
    expect(validateMessage({ type: MESSAGE_TYPES.SWITCH_TAB, itemType: 'closed_tab', sessionId: 's-1' })).toBe(true);
    expect(validateMessage({ type: MESSAGE_TYPES.SWITCH_TAB, itemType: 'bookmark', url: 'https://example.com' })).toBe(true);
    expect(validateMessage({ type: MESSAGE_TYPES.SWITCH_TAB, itemType: 'history', url: 'https://example.com' })).toBe(true);
  });

  it('rejects malformed SWITCH_TAB variants', () => {
    expect(validateMessage({ type: MESSAGE_TYPES.SWITCH_TAB, itemType: 'closed_tab' })).toBe(false);
    expect(validateMessage({ type: MESSAGE_TYPES.SWITCH_TAB, itemType: 'bookmark' })).toBe(false);
    expect(validateMessage({ type: MESSAGE_TYPES.SWITCH_TAB, itemType: 'history', url: 123 })).toBe(false);
    expect(validateMessage({ type: MESSAGE_TYPES.SWITCH_TAB, tabId: 1 })).toBe(false);
  });

  it('accepts explicit action messages with tabId payloads', () => {
    expect(validateMessage({ type: MESSAGE_TYPES.PIN_TAB, tabId: 1 })).toBe(true);
    expect(validateMessage({ type: MESSAGE_TYPES.UNPIN_TAB, tabId: 1 })).toBe(true);
    expect(validateMessage({ type: MESSAGE_TYPES.MUTE_TAB, tabId: 1 })).toBe(true);
    expect(validateMessage({ type: MESSAGE_TYPES.UNMUTE_TAB, tabId: 1 })).toBe(true);
    expect(validateMessage({ type: MESSAGE_TYPES.DUPLICATE_TAB, tabId: 1 })).toBe(true);
    expect(validateMessage({ type: MESSAGE_TYPES.MOVE_TO_NEW_WINDOW, tabId: 1 })).toBe(true);
  });

  it('rejects explicit action messages without numeric tabId', () => {
    expect(validateMessage({ type: MESSAGE_TYPES.PIN_TAB })).toBe(false);
    expect(validateMessage({ type: MESSAGE_TYPES.UNPIN_TAB, tabId: '1' })).toBe(false);
    expect(validateMessage({ type: MESSAGE_TYPES.MUTE_TAB, tabId: null })).toBe(false);
    expect(validateMessage({ type: MESSAGE_TYPES.UNMUTE_TAB, tabId: undefined })).toBe(false);
  });
});
