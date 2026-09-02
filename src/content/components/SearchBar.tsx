import type { Component } from "solid-js";
import type { SearchScope } from "../../types/models";

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  scope: SearchScope;
  onCycleScope: () => void;
  itemCount: number;
  inputRef?: (el: HTMLInputElement) => void;
}

export const SearchBar: Component<SearchBarProps> = (props) => {
  return (
    <search class="at-search-header">
      <svg
        class="at-search-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <title>Search icon</title>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        ref={props.inputRef}
        type="text"
        class="at-search-input"
        placeholder="Search tabs, URLs, domains... (@ tabs, # groups, * bookmarks, > commands)"
        value={props.query}
        onInput={(e) => props.onQueryChange(e.currentTarget.value)}
        aria-label="Search tabs and commands"
        autocomplete="off"
        spellcheck={false}
        autofocus
      />
      <button
        type="button"
        class="at-scope-pill"
        on:click={(e: MouseEvent) => {
          e.stopPropagation();
          props.onCycleScope();
        }}
        title="Click or press Tab to cycle search scope"
        aria-label={`Current scope: ${props.scope}. Click to switch.`}
      >
        {props.scope === "tabs-only" ? "tabs" : props.scope} ({props.itemCount})
      </button>
    </search>
  );
};
