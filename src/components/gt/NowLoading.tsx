"use client";

import { useEffect, useState } from "react";
import { loadingTips } from "../../../content/loading-tips";

/**
 * GT2-style NOW LOADING panel for heavy 3D routes: title, animated checkered
 * strip (the `gt-checker` keyframes in globals.css), and one rotating tip.
 * The tip is picked after mount so server/client markup always match; the
 * first paint shows the checker alone for one frame, exactly like a real
 * loading screen warming up.
 */
export function NowLoading({
  label = "Now loading",
  compact = false,
}: {
  label?: string;
  /** Embedded inside another panel (e.g. the café backdrop) — no min height. */
  compact?: boolean;
}) {
  // Random tip picked one frame after mount — the server (and hydration
  // pass) render no tip so markup always matches, and the pick stays out of
  // render (react-hooks/purity) and out of the effect body itself
  // (react-hooks/set-state-in-effect).
  const [tip, setTip] = useState<string | null>(null);
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setTip(loadingTips[Math.floor(Math.random() * loadingTips.length)]);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 px-6 ${
        compact ? "" : "h-full min-h-64 gap-4"
      }`}
    >
      <p className="ts-hard font-display text-sm font-black tracking-[0.3em] text-chrome uppercase">
        {label}…
      </p>
      <div aria-hidden="true" className="gt-checker h-2.5 w-56 max-w-full" />
      {tip ? (
        <p className="ts-hard max-w-[46ch] text-center font-display text-xs font-semibold tracking-wider text-silver uppercase">
          Tip: {tip}
        </p>
      ) : null}
    </div>
  );
}
