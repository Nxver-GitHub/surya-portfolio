/**
 * The Proximize teaser sequence — PURE DATA, no JSX, so it stays testable in
 * the node test env and its invariants can be asserted (see
 * tests/teaser-sequence.test.ts). The renderer is frames.tsx.
 *
 * This is a PS2-era teaser advert, which is a different instrument from the
 * boot intro's montage (intro/sequence.ts): that reel is 21 cuts at 165ms,
 * this one is mostly darkness and held beats. Everything is a HARD CUT on
 * black — no dissolves, no zooms, no bouncy easing — which satisfies the
 * project's motion rules and is also, conveniently, the vestibular-safest
 * grammar available, so the reduced-motion variant can keep every beat.
 *
 * The order is deliberately the POSTER READ TOP TO BOTTOM: positioning lines,
 * lockup, car, "coming soon", platform badge, URL. The artwork was already a
 * storyboard.
 *
 * BEATS 1–6 CARRY NO IMAGES. That is not an accident to be optimised away: it
 * is ~4.7s of pure type on black that doubles as the preloader window for
 * car.webp and lockup.webp (see TeaserTakeover's decode gate). Reordering the
 * image beats earlier would break the loading guarantee.
 */

/** One beat of the sequence. `hold` is how long it stays on screen (ms). */
export type Frame =
  | { kind: "signal" }
  | { kind: "black" }
  | { kind: "line"; text: string }
  | { kind: "car" }
  | { kind: "lockup" }
  | { kind: "badge" }
  | { kind: "url" };

export interface FrameEntry {
  readonly frame: Frame;
  readonly hold: number;
  /** Fire a cinematic sfx cue as this beat starts. Gated by the mute policy. */
  readonly sfx?: "teaserDrop" | "teaserSlam";
}

/**
 * The three positioning lines, split exactly as they are set on the poster.
 * Kept as their own export so the copy has one definition and the test can
 * assert the beats match the artwork.
 */
export const POSITIONING_LINES: readonly string[] = [
  "THE NEXT EVOLUTION",
  "OF DIGITAL PRESENCE",
  "FOR THE PHYSICAL WORLD.",
];

/** The full 12-beat sequence (~11.2s). */
export const FRAMES: readonly FrameEntry[] = [
  // 1 — the terminal's own signal dies. The only "effect" in the piece, and
  //     the one thing reduced motion removes outright (see REDUCED_FRAMES).
  { frame: { kind: "signal" }, hold: 600, sfx: "teaserDrop" },
  // 2 — dead air. Long enough to feel deliberate rather than broken.
  { frame: { kind: "black" }, hold: 800 },
  // 3–5 — the positioning, one line at a time.
  { frame: { kind: "line", text: POSITIONING_LINES[0] }, hold: 900 },
  { frame: { kind: "line", text: POSITIONING_LINES[1] }, hold: 900 },
  { frame: { kind: "line", text: POSITIONING_LINES[2] }, hold: 1100 },
  // 6 — beat of black before the reveal. Last image-free beat.
  { frame: { kind: "black" }, hold: 500 },
  // 7 — the car under the cover. The money shot; longest single hold.
  { frame: { kind: "car" }, hold: 1600 },
  // 8 — the lockup lands.
  { frame: { kind: "lockup" }, hold: 1400, sfx: "teaserSlam" },
  // 9–11 — the sign-off, exactly as the poster sets it.
  { frame: { kind: "line", text: "COMING SOON." }, hold: 1200 },
  { frame: { kind: "badge" }, hold: 900 },
  { frame: { kind: "url" }, hold: 1800 },
  // 12 — back to black before handing the screen back to the scrollback.
  { frame: { kind: "black" }, hold: 400 },
];

/**
 * The reduced-motion cut. SAME BEATS, SAME HOLDS — the setting is about
 * vestibular safety, not about opting out of content, and a visitor who asked
 * what Surya is building should not be downgraded to a thumbnail for having
 * it on. Only the signal-collapse beat changes: a phosphor glitch is exactly
 * the high-frequency flicker the setting exists to prevent, so it becomes
 * plain black (its hold is preserved so the rhythm is identical).
 *
 * The renderer independently drops the slide on the car beat and every fade;
 * everything here is already a hard cut.
 */
export const REDUCED_FRAMES: readonly FrameEntry[] = FRAMES.map((entry) =>
  entry.frame.kind === "signal"
    ? { frame: { kind: "black" } as Frame, hold: entry.hold, sfx: entry.sfx }
    : entry,
);

/** Total runtime of a sequence, in ms. */
export function totalDuration(frames: readonly FrameEntry[]): number {
  return frames.reduce((sum, entry) => sum + entry.hold, 0);
}

/** Index of the first beat that needs an image decoded (the car). Everything
 * before it is type on black, which is what buys the loading window. */
export const FIRST_IMAGE_BEAT = FRAMES.findIndex(
  (entry) => entry.frame.kind === "car",
);

/** How long the sequence runs before {@link FIRST_IMAGE_BEAT} — the budget the
 * decode gate has to work with before it must stall the show. */
export function preloadWindowMs(): number {
  return totalDuration(FRAMES.slice(0, FIRST_IMAGE_BEAT));
}

/** Hard cap on stalling for a slow image decode. A slightly longer dramatic
 * pause is invisible; a blank money shot is not — but neither is an ad that
 * hangs, so past this we proceed regardless. */
export const DECODE_STALL_CAP_MS = 2000;

/** The single sentence announced to assistive tech in place of the beats. */
export const TEASER_ANNOUNCEMENT =
  "Advertisement: Proximize — improving geo for the physical world. Coming soon. proximize.net";
