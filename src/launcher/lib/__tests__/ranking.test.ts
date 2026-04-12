import { rankResults } from '../ranking';
import { LauncherItem } from '../../../shared/types';

function createMockTab(overrides: Partial<LauncherItem>): LauncherItem {
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

describe('launcher rankResults', () => {
  it('exact title outranks exact host', () => {
    const items = [
      createMockTab({ id: 1, title: 'github', host: 'other.com' }),
      createMockTab({ id: 2, title: 'other', host: 'github' })
    ];

    const results = rankResults('github', items);

    expect(results[0].id).toBe(1);
    expect(results[1].id).toBe(2);
  });

  it('lower MRU rank wins ties', () => {
    const items = [
      createMockTab({ id: 1, title: 'target', mruRank: 5 }),
      createMockTab({ id: 2, title: 'target', mruRank: 1 })
    ];

    const results = rankResults('target', items);

    expect(results[0].id).toBe(2);
    expect(results[1].id).toBe(1);
  });

  it('active tab is penalized', () => {
    const items = [
      createMockTab({ id: 1, title: 'target', isCurrentTab: false }),
      createMockTab({ id: 2, title: 'target', isCurrentTab: true })
    ];

    const results = rankResults('target', items);

    expect(results[0].id).toBe(1);
    expect(results[1].id).toBe(2);
  });
});
