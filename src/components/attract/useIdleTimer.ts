"use client";

import { useEffect, useRef } from "react";
import { createIdleTimer } from "./idleTimer";

/** The activity signals that count as "not idle" — pointer, keyboard, wheel/scroll and touch. */
const ACTIVITY_EVENTS = [
  "pointermove",
  "pointerdown",
  "keydown",
  "scroll",
  "touchstart",
] as const;

/**
 * Arms a `timeoutMs` idle countdown while `active` is true, resetting it on
 * any activity event and firing `onIdle` once the window elapses undisturbed.
 * Disarmed entirely under `prefers-reduced-motion` (checked once per activation,
 * matching the rest of the site's reduced-motion handling) and fully torn down
 * on unmount or when `active` flips false, so the timer never outlives the
 * screen that armed it.
 */
export function useIdleTimer(
  timeoutMs: number,
  onIdle: () => void,
  active: boolean,
): void {
  const onIdleRef = useRef(onIdle);

  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) return;

    const controller = createIdleTimer({
      timeoutMs,
      onIdle: () => onIdleRef.current(),
    });
    controller.reset();

    const onActivity = () => controller.reset();
    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, onActivity, { passive: true });
    }

    return () => {
      controller.stop();
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, onActivity);
      }
    };
  }, [timeoutMs, active]);
}
