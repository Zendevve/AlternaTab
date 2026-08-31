import type { Component } from "solid-js";

interface EmptyStateProps {
  title?: string;
  description?: string;
}

export const EmptyState: Component<EmptyStateProps> = (props) => {
  return (
    <div class="at-empty" role="status" aria-live="polite">
      <div class="at-empty-title">{props.title || "No matching tabs"}</div>
      <div>{props.description || "Try refining your search query or switching scopes"}</div>
    </div>
  );
};
