"use client";

import { useCallback, useEffect, useState } from "react";
import { IntroMontage } from "@/components/boot/intro/IntroMontage";
import { useIdleTimer } from "./useIdleTimer";

/** 75s of no input on the World Map before the reel takes over. */
const IDLE_MS = 75_000;
const ACTIVITY_EVENTS = [
  "pointermove",
  "pointerdown",
  "keydown",
  "wheel",
  "touchstart",
] as const;

/**
 * Attract mode — the arcade-cabinet idle loop for the World Map home screen.
 * After {@link IDLE_MS} of no input it hard-fades into the boot sequence's
 * heritage montage (the same silhouettes, purely reused presentationally),
 * looping the reel until any input dismisses it instantly. It never touches
 * `sessionStorage`, so it cannot re-arm or disturb BootSequence's
 * once-per-session PRESS START gate — IntroMontage itself holds no session
 * state at all, only BootSequence does.
 *
 * Fully inert while hidden (this component renders nothing) and, while
 * showing, marked `aria-hidden`/`inert` since it is decorative chrome, not a
 * control — dismissal never touches focus, so whatever had focus keeps it.
 */
export function AttractMode() {
  const [active, setActive] = useState(false);
  const [compact, setCompact] = useState(false);
  // Remounting IntroMontage on each key bump restarts its beat grid — this is
  // how the reel "loops" without IntroMontage needing a loop mode of its own.
  const [loopKey, setLoopKey] = useState(0);

  const activate = useCallback(() => {
    if (typeof window !== "undefined") {
      setCompact(window.innerWidth < 768);
    }
    setLoopKey((k) => k + 1);
    setActive(true);
  }, []);

  const dismiss = useCallback(() => setActive(false), []);
  const loopMontage = useCallback(() => setLoopKey((k) => k + 1), []);

  // Idle detection is only armed while attract mode is NOT already showing.
  useIdleTimer(IDLE_MS, activate, !active);

  // While showing, ANY input dismisses immediately — no debounce, no
  // animation to wait out. Listens on window rather than the overlay so it
  // fires regardless of what currently has focus.
  useEffect(() => {
    if (!active) return;
    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, dismiss, { passive: true });
    }
    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, dismiss);
      }
    };
  }, [active, dismiss]);

  if (!active) return null;

  return (
    <div
      aria-hidden="true"
      inert
      className="attract-mode fixed inset-0 z-60 bg-asphalt"
    >
      <IntroMontage key={loopKey} compact={compact} onComplete={loopMontage} />
    </div>
  );
}
