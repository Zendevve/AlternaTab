import { useState, useEffect } from 'react';

export type TabAction = 'CLOSE' | 'PIN' | 'DUPLICATE' | 'MUTE' | 'NEW_WINDOW' | 'COPY_URL';

export function useKeyboardNavigation(
  itemCount: number,
  onSelect: (index: number) => void,
  onCancel: () => void,
  onAction?: (index: number, action: TabAction) => void
) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selection when item count changes (e.g. search query changed)
  useEffect(() => {
    setSelectedIndex(0);
  }, [itemCount]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % itemCount);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + itemCount) % itemCount);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (itemCount > 0) {
          onSelect(selectedIndex);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key >= '1' && e.key <= '9' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const index = parseInt(e.key, 10) - 1;
        if (index < itemCount) {
          onSelect(index);
        }
      } else if (onAction && itemCount > 0 && (e.metaKey || e.ctrlKey)) {
        const key = e.key.toLowerCase();
        switch (key) {
          case 'w':
            e.preventDefault();
            onAction(selectedIndex, 'CLOSE');
            break;
          case 'p':
            e.preventDefault();
            onAction(selectedIndex, 'PIN');
            break;
          case 'd':
            e.preventDefault();
            onAction(selectedIndex, 'DUPLICATE');
            break;
          case 'm':
            e.preventDefault();
            onAction(selectedIndex, 'MUTE');
            break;
          case 'c':
            e.preventDefault();
            onAction(selectedIndex, 'COPY_URL');
            break;
          case 'n':
            e.preventDefault();
            onAction(selectedIndex, 'NEW_WINDOW');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [itemCount, selectedIndex, onSelect, onCancel, onAction]);

  return { selectedIndex, setSelectedIndex };
}
