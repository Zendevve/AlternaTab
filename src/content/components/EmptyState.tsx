import type { Component } from "solid-js";

interface EmptyStateProps {
  title?: string;
  description?: string;
}

export const EmptyState: Component<EmptyStateProps> = (props) => {
  return (
    <div class="at-empty" role="status" aria-live="polite">
      <div class="at-empty-icon" aria-hidden="true">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16" y2="16" />
        </svg>
      </div>
      <div class="at-empty-title">{props.title || "No matching tabs"}</div>
      <div class="at-empty-desc">
        {props.description || "Try refining your search query or switching scopes"}
      </div>
    </div>
  );
};
