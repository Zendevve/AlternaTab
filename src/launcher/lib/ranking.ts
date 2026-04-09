import { RANKING } from '../../shared/constants/ranking';
import { LauncherItem, RankedItemResult } from '../../shared/types';

export type LauncherTab = LauncherItem;
export type SearchResult = RankedItemResult;

function normalizeResult(item: LauncherTab, score: number): SearchResult {
  return {
    ...item,
    score,
    titleMatchIndices: [],
    hostMatchIndices: [],
    urlMatchIndices: []
  };
}

export function rankResults(query: string, results: LauncherTab[]): SearchResult[] {
  const lowerQuery = query.trim().toLowerCase();

  if (!lowerQuery) {
    return [...results]
      .map((item) => normalizeResult(item, 0))
      .sort((a, b) => {
        if ((a.mruRank ?? Number.MAX_SAFE_INTEGER) !== (b.mruRank ?? Number.MAX_SAFE_INTEGER)) {
          return (a.mruRank ?? Number.MAX_SAFE_INTEGER) - (b.mruRank ?? Number.MAX_SAFE_INTEGER);
        }

        if (a.isCurrentTab !== b.isCurrentTab) return a.isCurrentTab ? 1 : -1;

        return a.title.localeCompare(b.title);
      });
  }

  return results
    .map((item) => {
      const lowerTitle = item.title.toLowerCase();
      const lowerHost = item.host.toLowerCase();

      let score = 0;

      if (lowerTitle === lowerQuery) {
        score += RANKING.EXACT_TITLE_MATCH;
      } else if (lowerTitle.startsWith(lowerQuery)) {
        score += RANKING.TITLE_PREFIX_MATCH;
      } else if (lowerTitle.includes(lowerQuery)) {
        score += Math.floor(RANKING.TITLE_PREFIX_MATCH / 2);
      }

      if (lowerHost === lowerQuery) {
        score += RANKING.EXACT_HOST_MATCH;
      } else if (lowerHost.startsWith(lowerQuery)) {
        score += RANKING.HOST_PREFIX_MATCH;
      } else if (lowerHost.includes(lowerQuery)) {
        score += Math.floor(RANKING.HOST_PREFIX_MATCH / 2);
      }

      if (item.pinned) {
        score += RANKING.PINNED_BONUS;
      }

      if (item.isCurrentTab) {
        score += RANKING.CURRENT_TAB_PENALTY;
      }

      if (item.mruRank === 0) {
        score += RANKING.MRU_TOP_1;
      } else if (item.mruRank === 1) {
        score += RANKING.MRU_TOP_2;
      } else if (item.mruRank === 2) {
        score += RANKING.MRU_TOP_3;
      }

      return normalizeResult(item, score);
    })
    .filter((item) => item.score >= RANKING.MINIMUM_INCLUDED_SCORE)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      if ((a.mruRank ?? Number.MAX_SAFE_INTEGER) !== (b.mruRank ?? Number.MAX_SAFE_INTEGER)) {
        return (a.mruRank ?? Number.MAX_SAFE_INTEGER) - (b.mruRank ?? Number.MAX_SAFE_INTEGER);
      }

      if (a.isCurrentTab !== b.isCurrentTab) return a.isCurrentTab ? 1 : -1;

      return a.title.localeCompare(b.title);
    });
}
