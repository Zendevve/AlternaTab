import { useEffect, useMemo, useRef, useState } from 'react';
import { RankedItemResult } from '../../shared/types';
import { buildFaviconSources, formatDomain, formatPath } from '../lib/format';

type Props = {
  tab: RankedItemResult;
  selected: boolean;
  onClick: () => void;
};

export function ResultItem({ tab, selected, onClick }: Props) {
  const itemRef = useRef<HTMLDivElement>(null);
  const faviconSources = useMemo(() => buildFaviconSources(tab.url, tab.favIconUrl), [tab.url, tab.favIconUrl]);
  const [faviconIndex, setFaviconIndex] = useState(0);
  const [faviconFailed, setFaviconFailed] = useState(false);

  useEffect(() => {
    setFaviconIndex(0);
    setFaviconFailed(false);
  }, [faviconSources]);

  useEffect(() => {
    if (selected && itemRef.current) {
      itemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [selected]);

  const badgeEntries = [
    tab.isCurrentTab ? { className: 'current-badge', label: 'Current' } : null,
    tab.active ? { className: 'active-badge', label: 'Active' } : null,
    tab.pinned ? { className: 'pinned-badge', label: 'Pinned' } : null,
    tab.type === 'closed_tab' ? { className: 'closed-badge', label: 'Closed' } : null,
    tab.type === 'bookmark' ? { className: 'bookmark-badge', label: 'Bookmark' } : null,
    tab.type === 'history' ? { className: 'history-badge', label: 'History' } : null
  ].filter((entry): entry is { className: string; label: string } => entry !== null);

  const faviconSrc = faviconSources[faviconIndex] ?? '';

  return (
    <div
      ref={itemRef}
      className={`result-item ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="result-icon-container">
        {!faviconFailed && faviconSrc ? (
          <img
            key={faviconSrc}
            src={faviconSrc}
            className="result-icon"
            alt=""
            onError={() => {
              if (faviconIndex < faviconSources.length - 1) {
                setFaviconIndex((prev) => prev + 1);
              } else {
                setFaviconFailed(true);
              }
            }}
          />
        ) : null}
        <div className="result-icon-fallback" hidden={!faviconFailed || !faviconSrc} />
      </div>
      <div className="result-details">
        <div className="result-title">{tab.title}</div>
        <div className="result-url">{formatDomain(tab.host)}{formatPath(tab.path)}</div>
      </div>
      {badgeEntries.length > 0 ? (
        <div className="result-badges">
          {badgeEntries.map((badge) => (
            <span key={badge.className} className={`badge ${badge.className}`}>
              {badge.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
