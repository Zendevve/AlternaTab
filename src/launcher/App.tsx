import { useState, useRef, useEffect } from 'react';
import { useLauncherData } from './hooks/useLauncherData';
import { useSearch } from './hooks/useSearch';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { SearchInput } from './components/SearchInput';
import { ResultList } from './components/ResultList';
import { FooterHints } from './components/FooterHints';
import { MESSAGE_TYPES, SwitchTabRequest } from '../shared/messages';

export function App() {
  const { tabs, loading } = useLauncherData();
  const [query, setQuery] = useState('');

  const results = useSearch(tabs, query);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelect = (index: number) => {
    const selectedTab = results[index];
    if (!selectedTab) return;

    const request: SwitchTabRequest = {
      type: MESSAGE_TYPES.SWITCH_TAB,
      tabId: selectedTab.id,
      windowId: selectedTab.windowId
    };
    chrome.runtime.sendMessage(request);
  };

  const handleCancel = () => {
    window.close(); // Close the launcher popup
  };

  const { selectedIndex, setSelectedIndex } = useKeyboardNavigation(
    results.length,
    handleSelect,
    handleCancel
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

      {loading ? (
        <div className="loading-state">Loading tabs...</div>
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
