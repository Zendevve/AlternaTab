import { LauncherItem } from '../shared/types';
import { success, failure, SearchAssetsResponse } from '../shared/messages';
import { mruService } from './services/mruService';
import { rankResults } from '../shared/rankingEngine';
import { logger } from '../shared/logger';

function parseUrlParts(url: string): { host: string; path: string } {
  try {
    const urlObj = new URL(url);
    return {
      host: urlObj.hostname,
      path: urlObj.pathname + urlObj.search
    };
  } catch {
    return {
      host: url,
      path: ''
    };
  }
}

export async function handleSearchAssets(query: string): Promise<SearchAssetsResponse> {
  try {
    const results: LauncherItem[] = [];

    const rawTabs = await chrome.tabs.query({});
    const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTabId = activeTabs.length > 0 ? activeTabs[0].id : undefined;

    const openTabs: LauncherItem[] = rawTabs
      .filter((tab) => tab.id !== undefined && tab.windowId !== undefined)
      .map((tab) => {
        const { host, path } = parseUrlParts(tab.url || '');

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
          muted: tab.mutedInfo?.muted ?? false,
          isCurrentTab: tab.id === currentTabId,
          mruRank: mruService.rank(tab.id as number)
        };
      });

    results.push(...openTabs);

    const isQueryEmpty = !query.trim();

    if (isQueryEmpty) {
      if (chrome.sessions) {
        const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: 10 });
        for (const session of sessions) {
          const sessionTab = session.tab;
          if (sessionTab?.url && sessionTab.sessionId) {
            const { host, path } = parseUrlParts(sessionTab.url);
            results.push({
              id: `closed-${sessionTab.sessionId}`,
              type: 'closed_tab',
              sessionId: sessionTab.sessionId,
              title: sessionTab.title || 'Closed Tab',
              url: sessionTab.url,
              host,
              path,
              favIconUrl: sessionTab.favIconUrl
            });
          }
        }
      }
    } else {
      if (chrome.bookmarks) {
        const bookmarks = await chrome.bookmarks.search(query);
        for (const bm of bookmarks) {
          if (bm.url) {
            const { host, path } = parseUrlParts(bm.url);
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

      if (chrome.history) {
        const historyItems = await chrome.history.search({ text: query, maxResults: 100 });
        for (const hi of historyItems) {
          if (hi.url && hi.id) {
            const { host, path } = parseUrlParts(hi.url);
            const isAlreadyOpen = openTabs.some((tab) => tab.url === hi.url);
            if (!isAlreadyOpen) {
              results.push({
                id: `history-${hi.id}`,
                type: 'history',
                historyId: String(hi.id),
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

    const rankedResults = rankResults(query, results).slice(0, 50);
    return success({ query, results: rankedResults });
  } catch (error) {
    logger.error('Failed to search assets:', error);
    return failure(`Search failed: ${String(error)}`, 'SEARCH_FAILED');
  }
}
