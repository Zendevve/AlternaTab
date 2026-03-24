import { useMemo } from 'react';
import { LauncherTab, RankedTabResult } from '../../shared/types';

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
      let score = 0;

      const lowerTitle = tab.title.toLowerCase();
      const lowerHost = tab.host.toLowerCase();
      const lowerUrl = tab.url.toLowerCase();

      // VERY simple starter heuristic
      if (lowerTitle.includes(lowerQuery)) score += 100;
      if (lowerHost.includes(lowerQuery)) score += 50;
      if (lowerUrl.includes(lowerQuery)) score += 20;

      // MRU Bonus
      score -= tab.mruRank; // Smaller MRU rank means it was used more recently, less penalty

      if (tab.pinned) score += 10;
      if (tab.isCurrentTab) score -= 20; // Slight penalty to current tab

      return {
        ...tab,
        score,
        titleMatchIndices: [],
        hostMatchIndices: [],
        urlMatchIndices: []
      };
    }).filter(t => t.score > -9000 && (
      t.title.toLowerCase().includes(lowerQuery) ||
      t.host.toLowerCase().includes(lowerQuery) ||
      t.url.toLowerCase().includes(lowerQuery)
    )) // Basic filter for MVP
      .sort((a, b) => b.score - a.score);
  }, [tabs, query]);
}
