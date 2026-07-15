"use client";

import { useEffect, useState } from "react";
import { FrameView } from "./frames";
import { CAR_SILHOUETTES, FRAMES, FRAMES_COMPACT } from "./sequence";

/** Beat 2 — the hard-cut heritage montage on a fixed beat grid. Silent: the
 *  grid IS the rhythm, so it reads music-synced without any audio. 165ms keeps
 *  the machine-gun energy while giving each cut (esp. the car silhouettes)
 *  enough dwell to actually register. */
const GRID_MS = 165;

/** Delay before the skip hint fades in — lets the opening cuts land clean
 *  before any UI chrome appears. */
const HINT_DELAY_MS = 1200;

interface IntroMontageProps {
  compact: boolean;
  onComplete: () => void;
}

export function IntroMontage({ compact, onComplete }: IntroMontageProps) {
  const frames = compact ? FRAMES_COMPACT : FRAMES;
  const [index, setIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);

  // Warm the car-silhouette masks so no cut flashes empty while it decodes.
  useEffect(() => {
    for (const id of CAR_SILHOUETTES) {
      const img = new Image();
      img.src = `/intro/cars/${id}.png`;
    }
  }, []);

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      if (i >= frames.length) {
        clearInterval(id);
        onComplete();
        return;
      }
      setIndex(i);
    }, GRID_MS);
    return () => clearInterval(id);
  }, [frames, onComplete]);

  // Invisible-affordance fix: surface a quiet skip hint once the montage has
  // had a beat to establish itself. Mounts (rather than toggling opacity from
  // the start) so its fade-in is the only animation it ever runs.
  useEffect(() => {
    const id = setTimeout(() => setShowHint(true), HINT_DELAY_MS);
    return () => clearTimeout(id);
  }, []);

  const entry = frames[index];
  const transitionClass =
    entry.transition === "whip"
      ? "intro-whip"
      : entry.transition === "wipe"
        ? "intro-wipe"
        : "";

  return (
    <div className="absolute inset-0 overflow-hidden bg-asphalt">
      {/* key on index so each frame remounts → its transition animation replays */}
      <div key={index} className={`absolute inset-0 ${transitionClass}`}>
        <FrameView frame={entry.frame} />
      </div>
      <div
        className="intro-scanlines pointer-events-none absolute inset-0 z-10"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{ boxShadow: "inset 0 0 130px rgba(0,0,0,0.72)" }}
        aria-hidden="true"
      />
      {showHint && (
        <p className="intro-hint ts-hard pointer-events-none absolute inset-x-0 bottom-6 z-20 text-center font-display text-xs font-semibold tracking-[0.3em] text-silver uppercase">
          {compact ? "Tap to skip" : "Press any key to skip"}
        </p>
      )}
    </div>
  );
}
