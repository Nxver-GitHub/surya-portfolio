/**
 * history — shell-style ↑/↓ input-history cycling (E11). Pure.
 *
 * The cursor tracks where the visitor is in the history: `index: null` means
 * "at the live draft" (not cycling). Arrowing up from the draft saves it, so
 * arrowing back down past the newest entry restores what they were typing.
 */

export interface HistoryCursor {
  /** Index into history currently shown, or null when on the live draft. */
  readonly index: number | null;
  /** The in-progress input saved when cycling began. */
  readonly draft: string;
}

/** Cursor for "not cycling, nothing saved". */
export const HISTORY_CURSOR_HOME: HistoryCursor = { index: null, draft: "" };

export interface HistoryCycleResult {
  readonly cursor: HistoryCursor;
  /** What the input field should now contain. */
  readonly value: string;
}

/** Advance the cursor one step up/down through `history`. Pure. */
export function cycleHistory(
  history: readonly string[],
  cursor: HistoryCursor,
  direction: "up" | "down",
  currentInput: string,
): HistoryCycleResult {
  if (direction === "up") {
    if (history.length === 0) return { cursor, value: currentInput };
    if (cursor.index === null) {
      // Enter cycling: save the draft, show the newest entry.
      const index = history.length - 1;
      return {
        cursor: { index, draft: currentInput },
        value: history[index],
      };
    }
    const index = Math.max(0, cursor.index - 1);
    return { cursor: { ...cursor, index }, value: history[index] };
  }

  // direction === "down"
  if (cursor.index === null) return { cursor, value: currentInput };
  if (cursor.index >= history.length - 1) {
    // Past the newest entry: restore the saved draft, leave cycling.
    return {
      cursor: { index: null, draft: "" },
      value: cursor.draft,
    };
  }
  const index = cursor.index + 1;
  return { cursor: { ...cursor, index }, value: history[index] };
}
