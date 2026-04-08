import { MESSAGE_TYPES, validateMessage } from '../messages';

describe('messages contracts for tab actions', () => {
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
