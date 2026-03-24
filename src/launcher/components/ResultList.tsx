import { RankedItemResult } from '../../shared/types';
import { ResultItem } from './ResultItem';
import { EmptyState } from './EmptyState';

type Props = {
  results: RankedItemResult[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

export function ResultList({ results, selectedIndex, onSelect }: Props) {
  if (results.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="result-list">
      {results.map((tab, index) => (
        <ResultItem
          key={tab.id}
          tab={tab}
          selected={index === selectedIndex}
          onClick={() => onSelect(index)}
        />
      ))}
    </div>
  );
}
