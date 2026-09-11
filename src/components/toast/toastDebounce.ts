/**
 * Pure debounced show/hide controller — no DOM, no React, directly unit
 * testable (see `tests/toast-debounce.test.ts`). A burst of rapid
 * `notify()` calls shows once and keeps refreshing the same auto-hide timer,
 * rather than re-triggering the show for every call in the burst.
 */

export interface DebouncedToastOptions {
  /** Milliseconds the toast stays visible after the last `notify()`. */
  delayMs: number;
  onShow: () => void;
  onHide: () => void;
  /** Injectable for tests; defaults to the real timer functions. */
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
}

export interface DebouncedToastController {
  /** Show (if hidden) and (re)start the auto-hide countdown. */
  notify: () => void;
  /** Cancel any pending auto-hide without calling `onHide`. */
  cancel: () => void;
}

export function createDebouncedToast({
  delayMs,
  onShow,
  onHide,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
}: DebouncedToastOptions): DebouncedToastController {
  let handle: ReturnType<typeof setTimeout> | null = null;

  function cancel(): void {
    if (handle !== null) {
      clearTimeoutFn(handle);
      handle = null;
    }
  }

  function notify(): void {
    if (handle === null) onShow();
    cancel();
    handle = setTimeoutFn(() => {
      handle = null;
      onHide();
    }, delayMs);
  }

  return { notify, cancel };
}
