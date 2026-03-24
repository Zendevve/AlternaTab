import { useMemo } from 'react';
import { LauncherTab, RankedTabResult } from '../../shared/types';
import { RANKING, getMruBonus } from '../../shared/ranking';

/**
 * Search and ranking hook for launcher
 * Uses named ranking constants and stable sort for deterministic results
 */
export function useSearch(tabs: LauncherTab[], query: string): RankedTabResult[] {
  return useMemo(() => {
    if (!query.trim()) {
      return tabs.map(tab => ({
        ...tab,
        score: 0,
        titleMatchIndices: [],
        hostMatchIndices: [],
        urlMatchIndices: []
      }));
    }

    const lowerQuery = query.toLowerCase();

    return tabs.map(tab => {
      const lowerTitle = tab.title.toLowerCase();
      const lowerHost = tab.host.toLowerCase();
      const lowerUrl = tab.url.toLowerCase();

      // Check for exact matches
      const titleMatch = lowerTitle.includes(lowerQuery);
      const hostMatch = lowerHost.includes(lowerQuery);
      const urlMatch = lowerUrl.includes(lowerQuery);

      // Calculate base score from matches
      let score = 0;
      if (titleMatch) score += RANKING.TITLE_MATCH;
      if (hostMatch) score += RANKING.HOST_MATCH;
      if (urlMatch) score += RANKING.URL_MATCH;

      // MRU bonus using tiered approach
      score += getMruBonus(tab.mruRank);

      // Pin bonus
      if (tab.pinned) score += RANKING.PINNED_BONUS;

      // Current tab penalty
      if (tab.isCurrentTab) score -= RANKING.CURRENT_TAB_PENALTY;

      return {
        ...tab,
        score,
        titleMatchIndices: [],
        hostMatchIndices: [],
        urlMatchIndices: []
      };
    })
      // Filter to only tabs with at least one match
      .filter(t => t.score > RANKING.MIN_SCORE_THRESHOLD && (
        t.title.toLowerCase().includes(lowerQuery) ||
        t.host.toLowerCase().includes(lowerQuery) ||
        t.url.toLowerCase().includes(lowerQuery)
      ))
      // Stable sort: primary by score (descending), secondary by title (ascending)
      // This ensures deterministic results when scores tie
      .sort((a, b) => {
        // Primary: score descending
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        // Tie-breaker 1: pinned tabs first
        if (a.pinned !== b.pinned) {
          return a.pinned ? -1 : 1;
        }
        // Tie-breaker 2: more recently used (lower rank)
        if (a.mruRank !== b.mruRank) {
          return a.mruRank - b.mruRank;
        }
        // Tie-breaker 3: alphabetical by title
        return a.title.localeCompare(b.title);
      });
  }, [tabs, query]);
}
