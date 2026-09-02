import type { KeyboardProfile } from "../../types/models";

export interface KeyboardHandlers {
  onNext: () => void;
  onPrev: () => void;
  onSelect: () => void;
  onCloseCurrent: () => void;
  onSplitWindow: () => void;
  onCycleScope: () => void;
  onToggleMute: () => void;
  onTogglePin: () => void;
  onFirstItem: () => void;
  onLastItem: () => void;
  onDismiss: () => void;
  onFocusSearch: () => void;
  onToggleContextActions: () => void;
  onMruNext?: () => boolean;
  isQueryEmpty: () => boolean;
  clearQuery: () => void;
}
export function createKeyboardHandler(profile: () => KeyboardProfile, handlers: KeyboardHandlers) {
  let vimPendingG = false;
  let vimTimer: number | null = null;

  return function handleKeyDown(e: KeyboardEvent): boolean {
    const activeProfile = profile();
    const isTargetInput = e.target instanceof HTMLInputElement;

    // 1. Universal Escape
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (!handlers.isQueryEmpty()) {
        handlers.clearQuery();
      } else {
        handlers.onDismiss();
      }
      return true;
    }

    // 2. Ctrl+Enter / Cmd+Enter: split to new window
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.stopPropagation();
      handlers.onSplitWindow();
      return true;
    }

    // 3. Tab navigation: Tab to cycle scope, Shift+Tab for context actions
    // 3. Tab navigation: Tab to cycle scope, Shift+Tab for context actions — MRU intercept first
    if (e.key === "Tab") {
      if (!e.shiftKey && handlers.onMruNext) {
        const handled = handlers.onMruNext();
        if (handled) {
          e.preventDefault();
          e.stopPropagation();
          return true;
        }
      }
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) {
        handlers.onToggleContextActions();
      } else {
        handlers.onCycleScope();
      }
      return true;
    }
    // 4. When user is typing inside the search input:
    if (isTargetInput) {
      // List navigation via arrows
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        handlers.onNext();
        return true;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        handlers.onPrev();
        return true;
      }

      // Enter selects/activates top result
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        handlers.onSelect();
        return true;
      }

      // Emacs ctrl-chords while in input
      if (activeProfile === "emacs" && e.ctrlKey) {
        if (e.key === "n" || e.key === "N") {
          e.preventDefault();
          e.stopPropagation();
          handlers.onNext();
          return true;
        }
        if (e.key === "p" || e.key === "P") {
          e.preventDefault();
          e.stopPropagation();
          handlers.onPrev();
          return true;
        }
        if (e.key === "g" || e.key === "G") {
          e.preventDefault();
          e.stopPropagation();
          handlers.onDismiss();
          return true;
        }
        if (e.key === "w" || e.key === "W") {
          e.preventDefault();
          e.stopPropagation();
          handlers.onCloseCurrent();
          return true;
        }
      }

      // Standard profile Delete/Backspace when input is already empty
      if (activeProfile === "standard" && (e.key === "Delete" || e.key === "Backspace")) {
        if (handlers.isQueryEmpty()) {
          e.preventDefault();
          e.stopPropagation();
          handlers.onCloseCurrent();
          return true;
        }
        // Let native input handle backspacing/deletion
        return false;
      }

      // Allow all normal typing in the input!
      return false;
    }

    // 5. When focus is NOT in the search input:
    if (activeProfile === "standard") {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        handlers.onNext();
        return true;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        handlers.onPrev();
        return true;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        handlers.onSelect();
        return true;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handlers.onCloseCurrent();
        return true;
      }
      return false;
    }

    if (activeProfile === "emacs") {
      if (e.ctrlKey && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        handlers.onNext();
        return true;
      }
      if (e.ctrlKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        handlers.onPrev();
        return true;
      }
      if (e.ctrlKey && (e.key === "g" || e.key === "G")) {
        e.preventDefault();
        handlers.onDismiss();
        return true;
      }
      if (e.ctrlKey && (e.key === "w" || e.key === "W")) {
        e.preventDefault();
        handlers.onCloseCurrent();
        return true;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        handlers.onSelect();
        return true;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        handlers.onNext();
        return true;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        handlers.onPrev();
        return true;
      }
      return false;
    }

    if (activeProfile === "vim") {
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        handlers.onNext();
        return true;
      }
      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        handlers.onPrev();
        return true;
      }
      if (e.key === "d" || e.key === "x") {
        e.preventDefault();
        handlers.onCloseCurrent();
        return true;
      }
      if (e.key === "m") {
        e.preventDefault();
        handlers.onToggleMute();
        return true;
      }
      if (e.key === "p") {
        e.preventDefault();
        handlers.onTogglePin();
        return true;
      }
      if (e.key === "o" || e.key === "Enter") {
        e.preventDefault();
        handlers.onSelect();
        return true;
      }
      if (e.key === "/") {
        e.preventDefault();
        handlers.onFocusSearch();
        return true;
      }
      if (e.key === "G") {
        e.preventDefault();
        handlers.onLastItem();
        return true;
      }
      if (e.key === "g") {
        if (vimPendingG) {
          if (vimTimer) window.clearTimeout(vimTimer);
          vimPendingG = false;
          e.preventDefault();
          handlers.onFirstItem();
          return true;
        }
        vimPendingG = true;
        vimTimer = window.setTimeout(() => {
          vimPendingG = false;
        }, 500);
        return true;
      }
    }

    return false;
  };
}
