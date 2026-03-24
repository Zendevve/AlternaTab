import { LauncherItem } from '../shared/types';
import { success, failure, SearchAssetsResponse } from '../shared/messages';
import { mruService } from './services/mruService';
import { rankResults } from '../shared/rankingEngine';
import { logger } from '../shared/logger';

export async function handleSearchAssets(query: string): Promise<SearchAssetsResponse> {
  try {
    const results: LauncherItem[] = [];

    // 1. Always fetch Open Tabs
    const rawTabs = await chrome.tabs.query({});
    const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTabId = activeTabs.length > 0 ? activeTabs[0].id : undefined;

    const openTabs: LauncherItem[] = rawTabs
      .filter((tab) => tab.id !== undefined && tab.windowId !== undefined)
      .map((tab) => {
        let host = '';
        let path = '';
        try {
          if (tab.url) {
            const urlObj = new URL(tab.url);
            host = urlObj.hostname;
            path = urlObj.pathname + urlObj.search;
          }
        } catch (e) {
          host = tab.url || '';
        }

        return {
          id: `tab-${tab.id}`,
          type: 'tab',
          tabId: tab.id,
          windowId: tab.windowId,
          title: tab.title || 'Untitled Tab',
          url: tab.url || '',
          host,
          path,
          favIconUrl: tab.favIconUrl,
          active: tab.active,
          pinned: tab.pinned,
          isCurrentTab: tab.id === currentTabId,
          mruRank: mruService.rank(tab.id!)
        };
      });

    results.push(...openTabs);

    const isQueryEmpty = !query.trim();

    // 2. If Query Empty, fetch Recently Closed Sessions
    if (isQueryEmpty) {
      // requires "sessions" permission
      if (chrome.sessions) {
        const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 10 });
        for (const session of sessions) {
          if (session.tab && session.tab.url) {
            let host = '';
            let path = '';
            try {
              const urlObj = new URL(session.tab.url);
              host = urlObj.hostname;
              path = urlObj.pathname + urlObj.search;
            } catch (e) {
              host = session.tab.url || '';
            }
            results.push({
              id: `closed-${session.tab.sessionId}`,
              type: 'closed_tab',
              sessionId: session.tab.sessionId,
              title: session.tab.title || 'Closed Tab',
              url: session.tab.url,
              host,
              path,
              favIconUrl: session.tab.favIconUrl
            });
          }
        }
      }
    } else {
      // 3. If Query NOT Empty, fetch Bookmarks and History

      // Bookmarks
      if (chrome.bookmarks) {
        const bookmarks = await chrome.bookmarks.search(query);
        for (const bm of bookmarks) {
          if (bm.url) {
            let host = '';
            let path = '';
            try {
              const urlObj = new URL(bm.url);
              host = urlObj.hostname;
              path = urlObj.pathname + urlObj.search;
            } catch (e) {
              host = bm.url || '';
            }
            results.push({
              id: `bookmark-${bm.id}`,
              type: 'bookmark',
              bookmarkId: bm.id,
              title: bm.title || 'Bookmark',
              url: bm.url,
              host,
              path
            });
          }
        }
      }

      // History
      if (chrome.history) {
        const historyItems = await chrome.history.search({ text: query, maxResults: 100 });
        for (const hi of historyItems) {
          if (hi.url) {
            let host = '';
            let path = '';
            try {
              const urlObj = new URL(hi.url);
              host = urlObj.hostname;
              path = urlObj.pathname + urlObj.search;
            } catch (e) {
              host = hi.url || '';
            }

            // Avoid duplicating open tabs from history
            const isAlreadyOpen = openTabs.some(t => t.url === hi.url);
            if (!isAlreadyOpen) {
              results.push({
                id: `history-${hi.id}`,
                type: 'history',
                title: hi.title || host,
                url: hi.url,
                host,
                path
              });
            }
          }
        }
      }
    }

    // 4. Rank Results
    const rankedResults = rankResults(query, results);

    // 5. Return Top 50
    return success({ results: rankedResults.slice(0, 50) });

  } catch (error) {
    logger.error('Failed to search assets:', error);
    return failure(`Search failed: ${String(error)}`, 'SEARCH_FAILED');
  }
}
