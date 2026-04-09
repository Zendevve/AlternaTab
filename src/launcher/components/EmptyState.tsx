type Props = {
  title?: string;
  detail?: string;
};

export function EmptyState({ title = 'No matching tabs', detail }: Props) {
  return (
    <div className="empty-state">
      <div className="empty-state-text">{title}</div>
      {detail ? <div className="empty-state-detail">{detail}</div> : null}
    </div>
  );
}
