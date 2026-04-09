import { useState, useEffect, useCallback } from 'react';
import { RankedItemResult } from '../../shared/types';
import { MESSAGE_TYPES, SearchAssetsRequest, SearchAssetsResponse } from '../../shared/messages';
import { rankResults } from '../lib/ranking';

export function useSearch(query: string) {
  const [results, setResults] = useState<RankedItemResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    const request: SearchAssetsRequest = { type: MESSAGE_TYPES.SEARCH_ASSETS, query };

    chrome.runtime.sendMessage(request, (response: SearchAssetsResponse) => {
      if (!response || response.ok === false) {
        console.error('[useSearch] Failed to fetch:', response);
        setError(response?.ok === false ? response.error : 'Network error');
      } else {
        setResults(rankResults(query, response.data.results));
        setError(null);
      }
      setLoading(false);
    });
  }, [query]);

  useEffect(() => {
    let mounted = true;

    const fetchId = setTimeout(() => {
      if (!mounted) return;
      refresh();
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(fetchId);
    };
  }, [refresh]);

  return { results, loading, error, refresh };
}
