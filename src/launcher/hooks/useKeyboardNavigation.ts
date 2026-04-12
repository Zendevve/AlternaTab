import { useState, useEffect } from 'react';

export type TabAction = 'PIN_OR_UNPIN' | 'DUPLICATE' | 'MUTE_OR_UNMUTE' | 'NEW_WINDOW' | 'COPY_URL';

export function useKeyboardNavigation(
  itemCount: number,
  onSelect: (index: number) => void,
  onCancel: () => void,
  onAction?: (index: number, action: TabAction) => void
) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (itemCount <= 0) {
      setSelectedIndex(0);
      return;
    }

    setSelectedIndex((prev) => Math.min(prev, itemCount - 1));
  }, [itemCount]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        if (itemCount <= 0) return;
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % itemCount);
        return;
      }

      if (e.key === 'ArrowUp') {
        if (itemCount <= 0) return;
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + itemCount) % itemCount);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (itemCount > 0) {
          onSelect(selectedIndex);
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }

      if (e.key >= '1' && e.key <= '9' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const index = parseInt(e.key, 10) - 1;
        if (index < itemCount) {
          setSelectedIndex(index);
        }
        return;
      }

      if (onAction && itemCount > 0 && (e.metaKey || e.ctrlKey)) {
        const key = e.key.toLowerCase();
        switch (key) {
          case 'p':
            e.preventDefault();
            onAction(selectedIndex, 'PIN_OR_UNPIN');
            break;
          case 'd':
            e.preventDefault();
            onAction(selectedIndex, 'DUPLICATE');
            break;
          case 'm':
            e.preventDefault();
            onAction(selectedIndex, 'MUTE_OR_UNMUTE');
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
