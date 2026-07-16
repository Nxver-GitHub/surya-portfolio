import { describe, expect, it } from "vitest";
import {
  isDirection,
  pickFirstOnScreenIndex,
  pickNearestIndex,
  type NavRect,
} from "../src/components/controller/spatial";

const rect = (left: number, top: number, w = 100, h = 40): NavRect => ({
  left,
  top,
  width: w,
  height: h,
});

describe("controller spatial nav — pickNearestIndex", () => {
  //  layout:   [0] (0,0)    [1] (200,0)
  //            [2] (0,100)  [3] (200,100)
  const grid = [rect(0, 0), rect(200, 0), rect(0, 100), rect(200, 100)];

  it("moves right to the horizontal neighbour, not the diagonal", () => {
    expect(pickNearestIndex(grid[0], "ArrowRight", grid, 0)).toBe(1);
  });

  it("moves down to the vertical neighbour, not the diagonal", () => {
    expect(pickNearestIndex(grid[0], "ArrowDown", grid, 0)).toBe(2);
  });

  it("moves left and up symmetrically", () => {
    expect(pickNearestIndex(grid[3], "ArrowLeft", grid, 3)).toBe(2);
    expect(pickNearestIndex(grid[3], "ArrowUp", grid, 3)).toBe(1);
  });

  it("returns -1 when nothing lies in the pressed direction", () => {
    expect(pickNearestIndex(grid[1], "ArrowRight", grid, 1)).toBe(-1);
    expect(pickNearestIndex(grid[0], "ArrowUp", grid, 0)).toBe(-1);
  });

  it("penalises orthogonal drift over pure distance", () => {
    // Straight right but farther vs. slightly right and far below:
    const pool = [rect(0, 0), rect(400, 0), rect(60, 500)];
    expect(pickNearestIndex(pool[0], "ArrowRight", pool, 0)).toBe(1);
  });

  it("ignores candidates level with the origin (no forward progress)", () => {
    const pool = [rect(0, 0), rect(2, 0)];
    expect(pickNearestIndex(pool[0], "ArrowRight", pool, 0)).toBe(-1);
  });
});

describe("controller spatial nav — pickFirstOnScreenIndex", () => {
  it("picks the top-left-most candidate inside the viewport", () => {
    const pool = [rect(500, 300), rect(20, 40), rect(300, 40)];
    expect(pickFirstOnScreenIndex(pool, 900)).toBe(1);
  });

  it("skips candidates scrolled out of the viewport", () => {
    const pool = [rect(0, -300), rect(0, 2000), rect(40, 100)];
    expect(pickFirstOnScreenIndex(pool, 900)).toBe(2);
  });

  it("falls back to the first candidate when none are on screen", () => {
    const pool = [rect(0, 5000), rect(0, 6000)];
    expect(pickFirstOnScreenIndex(pool, 900)).toBe(0);
  });

  it("returns -1 for an empty pool", () => {
    expect(pickFirstOnScreenIndex([], 900)).toBe(-1);
  });
});

describe("controller spatial nav — isDirection", () => {
  it("accepts only the four arrows", () => {
    for (const k of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]) {
      expect(isDirection(k), k).toBe(true);
    }
    for (const k of ["Enter", "Tab", "a", "Backspace"]) {
      expect(isDirection(k), k).toBe(false);
    }
  });
});
