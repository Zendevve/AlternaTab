import { useState, useEffect } from 'react';
import { LauncherTab } from '../../shared/types';
import { MESSAGE_TYPES, GetTabsRequest, GetTabsResponse } from '../../shared/messages';

export function useLauncherData() {
  const [tabs, setTabs] = useState<LauncherTab[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const request: GetTabsRequest = { type: MESSAGE_TYPES.GET_TABS };
    chrome.runtime.sendMessage(request, (response: GetTabsResponse) => {
      if (!mounted) return;
      if (response && response.tabs) {
        // Exclude current window's current tab from being first choice if there are other tabs
        let sortedTabs = [...response.tabs].sort((a, b) => {
          if (a.mruRank !== b.mruRank) {
            return a.mruRank - b.mruRank;
          }
          return 0;
        });

        // Put the actual current tab at the end of MRU or slightly discounted
        // if user wants to switch to LAST used, not CURRENT.
        const cIndex = sortedTabs.findIndex(t => t.isCurrentTab);
        if (cIndex === 0 && sortedTabs.length > 1) {
          const cTab = sortedTabs.splice(cIndex, 1)[0];
          sortedTabs.splice(1, 0, cTab); // Put current tab at index 1 so index 0 is previous active
        }

        setTabs(sortedTabs);
      }
      setLoading(false);
    });

    return () => { mounted = false; };
  }, []);

  return { tabs, loading };
}
