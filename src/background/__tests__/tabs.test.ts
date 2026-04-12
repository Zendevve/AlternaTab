import {
  handleCloseTab,
  handleCopyUrl,
  handleDuplicateTab,
  handleMoveToNewWindow,
  handleMuteTab,
  handlePinTab,
  handleUnmuteTab,
  handleUnpinTab
} from '../tabs';
import { vi } from 'vitest';

describe('background tab action handlers', () => {
  const tabsGet = vi.fn();
  const tabsUpdate = vi.fn();
  const tabsDuplicate = vi.fn();
  const tabsRemove = vi.fn();
  const windowsCreate = vi.fn();
  const clipboardWriteText = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();

    (globalThis as { chrome?: unknown }).chrome = {
      tabs: {
        get: tabsGet,
        update: tabsUpdate,
        duplicate: tabsDuplicate,
        remove: tabsRemove
      },
      windows: {
        create: windowsCreate
      }
    };

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        clipboard: {
          writeText: clipboardWriteText
        }
      },
      configurable: true
    });
  });

  it('pins and unpins tabs with explicit actions', async () => {
    tabsUpdate.mockResolvedValue({});

    const pinResult = await handlePinTab(10);
    const unpinResult = await handleUnpinTab(10);

    expect(tabsUpdate).toHaveBeenNthCalledWith(1, 10, { pinned: true });
    expect(tabsUpdate).toHaveBeenNthCalledWith(2, 10, { pinned: false });
    expect(pinResult.ok && pinResult.data.pinned).toBe(true);
    expect(unpinResult.ok && unpinResult.data.pinned).toBe(false);
  });

  it('mutes and unmutes tabs with explicit actions', async () => {
    tabsUpdate.mockResolvedValue({});

    const muteResult = await handleMuteTab(20);
    const unmuteResult = await handleUnmuteTab(20);

    expect(tabsUpdate).toHaveBeenNthCalledWith(1, 20, { muted: true });
    expect(tabsUpdate).toHaveBeenNthCalledWith(2, 20, { muted: false });
    expect(muteResult.ok && muteResult.data.muted).toBe(true);
    expect(unmuteResult.ok && unmuteResult.data.muted).toBe(false);
  });

  it('handles close, duplicate, move-to-new-window, and copy-url', async () => {
    tabsGet.mockResolvedValue({ id: 30 });
    tabsRemove.mockResolvedValue(undefined);
    tabsDuplicate.mockResolvedValue({});
    windowsCreate.mockResolvedValue({});
    clipboardWriteText.mockResolvedValue(undefined);

    const closeResult = await handleCloseTab(30);
    const duplicateResult = await handleDuplicateTab(30);
    const moveResult = await handleMoveToNewWindow(30);
    const copyResult = await handleCopyUrl('https://example.com');

    expect(tabsRemove).toHaveBeenCalledWith(30);
    expect(tabsDuplicate).toHaveBeenCalledWith(30);
    expect(windowsCreate).toHaveBeenCalledWith({ tabId: 30 });
    expect(clipboardWriteText).toHaveBeenCalledWith('https://example.com');

    expect(closeResult.ok).toBe(true);
    expect(duplicateResult.ok).toBe(true);
    expect(moveResult.ok).toBe(true);
    expect(copyResult.ok).toBe(true);
  });
});
