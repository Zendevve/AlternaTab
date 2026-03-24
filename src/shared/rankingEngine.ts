import { LauncherItem, RankedItemResult } from './types';
import { RANKING } from './constants/ranking';

export function rankResults(query: string, results: LauncherItem[]): RankedItemResult[] {
  if (!query.trim()) {
    // Top-tier items (open tabs, closed tabs) get score 0 and others are filtered
    return results
      .filter(tab => tab.type === 'tab' || tab.type === 'closed_tab')
      .map(tab => ({
        ...tab,
        score: 0,
        titleMatchIndices: [],
        hostMatchIndices: [],
        urlMatchIndices: []
      }));
  }

  const lowerQuery = query.toLowerCase();

  return results.map(item => {
    const lowerTitle = item.title.toLowerCase();
    const lowerHost = item.host.toLowerCase();

    let score = 0;

    // Title matching
    if (lowerTitle === lowerQuery) {
      score += RANKING.EXACT_TITLE_MATCH;
    } else if (lowerTitle.startsWith(lowerQuery)) {
      score += RANKING.TITLE_PREFIX_MATCH;
    } else if (lowerTitle.includes(lowerQuery)) {
      score += Math.floor(RANKING.TITLE_PREFIX_MATCH / 2);
    }

    // Host matching
    if (lowerHost === lowerQuery) {
      score += RANKING.EXACT_HOST_MATCH;
    } else if (lowerHost.startsWith(lowerQuery)) {
      score += RANKING.HOST_PREFIX_MATCH;
    } else if (lowerHost.includes(lowerQuery)) {
      score += Math.floor(RANKING.HOST_PREFIX_MATCH / 2);
    }

    // Pinned
    if (item.pinned) {
      score += RANKING.PINNED_BONUS;
    }

    // Current penalty (subtract)
    if (item.isCurrentTab) {
      score -= Math.abs(RANKING.CURRENT_TAB_PENALTY);
    }

    // MRU Bonus
    if (item.mruRank === 0) {
      score += RANKING.MRU_TOP_1;
    } else if (item.mruRank === 1) {
      score += RANKING.MRU_TOP_2;
    } else if (item.mruRank === 2) {
      score += RANKING.MRU_TOP_3;
    }

    // Source Penalty (Tabs > Closed > Bookmarks > History)
    if (item.type === 'closed_tab') score -= 5;
    if (item.type === 'bookmark') score -= 15;
    if (item.type === 'history') score -= 25;

    return {
      ...item,
      score,
      titleMatchIndices: [],
      hostMatchIndices: [],
      urlMatchIndices: []
    };
  })
    .filter(t => t.score >= RANKING.MINIMUM_INCLUDED_SCORE)
    .sort((a, b) => {
      // 1. Score descending
      if (b.score !== a.score) return b.score - a.score;

      // 2. Lower MRU rank first
      if (a.mruRank !== undefined && b.mruRank !== undefined && a.mruRank !== b.mruRank) {
        return a.mruRank - b.mruRank;
      }

      // 3. Active tab last
      if (a.isCurrentTab !== b.isCurrentTab) return a.isCurrentTab ? 1 : -1;

      // 4. Source Priority
      const typePriority: Record<string, number> = { tab: 1, closed_tab: 2, bookmark: 3, history: 4 };
      if (typePriority[a.type] !== typePriority[b.type]) {
        return typePriority[a.type] - typePriority[b.type];
      }

      // 5. Alphabetic title fallback
      return a.title.localeCompare(b.title);
    });
}
