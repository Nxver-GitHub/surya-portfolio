"use client";

/**
 * Renders one beat of the Proximize teaser (see sequence.ts for the data).
 *
 * Every beat is centred on black. Type beats are REAL DOM TEXT, not baked
 * pixels: crisp at any DPI, correct at any width, and restyleable without
 * regenerating a poster. Image beats are the two cut-outs, which carry
 * luminance-keyed alpha and so need no blending mode to sit on the black.
 *
 * LAYOUT IS ASPECT-DRIVEN, NOT BREAKPOINT-DRIVEN. `portrait` is derived from
 * the takeover's own measured box, so a rotated phone gets the wide
 * composition and a narrow desktop panel gets the tall one — a viewport-width
 * breakpoint would get both of those backwards.
 *
 * Sizes use clamp() against the container so the same beats work in the small
 * overlay panel, a full-screen mobile window, and the 3D CRT face.
 */

import { proximize } from "../../../../../content/proximize";
import type { Frame } from "./sequence";

/** Poster type is a condensed, wide-tracked, all-caps grotesque. */
const DISPLAY_FONT = "var(--font-saira), ui-sans-serif, system-ui, sans-serif";

interface FrameViewProps {
  frame: Frame;
  /** Container is taller than it is wide — stack tighter, scale type down. */
  portrait: boolean;
  /** Skip the car beat's slide. */
  reducedMotion: boolean;
}

/** Shared wrapper: one centred beat filling the takeover box. */
function Beat({ children }: { children?: React.ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4%",
      }}
    >
      {children}
    </div>
  );
}

/** The signal-collapse beat: the phosphor field crushing to a single line.
 * Never rendered under reduced motion — sequence.ts swaps it for black. */
function SignalBeat() {
  return (
    <Beat>
      <div
        className="teaser-signal"
        style={{
          width: "100%",
          height: "100%",
          background:
            "repeating-linear-gradient(to bottom, rgba(125,255,155,0.18) 0px, rgba(125,255,155,0.18) 1px, transparent 1px, transparent 3px)",
        }}
      />
    </Beat>
  );
}

function LineBeat({ text, portrait }: { text: string; portrait: boolean }) {
  return (
    <Beat>
      <p
        style={{
          margin: 0,
          fontFamily: DISPLAY_FONT,
          fontStretch: "87.5%",
          fontWeight: 600,
          color: "#e9ecef",
          textAlign: "center",
          textWrap: "balance",
          letterSpacing: portrait ? "0.12em" : "0.16em",
          fontSize: portrait
            ? "clamp(15px, 6.4cqw, 42px)"
            : "clamp(15px, 4.2cqw, 46px)",
          lineHeight: 1.35,
          textShadow: "0 2px 10px rgba(0,0,0,0.9)",
        }}
      >
        {text}
      </p>
    </Beat>
  );
}

function CarBeat({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <Beat>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={proximize.frames.car.src}
        alt=""
        className={reducedMotion ? undefined : "teaser-rise"}
        style={{ width: "92%", height: "auto", maxHeight: "78%", objectFit: "contain" }}
      />
    </Beat>
  );
}

function LockupBeat() {
  return (
    <Beat>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={proximize.frames.lockup.src}
        alt=""
        style={{ width: "84%", height: "auto", maxHeight: "62%", objectFit: "contain" }}
      />
    </Beat>
  );
}

/**
 * The platform badge — the site's own SP / PORTFOLIO SYSTEM mark standing
 * where a console logo would sit in a real advert of this era. Rendered live
 * from the same badge-rim/badge-face classes as the boot intro's studio mark
 * rather than as an image, so it stays sharp and in sync with the tokens.
 */
function BadgeBeat({ portrait }: { portrait: boolean }) {
  return (
    <Beat>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: portrait ? 10 : 14,
        }}
      >
        <div className="badge-rim bg-gt">
          <div
            className="badge-face flex aspect-square items-center justify-center"
            style={{ width: portrait ? "clamp(56px, 22cqw, 104px)" : "clamp(56px, 13cqw, 112px)" }}
          >
            <span
              style={{
                fontFamily: DISPLAY_FONT,
                fontWeight: 900,
                letterSpacing: "-0.04em",
                color: "var(--color-asphalt)",
                fontSize: portrait ? "clamp(28px, 12cqw, 56px)" : "clamp(28px, 7cqw, 60px)",
                lineHeight: 1,
              }}
            >
              SP
            </span>
          </div>
        </div>
        <p
          style={{
            margin: 0,
            fontFamily: DISPLAY_FONT,
            fontWeight: 700,
            fontSize: "clamp(9px, 1.9cqw, 13px)",
            letterSpacing: "0.42em",
            textIndent: "0.42em",
            color: "#a4a7ad",
            textTransform: "uppercase",
          }}
        >
          Portfolio System
        </p>
      </div>
    </Beat>
  );
}

function UrlBeat({ portrait }: { portrait: boolean }) {
  return (
    <Beat>
      <p
        style={{
          margin: 0,
          fontFamily: DISPLAY_FONT,
          fontWeight: 500,
          color: "#e9ecef",
          letterSpacing: "0.28em",
          textIndent: "0.28em",
          fontSize: portrait ? "clamp(13px, 5cqw, 30px)" : "clamp(13px, 3cqw, 34px)",
        }}
      >
        proximize.net
      </p>
    </Beat>
  );
}

export function FrameView({ frame, portrait, reducedMotion }: FrameViewProps) {
  switch (frame.kind) {
    case "signal":
      return <SignalBeat />;
    case "black":
      return <Beat />;
    case "line":
      return <LineBeat text={frame.text} portrait={portrait} />;
    case "car":
      return <CarBeat reducedMotion={reducedMotion} />;
    case "lockup":
      return <LockupBeat />;
    case "badge":
      return <BadgeBeat portrait={portrait} />;
    case "url":
      return <UrlBeat portrait={portrait} />;
  }
}
