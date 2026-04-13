import { vi } from 'vitest';
import { handleSearchAssets } from '../search';

describe('handleSearchAssets', () => {
  const tabsQuery = vi.fn();
  const sessionsGetRecentlyClosed = vi.fn();
  const bookmarksSearch = vi.fn();
  const historySearch = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();

    (globalThis as { chrome?: unknown }).chrome = {
      tabs: {
        query: tabsQuery
      },
      sessions: {
        getRecentlyClosed: sessionsGetRecentlyClosed
      },
      bookmarks: {
        search: bookmarksSearch
      },
      history: {
        search: historySearch
      },
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({ mru_order: [] }),
          set: vi.fn().mockResolvedValue(undefined)
        }
      }
    };

    tabsQuery
      .mockResolvedValueOnce([
        {
          id: 1,
          windowId: 10,
          title: 'Open Tab',
          url: 'https://open.example.com/docs',
          active: true,
          pinned: false,
          mutedInfo: { muted: false }
        }
      ])
      .mockResolvedValueOnce([
        {
          id: 1
        }
      ]);
  });

  it('empty query returns open tabs + recently closed and does not call bookmarks/history', async () => {
    sessionsGetRecentlyClosed.mockResolvedValue([
      {
        tab: {
          sessionId: 's1',
          title: 'Closed Tab',
          url: 'https://closed.example.com/page',
          favIconUrl: 'https://closed.example.com/favicon.ico'
        }
      }
    ]);

    const response = await handleSearchAssets('');

    expect(response.ok).toBe(true);
    if (!response.ok) return;

    expect(response.data.query).toBe('');
    expect(response.data.results.map((item) => item.type)).toEqual(['tab', 'closed_tab']);
    expect(bookmarksSearch).not.toHaveBeenCalled();
    expect(historySearch).not.toHaveBeenCalled();
  });

  it('non-empty query returns tabs + bookmarks + history and excludes open-tab duplicate history', async () => {
    bookmarksSearch.mockResolvedValue([
      {
        id: 'b1',
        title: 'Bookmark Match',
        url: 'https://bookmark.example.com/guide'
      }
    ]);

    historySearch.mockResolvedValue([
      {
        id: 'h-open',
        title: 'Open Tab History Duplicate',
        url: 'https://open.example.com/docs'
      },
      {
        id: 'h1',
        title: 'History Match',
        url: 'https://history.example.com/article'
      }
    ]);

    const response = await handleSearchAssets('exa');

    expect(response.ok).toBe(true);
    if (!response.ok) return;

    expect(response.data.query).toBe('exa');
    expect(sessionsGetRecentlyClosed).not.toHaveBeenCalled();
    expect(bookmarksSearch).toHaveBeenCalledWith('exa');
    expect(historySearch).toHaveBeenCalledWith({ text: 'exa', maxResults: 100 });

    const ids = response.data.results.map((item) => item.id);
    expect(ids).toContain('tab-1');
    expect(ids).toContain('bookmark-b1');
    expect(ids).toContain('history-h1');
    expect(ids).not.toContain('history-h-open');
  });
});
