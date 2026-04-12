import { vi } from 'vitest';
import { mruService } from '../mruService';

// Mock chrome.storage.local
const mockStorage: Record<string, any> = {};

(globalThis as any).chrome = {
  storage: {
    // @ts-ignore
    local: {
      get: vi.fn((key: string) => Promise.resolve({ [key]: mockStorage[key] })),
      set: vi.fn((data: any) => {
        Object.assign(mockStorage, data);
        return Promise.resolve();
      })
    }
  }
} as any;

describe('MRUService', () => {
  beforeEach(async () => {
    // Reset mock storage and internal state before each test
    for (const key in mockStorage) {
      delete mockStorage[key];
    }
    await mruService.pruneAgainstOpenTabs([]);
    return mruService.hydrate();
  });

  it('adds and touches tab IDs correctly', async () => {
    await mruService.touch(1);
    await mruService.touch(2);
    await mruService.touch(3);

    // 3 should be most recent
    expect(mruService.getOrderedIds()).toEqual([3, 2, 1]);

    // Touch 1 again should bring it to the front
    await mruService.touch(1);
    expect(mruService.getOrderedIds()).toEqual([1, 3, 2]);
  });

  it('removes tab IDs correctly', async () => {
    await mruService.touch(1);
    await mruService.touch(2);

    await mruService.remove(2);
    expect(mruService.getOrderedIds()).toEqual([1]);
  });

  it('ranks correctly', async () => {
    await mruService.touch(10);
    await mruService.touch(20);
    await mruService.touch(30);

    // Order is [30, 20, 10]
    expect(mruService.rank(30)).toBe(0);
    expect(mruService.rank(20)).toBe(1);
    expect(mruService.rank(10)).toBe(2);

    // Unseen tab returns length
    expect(mruService.rank(999)).toBe(3);
  });

  it('prunes against open tabs', async () => {
    await mruService.touch(1);
    await mruService.touch(2);
    await mruService.touch(3);

    // Only 1 and 3 remain open
    await mruService.pruneAgainstOpenTabs([1, 3, 5]);

    expect(mruService.getOrderedIds()).toEqual([3, 1]);
  });
});
