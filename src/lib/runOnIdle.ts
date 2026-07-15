/**
 * Defers `callback` until the page has been idle for roughly `delayMs` —
 * used to warm secondary GLB assets (garage hero cars, café exhibits)
 * without competing with the active route's own critical requests.
 *
 * `requestIdleCallback` alone isn't enough here: on a lightly-loaded page it
 * can fire on the very next tick (there's nothing else to wait out), which
 * defeats the point of deferring. So this first waits out `delayMs` via
 * `setTimeout`, then hands off to `requestIdleCallback` (falling back to
 * firing immediately where it's unsupported, e.g. Safari) so the actual work
 * still lands during a genuinely idle frame rather than mid-paint.
 *
 * Returns a cancel function; safe to call from a `useEffect` cleanup.
 */
export function runOnIdle(callback: () => void, delayMs = 8000): () => void {
  if (typeof window === "undefined") return () => {};

  const timer = window.setTimeout(() => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(callback, { timeout: 2000 });
    } else {
      callback();
    }
  }, delayMs);

  return () => window.clearTimeout(timer);
}
