import { useState, useEffect } from 'react';

export function useKeyboardNavigation(
  itemCount: number,
  onSelect: (index: number) => void,
  onCancel: () => void
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [itemCount, selectedIndex, onSelect, onCancel]);

  return { selectedIndex, setSelectedIndex };
}
