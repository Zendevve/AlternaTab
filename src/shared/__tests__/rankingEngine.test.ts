import { describe, it, expect } from 'vitest';
import { rankResults } from '../rankingEngine';
import { LauncherItem } from '../types';

function createMockItem(overrides: Partial<LauncherItem>): LauncherItem {
  return {
    id: 1,
    type: 'tab',
    windowId: 1,
    title: 'Example',
    url: 'https://example.com/foo',
    host: 'example.com',
    path: '/foo',
    active: false,
    pinned: false,
    isCurrentTab: false,
    mruRank: 10,
    ...overrides
  };
}

describe('rankResults', () => {
  it('exact title outscores exact host', () => {
    const items = [
      createMockItem({ id: 1, title: 'github', host: 'other.com' }),
      createMockItem({ id: 2, title: 'other', host: 'github.com' })
    ];
    const results = rankResults('github', items);
    expect(results[0].id).toBe(1);
    expect(results[1].id).toBe(2);
  });

  it('lower MRU rank wins a tie-breaker', () => {
    const items = [
      createMockItem({ id: 1, title: 'test', mruRank: 5 }),
      createMockItem({ id: 2, title: 'test', mruRank: 1 })
    ];
    const results = rankResults('test', items);
    expect(results[0].id).toBe(2);
  });

  it('current active tab is penalized', () => {
    const items = [
      createMockItem({ id: 1, title: 'target', isCurrentTab: false }),
      createMockItem({ id: 2, title: 'target', isCurrentTab: true })
    ];
    const results = rankResults('target', items);
    expect(results[0].id).toBe(1);
  });

  it('source priority impacts ranking (tabs > closed > bookmarks > history)', () => {
    const items = [
      createMockItem({ id: 1, title: 'source', type: 'history' }),
      createMockItem({ id: 2, title: 'source', type: 'bookmark' }),
      createMockItem({ id: 3, title: 'source', type: 'tab' })
    ];
    const results = rankResults('source', items);
    expect(results[0].id).toBe(3); // 'tab' gets priority and least penalty
    expect(results[1].id).toBe(2); // bookmarks penalty is -15
    expect(results[2].id).toBe(1); // history penalty is -25
  });
});
