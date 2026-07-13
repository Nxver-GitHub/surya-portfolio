import { describe, expect, it } from "vitest";
import {
  HISTORY_CURSOR_HOME,
  cycleHistory,
  type HistoryCursor,
} from "../src/components/cafe/terminal/history";

describe("history — cycleHistory", () => {
  const history = ["help", "about", "projects"] as const;

  it("up from the draft saves the draft and shows the newest entry", () => {
    const result = cycleHistory(history as unknown as string[], HISTORY_CURSOR_HOME, "up", "wip draft");
    expect(result.value).toBe("projects");
    expect(result.cursor.index).toBe(2);
    expect(result.cursor.draft).toBe("wip draft");
  });

  it("repeated up walks toward the oldest entry and clamps there", () => {
    let cursor: HistoryCursor = HISTORY_CURSOR_HOME;
    let result = cycleHistory(history as unknown as string[], cursor, "up", "wip");
    expect(result.value).toBe("projects");
    cursor = result.cursor;

    result = cycleHistory(history as unknown as string[], cursor, "up", "wip");
    expect(result.value).toBe("about");
    cursor = result.cursor;

    result = cycleHistory(history as unknown as string[], cursor, "up", "wip");
    expect(result.value).toBe("help");
    cursor = result.cursor;

    // Clamp: one more "up" at the oldest entry stays put.
    result = cycleHistory(history as unknown as string[], cursor, "up", "wip");
    expect(result.value).toBe("help");
    expect(result.cursor.index).toBe(0);
  });

  it("down past the newest entry restores the draft and leaves cycling", () => {
    const afterUp = cycleHistory(history as unknown as string[], HISTORY_CURSOR_HOME, "up", "my draft");
    expect(afterUp.cursor.index).toBe(2);

    const afterDown = cycleHistory(history as unknown as string[], afterUp.cursor, "down", "ignored while cycling");
    expect(afterDown.value).toBe("my draft");
    expect(afterDown.cursor.index).toBeNull();
  });

  it("down while not cycling is a no-op", () => {
    const result = cycleHistory(history as unknown as string[], HISTORY_CURSOR_HOME, "down", "current text");
    expect(result.value).toBe("current text");
    expect(result.cursor).toEqual(HISTORY_CURSOR_HOME);
  });

  it("empty history: up is a no-op", () => {
    const result = cycleHistory([], HISTORY_CURSOR_HOME, "up", "current text");
    expect(result.value).toBe("current text");
    expect(result.cursor).toEqual(HISTORY_CURSOR_HOME);
  });

  it("empty history: down is a no-op", () => {
    const result = cycleHistory([], HISTORY_CURSOR_HOME, "down", "current text");
    expect(result.value).toBe("current text");
    expect(result.cursor).toEqual(HISTORY_CURSOR_HOME);
  });

  it("does not mutate the input history array or cursor", () => {
    const mutableHistory = ["help", "about"];
    const frozenHistory = Object.freeze([...mutableHistory]);
    const frozenCursor = Object.freeze({ ...HISTORY_CURSOR_HOME });

    expect(() =>
      cycleHistory(frozenHistory, frozenCursor, "up", "draft"),
    ).not.toThrow();
    expect(frozenHistory).toEqual(["help", "about"]);
    expect(frozenCursor).toEqual(HISTORY_CURSOR_HOME);
  });
});
