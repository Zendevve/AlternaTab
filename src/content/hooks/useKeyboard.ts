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
  isInputFocused?: () => boolean;
  isContextActionsOpen?: () => boolean;
  onCloseContextActions?: () => void;
  onExecuteContextAction?: (
    action: "pin" | "mute" | "duplicate" | "move" | "discard" | "close",
  ) => void;
  onToggleStageCurrent?: () => void;
  onClearStaged?: () => boolean;
  isStagedActive?: () => boolean;
  onExecuteBatchAction?: (action: "close" | "move" | "suspend" | "copy" | "group") => void;
}

export function createKeyboardHandler(profile: () => KeyboardProfile, handlers: KeyboardHandlers) {
  let vimPendingG = false;
  let vimTimer: number | null = null;

  return function handleKeyDown(e: KeyboardEvent): boolean {
    const activeProfile = profile();
    const path = typeof e.composedPath === "function" ? (e.composedPath() as Element[]) : [];
    const rawTarget = (path[0] ?? e.target) as HTMLElement | null;
    const isTargetInput =
      rawTarget instanceof HTMLInputElement ||
      rawTarget instanceof HTMLTextAreaElement ||
      rawTarget?.tagName === "INPUT" ||
      rawTarget?.tagName === "TEXTAREA" ||
      rawTarget?.classList?.contains("at-search-input") ||
      handlers.isInputFocused?.() ||
      false;

    // 1. Universal Escape
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (handlers.onClearStaged?.()) {
        return true;
      }
      if (handlers.isContextActionsOpen?.()) {
        handlers.onCloseContextActions?.();
        return true;
      }
      if (!handlers.isQueryEmpty()) {
        handlers.clearQuery();
      } else {
        handlers.onDismiss();
      }
      return true;
    }

    // 2. Context Actions Drawer open — action keys take priority over search typing
    if (handlers.isContextActionsOpen?.()) {
      const lower = e.key.toLowerCase();
      if (lower === "p") {
        e.preventDefault();
        e.stopPropagation();
        handlers.onExecuteContextAction?.("pin");
        return true;
      }
      if (lower === "m") {
        e.preventDefault();
        e.stopPropagation();
        handlers.onExecuteContextAction?.("mute");
        return true;
      }
      if (lower === "d") {
        e.preventDefault();
        e.stopPropagation();
        handlers.onExecuteContextAction?.("duplicate");
        return true;
      }
      if (lower === "w") {
        e.preventDefault();
        e.stopPropagation();
        handlers.onExecuteContextAction?.("move");
        return true;
      }
      if (lower === "s") {
        e.preventDefault();
        e.stopPropagation();
        handlers.onExecuteContextAction?.("discard");
        return true;
      }
      if (lower === "x") {
        e.preventDefault();
        e.stopPropagation();
        handlers.onExecuteContextAction?.("close");
        return true;
      }
      if (e.key === "ArrowDown" || lower === "j") {
        e.preventDefault();
        e.stopPropagation();
        handlers.onNext();
        return true;
      }
      if (e.key === "ArrowUp" || lower === "k") {
        e.preventDefault();
        e.stopPropagation();
        handlers.onPrev();
        return true;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        handlers.onSelect();
        return true;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        handlers.onToggleContextActions();
        return true;
      }
      e.preventDefault();
      e.stopPropagation();
      return true;
    }

    // 2.5. Staged Action Keys when tabs are staged
    if (handlers.isStagedActive?.()) {
      const lower = e.key.toLowerCase();
      if (e.code === "Space" && (e.shiftKey || e.altKey)) {
        e.preventDefault();
        e.stopPropagation();
        handlers.onToggleStageCurrent?.();
        return true;
      }
      if (e.code === "Space" && handlers.isQueryEmpty()) {
        e.preventDefault();
        e.stopPropagation();
        handlers.onToggleStageCurrent?.();
        return true;
      }
      if (handlers.isQueryEmpty() || !isTargetInput || e.shiftKey || e.altKey) {
        if (e.key === "Delete" || ((lower === "x" || lower === "d") && (handlers.isQueryEmpty() || !isTargetInput || e.shiftKey))) {
          e.preventDefault();
          e.stopPropagation();
          handlers.onExecuteBatchAction?.("close");
          return true;
        }
        if (lower === "w" && (handlers.isQueryEmpty() || !isTargetInput || e.altKey)) {
          e.preventDefault();
          e.stopPropagation();
          handlers.onExecuteBatchAction?.("move");
          return true;
        }
        if (lower === "s" && (handlers.isQueryEmpty() || !isTargetInput || e.altKey)) {
          e.preventDefault();
          e.stopPropagation();
          handlers.onExecuteBatchAction?.("suspend");
          return true;
        }
        if (lower === "c" && (handlers.isQueryEmpty() || !isTargetInput || e.altKey)) {
          e.preventDefault();
          e.stopPropagation();
          handlers.onExecuteBatchAction?.("copy");
          return true;
        }
        if (lower === "g" && (handlers.isQueryEmpty() || !isTargetInput || e.altKey)) {
          e.preventDefault();
          e.stopPropagation();
          handlers.onExecuteBatchAction?.("group");
          return true;
        }
      }
    }

    // 3. Ctrl+Enter / Cmd+Enter: split to new window
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.stopPropagation();
      handlers.onSplitWindow();
      return true;
    }

    // 4. Tab navigation: Tab to cycle scope, Shift+Tab for context actions
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

    // 5. Vim Profile: Normal Mode (when query is empty or focus is not in search input)
    if (activeProfile === "vim" && (handlers.isQueryEmpty() || !isTargetInput)) {
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        handlers.onNext();
        return true;
      }
      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        handlers.onPrev();
        return true;
      }
      if (e.key === "d" || e.key === "x") {
        e.preventDefault();
        e.stopPropagation();
        handlers.onCloseCurrent();
        return true;
      }
      if (e.key === "m") {
        e.preventDefault();
        e.stopPropagation();
        if (handlers.onToggleStageCurrent) {
          handlers.onToggleStageCurrent();
        } else {
          handlers.onToggleMute();
        }
        return true;
      }
      if (e.key === "p") {
        e.preventDefault();
        e.stopPropagation();
        handlers.onTogglePin();
        return true;
      }
      if (e.key === "o" || e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        handlers.onSelect();
        return true;
      }
      if (e.key === "G") {
        e.preventDefault();
        e.stopPropagation();
        handlers.onLastItem();
        return true;
      }
      if (e.key === "g") {
        if (vimPendingG) {
          if (vimTimer) window.clearTimeout(vimTimer);
          vimPendingG = false;
          e.preventDefault();
          e.stopPropagation();
          handlers.onFirstItem();
          return true;
        }
        vimPendingG = true;
        vimTimer = window.setTimeout(() => {
          vimPendingG = false;
        }, 500);
        e.preventDefault();
        e.stopPropagation();
        return true;
      }
      if (e.key === "/") {
        e.preventDefault();
        e.stopPropagation();
        handlers.onFocusSearch();
        return true;
      }
    }

    // 6. When user is typing inside the search input:
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

      // Allow Shift+Space / Alt+Space to stage even while typing in input
      if (e.code === "Space" && (e.shiftKey || e.altKey)) {
        e.preventDefault();
        e.stopPropagation();
        handlers.onToggleStageCurrent?.();
        return true;
      }
      // When input is empty, Space stages the current tab
      if (e.code === "Space" && handlers.isQueryEmpty()) {
        e.preventDefault();
        e.stopPropagation();
        handlers.onToggleStageCurrent?.();
        return true;
      }

      // Allow all normal typing in the input!
      return false;
    }

    // 7. When focus is NOT in the search input:
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

    return false;
  };
}
