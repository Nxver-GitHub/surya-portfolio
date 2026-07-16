"use client";

import { useEffect, useState } from "react";

/**
 * Minimum-showtime gate for NOW LOADING screens. Modern connections load the
 * 3D scenes so fast the loading tips flash past unread — the PS1 answer is a
 * short mandatory hold. Children mount immediately but stay invisible (so
 * chunks/models stream behind the curtain); the overlay holds for
 * {@link MIN_LOADING_MS} from mount, then lifts. If the scene is still
 * loading after the hold, its own fallback takes over — on a slow link that
 * reads as the tip rotating, which is exactly what long PS1 loads did.
 */

/** Long enough to actually read one tip; short enough to stay charming. */
export const MIN_LOADING_MS = 2600;

export function LoadingHold({
  overlay,
  children,
}: {
  /** The NOW LOADING panel (already styled for the slot it covers). */
  overlay: React.ReactNode;
  children: React.ReactNode;
}) {
  const [held, setHeld] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setHeld(false), MIN_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative h-full">
      <div className={held ? "invisible h-full" : "h-full"}>{children}</div>
      {held ? <div className="absolute inset-0">{overlay}</div> : null}
    </div>
  );
}
