"use client";

/**
 * TeaserTakeover — the PS2-advert takeover that answers "what's Surya working
 * on next?" (see sequence.ts for the beats, frames.tsx for the rendering).
 *
 * It covers the TERMINAL'S OWN RECTANGLE, not the page. The café's CRT is a
 * diegetic object a visitor sat down at; when the whole browser goes black the
 * fiction that *this machine* is doing something breaks, and it would collide
 * with the site's screen-wipe transitions and NOW LOADING hold besides.
 * Keeping the ad inside the tube is both cheaper and stronger.
 *
 * THE DECODE GATE. Beats 1–6 are ~4.7s of type on black with no images, which
 * is the window the two cut-outs get to load in. If they still are not decoded
 * when the car beat arrives, the sequence HOLDS ON BLACK (capped by
 * DECODE_STALL_CAP_MS) rather than cutting to an empty frame — a slightly
 * longer dramatic pause is invisible to an audience, a blank money shot is not.
 *
 * ACCESSIBILITY. The layer is a modal dialog: focus moves in, Escape / click /
 * tap / Enter all dismiss from the first frame, and focus returns to whatever
 * opened it. The animated beats are aria-hidden — announcing twelve of them
 * one at a time is nonsense — and a single role="status" node carries the
 * whole ad as one sentence instead. Under prefers-reduced-motion every beat
 * and hold is preserved; only the signal glitch and the car's slide go.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../../../garage/useReducedMotion";
import { useSound } from "../../../sound/SoundProvider";
import { proximize } from "../../../../../content/proximize";
import { FrameView } from "./frames";
import {
  DECODE_STALL_CAP_MS,
  FIRST_IMAGE_BEAT,
  FRAMES,
  REDUCED_FRAMES,
  TEASER_ANNOUNCEMENT,
} from "./sequence";

interface TeaserTakeoverProps {
  /** Called when the sequence finishes or the visitor skips. */
  onDone: () => void;
}

/** Kick off decoding both cut-outs. Resolves when both are ready or failed —
 * a failed decode must not hang the ad, the beat just renders whatever the
 * browser has (broken images are invisible on black anyway). */
function decodeFrameAssets(): Promise<void> {
  const sources = [proximize.frames.car.src, proximize.frames.lockup.src];
  return Promise.all(
    sources.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = src;
        }),
    ),
  ).then(() => undefined);
}

export function TeaserTakeover({ onDone }: TeaserTakeoverProps) {
  const reducedMotion = useReducedMotion();
  const { play } = useSound();
  const frames = reducedMotion ? REDUCED_FRAMES : FRAMES;

  const [beat, setBeat] = useState(0);
  const [portrait, setPortrait] = useState(false);
  // Deliberately STATE, not a ref: the beat clock depends on it, so the moment
  // decoding finishes the clock effect re-runs and releases a stalled beat. As
  // a ref it could only be read, never react — a stalled beat would sit
  // forever waiting for a re-render that nothing would trigger.
  const [assetsReady, setAssetsReady] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(false);

  // Start decoding immediately; beats 1-6 are the budget.
  useEffect(() => {
    let cancelled = false;
    void decodeFrameAssets().then(() => {
      if (!cancelled) setAssetsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Aspect drives the composition, not viewport width — see frames.tsx.
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const { inlineSize, blockSize } = entry.contentBoxSize[0];
      setPortrait(blockSize > inlineSize);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Single exit path, idempotent: skipping mid-beat and the sequence ending
  // naturally must not both fire onDone.
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    onDone();
  }, [onDone]);

  // True while we are sitting on the car beat with nothing decoded to show.
  const stalled = beat === FIRST_IMAGE_BEAT && !assetsReady;

  // The beat clock. One timeout per beat, cleared on unmount — closing the
  // terminal mid-ad must not leave a timer that fires into a dead component.
  useEffect(() => {
    if (doneRef.current) return;
    const entry = frames[beat];
    if (!entry) {
      finish();
      return;
    }

    // Stalled: schedule nothing but the ceiling. When `assetsReady` flips
    // (decode finished, or this cap fired) the effect re-runs and the beat
    // starts properly — with its full hold, not a truncated one.
    if (stalled) {
      const cap = setTimeout(() => setAssetsReady(true), DECODE_STALL_CAP_MS);
      return () => clearTimeout(cap);
    }

    if (entry.sfx) play(entry.sfx);
    const timer = setTimeout(() => setBeat((current) => current + 1), entry.hold);
    timerRef.current = timer;
    return () => clearTimeout(timer);
  }, [beat, frames, finish, play, stalled]);

  // Claim focus so Escape and Enter reach us rather than the terminal input.
  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  // NOTE: there is deliberately no finalise-on-unmount here. The residual card
  // is written when the question is asked, not when the advert ends, so an
  // aborted play needs no cleanup — and an unmount-cleanup that called back
  // into the parent would fire instantly under StrictMode's double-invoke,
  // ending the advert on the frame it started.

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        finish();
      }
      // Everything else is swallowed: the input beneath is disabled for the
      // duration, and half-typed text surviving behind an ad is a bug nobody
      // can reproduce on purpose but everyone hits in a live demo.
      else if (event.key !== "Tab") {
        event.preventDefault();
      }
    },
    [finish],
  );

  const entry = frames[beat];

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Proximize teaser advertisement"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onClick={finish}
      style={{
        position: "absolute",
        inset: 0,
        // Above the terminal's own scanlines (10) and header chrome (20): an
        // advert that leaves "CAFE-OS v2.2 / Esc ✕" floating over it is not a
        // takeover. The site-wide CRT glass (70) still tints it, so it keeps
        // the tube treatment without the terminal furniture.
        zIndex: 30,
        background: "#000",
        overflow: "hidden",
        cursor: "pointer",
        outline: "none",
        // Enables the cqw units the beats size themselves with.
        containerType: "inline-size",
      }}
    >
      <div aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
        {entry ? (
          <FrameView
            // While stalled the car's asset isn't decoded, so hold BLACK
            // rather than cutting to an empty money shot.
            frame={stalled ? { kind: "black" } : entry.frame}
            portrait={portrait}
            reducedMotion={reducedMotion}
          />
        ) : null}
      </div>

      {/* One sentence, once — not twelve beats narrated in sequence. */}
      <p role="status" className="sr-only">
        {TEASER_ANNOUNCEMENT}
      </p>

      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          right: "3%",
          bottom: "3.5%",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          fontSize: "clamp(9px, 1.7cqw, 12px)",
          letterSpacing: "0.14em",
          color: "rgba(233,236,239,0.42)",
        }}
      >
        {portrait ? "tap to skip" : "esc — skip"}
      </span>
    </div>
  );
}
