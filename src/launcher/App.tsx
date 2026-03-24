import { useState, useRef, useEffect } from 'react';
import { useSearch } from './hooks/useSearch';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { SearchInput } from './components/SearchInput';
import { ResultList } from './components/ResultList';
import { FooterHints } from './components/FooterHints';
import { MESSAGE_TYPES, SwitchTabRequest, Response, ExtensionMessage } from '../shared/messages';
import { TabAction } from './hooks/useKeyboardNavigation';

export function App() {
  const [query, setQuery] = useState('');
  const { results, loading, error } = useSearch(query);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelect = (index: number) => {
    const selectedTab = results[index];
    if (!selectedTab) return;

    // However, SWITCH_TAB handles open tabs right now. We must update background if type= history/bookmark

    // But wait, the PRD says to open bookmarks and history. We should probably send SWITCH_TAB and the background handles whether it's a tab, closed_tab, history, or bookmark!
    const request: SwitchTabRequest = {
      type: MESSAGE_TYPES.SWITCH_TAB,
      tabId: selectedTab.tabId || -1,
      windowId: selectedTab.windowId || -1,
      url: selectedTab.url, // Passing url for bookmarks/history to open new tabs
      itemType: selectedTab.type,
      sessionId: selectedTab.sessionId
    };

    chrome.runtime.sendMessage(request, (response: Response<{ success: boolean }>) => {
      if (response && response.ok === false) {
        console.error('[App] Switch tab failed:', response.error);
        // Could show error toast here
      }
    });
  };

  const handleCancel = () => {
    window.close(); // Close the launcher popup
  };

  const handleAction = (index: number, action: TabAction) => {
    const selectedTab = results[index];
    if (!selectedTab) return;

    let request: ExtensionMessage | null = null;

    switch (action) {
      case 'CLOSE':
        if (selectedTab.tabId !== undefined) {
          request = { type: MESSAGE_TYPES.CLOSE_TAB, tabId: selectedTab.tabId };
        }
        break;
      case 'PIN':
        if (selectedTab.tabId !== undefined) {
          request = { type: MESSAGE_TYPES.TOGGLE_PIN_TAB, tabId: selectedTab.tabId };
        }
        break;
      case 'DUPLICATE':
        if (selectedTab.tabId !== undefined) {
          request = { type: MESSAGE_TYPES.DUPLICATE_TAB, tabId: selectedTab.tabId };
        }
        break;
      case 'MUTE':
        if (selectedTab.tabId !== undefined) {
          request = { type: MESSAGE_TYPES.TOGGLE_MUTE_TAB, tabId: selectedTab.tabId };
        }
        break;
      case 'NEW_WINDOW':
        if (selectedTab.tabId !== undefined) {
          request = { type: MESSAGE_TYPES.MOVE_TO_NEW_WINDOW, tabId: selectedTab.tabId };
        }
        break;
      case 'COPY_URL':
        // Copy URL works best in the foreground window context where clipboard is fully supported
        navigator.clipboard.writeText(selectedTab.url).catch(console.error);
        return; // No background request needed
    }

    if (request) {
      chrome.runtime.sendMessage(request, (response: Response<any>) => {
        if (response && response.ok === false) {
          console.error(`[App] Action ${action} failed:`, response.error);
        } else {
          // If the action mutates UI (close, pin, mute, etc), reload data
          // Because useLauncherData might not be fully reactive depending on implementation,
          // for now we can just let background state settle and re-fetch if we had a forced refetch.
          // Since we don't have a forced refetch yet, we can close window for CLOSE or let user manually refresh.
          // For a premium feel, let's close the launcher on most actions except PIN/MUTE.
          if (['CLOSE', 'DUPLICATE', 'NEW_WINDOW'].includes(action)) {
            window.close();
          }
        }
      });
    }
  };

  const { selectedIndex, setSelectedIndex } = useKeyboardNavigation(
    results.length,
    handleSelect,
    handleCancel,
    handleAction
  );

  // Auto-focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="launcher-container" ref={containerRef}>
      <SearchInput
        query={query}
        setQuery={setQuery}
        inputRef={inputRef}
      />

      {loading && results.length === 0 ? (
        <div className="loading-state">Loading results...</div>
      ) : error ? (
        <div className="error-state">
          <h2>Search error</h2>
          <p>{error}</p>
        </div>
      ) : results.length === 0 ? (
        <div className="empty-state">
          <p>No tabs found matching "{query}"</p>
        </div>
      ) : (
        <ResultList
          results={results}
          selectedIndex={selectedIndex}
          onSelect={(index) => {
            setSelectedIndex(index);
            handleSelect(index);
          }}
        />
      )}

      <FooterHints />
    </div>
  );
}
