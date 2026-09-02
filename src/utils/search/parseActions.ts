import type { CommandId } from "../../types/models";

const ACTION_MAP: Record<string, CommandId> = {
  "mute": "pin-toggle", // will be handled as toggleMute, but map to distinct? For now map to pin-toggle as placeholder
  "unmute": "pin-toggle",
  "pin": "pin-toggle",
  "unpin": "pin-toggle",
  "close": "close-other", // generic close -> close-other
  "copy": "copy-url",
  "duplicate": "duplicate-tab",
  "dupe": "duplicate-tab",
  "move": "split-window",
  "split": "split-window",
  "discard": "suspend-inactive",
  "suspend": "suspend-inactive",
  "bookmark": "bookmark-this",
  "newtab": "new-tab",
  "newwindow": "new-window",
  "incognito": "new-incognito-window",
  "restore": "restore-tab",
};

const QUICK_ACTIONS: Record<string, string> = {
  "mute": "mute",
  "pin": "pin",
  "close": "close",
  "copy": "copy",
  "duplicate": "duplicate",
  "move": "move",
  "discard": "discard",
};

export interface ParsedAction {
  baseQuery: string;
  action: string | null; // e.g. "mute", "pin"
  commandId: CommandId | null;
}

export function parseQuickAction(input: string): ParsedAction {
  // Look for trailing " >action" or " > action"
  const trimmed = input.trimEnd();
  const idx = trimmed.lastIndexOf(">");
  if (idx === -1) return { baseQuery: input, action: null, commandId: null };
  // Must have space before > or > at start after base
  const before = trimmed.slice(0, idx).trimEnd();
  const after = trimmed.slice(idx + 1).trim().toLowerCase();
  if (!after) return { baseQuery: input, action: null, commandId: null };
  // after should be a single word action
  const firstWord = after.split(/\s+/)[0] ?? "";
  if (!firstWord) return { baseQuery: input, action: null, commandId: null };
  if (firstWord in QUICK_ACTIONS) {
    const cmd = ACTION_MAP[firstWord] ?? null;
    return { baseQuery: before, action: firstWord, commandId: cmd };
  }
  // Also support with space: " > mute"
  return { baseQuery: input, action: null, commandId: null };
}

export function getActionForString(action: string): CommandId | null {
  return ACTION_MAP[action.toLowerCase()] ?? null;
}
