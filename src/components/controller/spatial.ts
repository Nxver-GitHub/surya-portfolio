/**
 * Pure spatial-navigation geometry for controller mode. Operates on plain
 * rects so it unit-tests without a DOM — ControllerMode adapts elements to
 * rects and applies the result.
 */

export interface NavRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type Direction = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

export function isDirection(key: string): key is Direction {
  return (
    key === "ArrowUp" ||
    key === "ArrowDown" ||
    key === "ArrowLeft" ||
    key === "ArrowRight"
  );
}

function centerOf(rect: NavRect): { x: number; y: number } {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** Penalty multiplier for drift orthogonal to the pressed direction. */
const CROSS_PENALTY = 2.5;

/** Minimum forward progress (px) for a candidate to count as "in direction". */
const MIN_ADVANCE = 4;

/**
 * Classic spatial-nav pick: the candidate whose center lies in the pressed
 * direction's half-plane with the lowest (advance + orthogonal-drift)
 * score. Returns the index into `pool`, or -1 when nothing lies that way.
 */
export function pickNearestIndex(
  origin: NavRect,
  direction: Direction,
  pool: readonly NavRect[],
  skipIndex = -1,
): number {
  const from = centerOf(origin);
  let best = -1;
  let bestScore = Infinity;

  for (let i = 0; i < pool.length; i++) {
    if (i === skipIndex) continue;
    const c = centerOf(pool[i]);
    const dx = c.x - from.x;
    const dy = c.y - from.y;

    let main: number;
    let cross: number;
    switch (direction) {
      case "ArrowRight":
        main = dx;
        cross = Math.abs(dy);
        break;
      case "ArrowLeft":
        main = -dx;
        cross = Math.abs(dy);
        break;
      case "ArrowDown":
        main = dy;
        cross = Math.abs(dx);
        break;
      case "ArrowUp":
        main = -dy;
        cross = Math.abs(dx);
        break;
    }
    if (main <= MIN_ADVANCE) continue;

    const score = main + cross * CROSS_PENALTY;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

/**
 * Starting point when nothing is focused: the top-left-most candidate whose
 * rect intersects the viewport band [0, viewportHeight]. Falls back to the
 * first candidate. Returns -1 only for an empty pool.
 */
export function pickFirstOnScreenIndex(
  pool: readonly NavRect[],
  viewportHeight: number,
): number {
  let best = -1;
  let bestScore = Infinity;
  for (let i = 0; i < pool.length; i++) {
    const r = pool[i];
    if (r.top + r.height < 0 || r.top > viewportHeight) continue;
    const score = r.top * 2 + r.left;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  if (best !== -1) return best;
  return pool.length > 0 ? 0 : -1;
}
