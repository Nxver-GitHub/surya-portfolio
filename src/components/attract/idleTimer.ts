/**
 * Pure idle-timer controller — no DOM, no React. Framework glue (activity
 * listeners, `prefers-reduced-motion` detection) lives in `useIdleTimer.ts`;
 * this module only knows how to arm/disarm a single countdown, which keeps
 * it directly unit-testable in the node test environment (see
 * `tests/idle-timer.test.ts`).
 */

export interface IdleTimerOptions {
  /** Milliseconds of inactivity before `onIdle` fires. */
  timeoutMs: number;
  onIdle: () => void;
  /**
   * The off-switch: when true, `reset()` never arms a timer, so `onIdle`
   * can never fire. Mirrors `prefers-reduced-motion` without this module
   * needing to know what that is.
   */
  reducedMotion?: boolean;
  /** Injectable for tests; defaults to the real timer functions. */
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
}

export interface IdleTimerController {
  /** (Re)start the countdown from now, replacing any pending timer. */
  reset: () => void;
  /** Stop the countdown and clear any pending timer. */
  stop: () => void;
}

export function createIdleTimer({
  timeoutMs,
  onIdle,
  reducedMotion = false,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
}: IdleTimerOptions): IdleTimerController {
  let handle: ReturnType<typeof setTimeout> | null = null;

  function stop(): void {
    if (handle !== null) {
      clearTimeoutFn(handle);
      handle = null;
    }
  }

  function reset(): void {
    stop();
    if (reducedMotion) return;
    handle = setTimeoutFn(onIdle, timeoutMs);
  }

  return { reset, stop };
}
