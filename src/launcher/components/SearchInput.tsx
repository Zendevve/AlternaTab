import { RefObject } from 'react';

type Props = {
  query: string;
  setQuery: (q: string) => void;
  inputRef: RefObject<HTMLInputElement>;
};

export function SearchInput({ query, setQuery, inputRef }: Props) {
  return (
    <div className="search-container">
      <input
        ref={inputRef}
        type="text"
        className="search-input"
        placeholder="Search tabs by title, host, or url..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        autoFocus
      />
    </div>
  );
}
