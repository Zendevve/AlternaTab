import { useState, useRef, useEffect } from 'react';
import { useSearch } from './hooks/useSearch';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { SearchInput } from './components/SearchInput';
import { ResultList } from './components/ResultList';
import { FooterHints } from './components/FooterHints';
import { EmptyState } from './components/EmptyState';
import { MESSAGE_TYPES, SwitchTabRequest, Response, ExtensionMessage } from '../shared/messages';
import { TabAction } from './hooks/useKeyboardNavigation';

export function App() {
  const [query, setQuery] = useState('');
  const { results, loading, error, refresh } = useSearch(query);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelect = (index: number) => {
    const selectedTab = results[index];
    if (!selectedTab) return;

    const request: SwitchTabRequest =
      selectedTab.type === 'closed_tab' && selectedTab.sessionId
        ? {
          type: MESSAGE_TYPES.SWITCH_TAB,
          itemType: 'closed_tab',
          sessionId: selectedTab.sessionId
        }
        : (selectedTab.type === 'bookmark' || selectedTab.type === 'history')
          ? {
            type: MESSAGE_TYPES.SWITCH_TAB,
            itemType: selectedTab.type,
            url: selectedTab.url
          }
          : {
            type: MESSAGE_TYPES.SWITCH_TAB,
            itemType: 'tab',
            tabId: selectedTab.tabId ?? -1,
            windowId: selectedTab.windowId ?? -1
          };

    chrome.runtime.sendMessage(request, (response: Response<{ success: boolean }>) => {
      if (response && response.ok === false) {
        console.error('[App] Switch tab failed:', response.error);
      }
    });
  };

  const handleCancel = () => {
    window.close();
  };

  const handleAction = (index: number, action: TabAction) => {
    const selectedTab = results[index];
    if (!selectedTab) return;

    let request: ExtensionMessage | null = null;

    switch (action) {
      case 'PIN_OR_UNPIN': {
        const tabId = selectedTab.tabId;
        if (tabId === undefined) return;
        request = selectedTab.pinned
          ? { type: MESSAGE_TYPES.UNPIN_TAB, tabId }
          : { type: MESSAGE_TYPES.PIN_TAB, tabId };
        break;
      }
      case 'DUPLICATE': {
        const tabId = selectedTab.tabId;
        if (tabId === undefined) return;
        request = { type: MESSAGE_TYPES.DUPLICATE_TAB, tabId };
        break;
      }
      case 'MUTE_OR_UNMUTE': {
        const tabId = selectedTab.tabId;
        if (tabId === undefined) return;
        request = selectedTab.muted
          ? { type: MESSAGE_TYPES.UNMUTE_TAB, tabId }
          : { type: MESSAGE_TYPES.MUTE_TAB, tabId };
        break;
      }
      case 'NEW_WINDOW': {
        const tabId = selectedTab.tabId;
        if (tabId === undefined) return;
        request = { type: MESSAGE_TYPES.MOVE_TO_NEW_WINDOW, tabId };
        break;
      }
      case 'COPY_URL':
        request = { type: MESSAGE_TYPES.COPY_URL, url: selectedTab.url };
        break;
    }

    chrome.runtime.sendMessage(request, (response: Response<unknown>) => {
      if (response && response.ok === false) {
        console.error(`[App] Action ${action} failed:`, response.error);
        return;
      }

      if (action !== 'COPY_URL') {
        refresh();
      }
    });
  };

  const { selectedIndex, setSelectedIndex } = useKeyboardNavigation(
    results.length,
    handleSelect,
    handleCancel,
    handleAction
  );

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
        <div className="loading-state" role="status" aria-live="polite">Loading results…</div>
      ) : error ? (
        <EmptyState
          title="Unable to load launcher results"
          detail={error}
        />
      ) : results.length === 0 ? (
        <EmptyState
          title={query.trim() ? `No results for "${query}"` : 'No tabs, bookmarks, or history items found'}
          detail={query.trim() ? 'Try a different title, host, or URL keyword.' : undefined}
        />
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
