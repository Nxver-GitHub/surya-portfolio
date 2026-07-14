"use client";

import { useEffect, useState } from "react";
import { FrameView } from "./frames";
import { FRAMES, FRAMES_COMPACT } from "./sequence";

/** Beat 2 — the hard-cut heritage montage on a fixed beat grid. Silent: the
 *  ~130ms grid IS the rhythm, so it reads music-synced without any audio. */
const GRID_MS = 130;

interface IntroMontageProps {
  compact: boolean;
  onComplete: () => void;
}

export function IntroMontage({ compact, onComplete }: IntroMontageProps) {
  const frames = compact ? FRAMES_COMPACT : FRAMES;
  const [index, setIndex] = useState(0);

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
    </div>
  );
}
