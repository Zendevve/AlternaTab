import { useState, useEffect } from 'react';
import { RankedItemResult } from '../../shared/types';
import { MESSAGE_TYPES, SearchAssetsRequest, SearchAssetsResponse } from '../../shared/messages';

export function useSearch(query: string) {
  const [results, setResults] = useState<RankedItemResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Debounce background search
    const fetchId = setTimeout(() => {
      setLoading(true);
      const request: SearchAssetsRequest = { type: MESSAGE_TYPES.SEARCH_ASSETS, query };

      chrome.runtime.sendMessage(request, (response: SearchAssetsResponse) => {
        if (!mounted) return;

        if (!response || response.ok === false) {
          console.error('[useSearch] Failed to fetch:', response);
          setError(response?.ok === false ? response.error : 'Network error');
        } else {
          setResults(response.data.results);
          setError(null);
        }
        setLoading(false);
      });
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(fetchId);
    };
  }, [query]);

  return { results, loading, error };
}
