import { useEffect, useRef } from 'react';
import { RankedItemResult } from '../../shared/types';
import { formatDomain, formatPath } from '../lib/format';

type Props = {
  tab: RankedItemResult;
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

  const faviconSrc = tab.favIconUrl || `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(tab.url)}&size=32`;

  return (
    <div
      ref={itemRef}
      className={`result-item ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="result-icon-container">
        <img src={faviconSrc} className="result-icon" alt="" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.removeAttribute('hidden'); }} />
        <div className="result-icon-fallback" hidden />
      </div>
      <div className="result-details">
        <div className="result-title">{tab.title}</div>
        <div className="result-url">{formatDomain(tab.host)}{formatPath(tab.path)}</div>
      </div>
      <div className="result-badges">
        {tab.isCurrentTab && <span className="badge current-badge">Current</span>}
        {tab.pinned && <span className="badge pinned-badge">Pinned</span>}
      </div>
    </div>
  );
}
