import { useEffect, useRef } from 'react';
import { RankedTabResult } from '../../shared/types';

type Props = {
  tab: RankedTabResult;
  selected: boolean;
  onClick: () => void;
};

export function ResultItem({ tab, selected, onClick }: Props) {
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected && itemRef.current) {
      itemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [selected]);

  return (
    <div
      ref={itemRef}
      className={`result-item ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="result-icon-container">
        {tab.favIconUrl ? (
          <img src={tab.favIconUrl} className="result-icon" alt="" />
        ) : (
          <div className="result-icon-fallback" />
        )}
      </div>
      <div className="result-details">
        <div className="result-title">{tab.title}</div>
        <div className="result-url">{tab.host}{tab.path && tab.path !== '/' ? tab.path : ''}</div>
      </div>
      <div className="result-badges">
        {tab.isCurrentTab && <span className="badge current-badge">Current</span>}
        {tab.pinned && <span className="badge pinned-badge">Pinned</span>}
      </div>
    </div>
  );
}
