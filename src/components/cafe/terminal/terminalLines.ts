/**
 * Shared line model + themed static copy for the café terminal (E11).
 *
 * A `TerminalLine` is one rendered row in the scrollback. Lines carry a `tone`
 * so the view can style prompts, system chatter, the user's own echoed input,
 * the streamed reply, and error notices distinctly. Pure data + tiny pure
 * factories — no DOM, no side effects.
 */

/** Visual/semantic tone of a scrollback line. */
export type LineTone = "system" | "user" | "reply" | "error" | "prompt";

/** One row in the terminal scrollback. `id` is stable for React keys. */
export interface TerminalLine {
  id: string;
  tone: LineTone;
  text: string;
  /** Optional image card rendered with the line (e.g. the portrait). The
   * texture mirror (CrtScreenFeed) ignores media and paints `text` only. */
  media?: { readonly src: string; readonly alt: string };
}

let lineSeq = 0;
/** Monotonic id for a new line. Module-local counter — stable within a session. */
export function nextLineId(): string {
  lineSeq += 1;
  return `tl-${lineSeq}`;
}

/** Build a line with a fresh id. */
export function makeLine(tone: LineTone, text: string): TerminalLine {
  return { id: nextLineId(), tone, text };
}

/** Build several lines of the same tone at once (e.g. a command's output). */
export function makeLines(tone: LineTone, texts: readonly string[]): TerminalLine[] {
  return texts.map((t) => makeLine(tone, t));
}

/** Build a line carrying an image card (caption in `text`, may be empty). */
export function makeMediaLine(
  media: { readonly src: string; readonly alt: string },
  caption = "",
): TerminalLine {
  return { id: nextLineId(), tone: "system", text: caption, media };
}

/** Fast boot chatter shown on open (instant under reduced motion). */
export const BOOT_LINES: readonly string[] = [
  "CAFE-OS v2.2 — cold start",
  "mounting /paddock ... ok",
  "loading portfolio index ... ok",
  "terminal ready. type 'help' or ask a question.",
];

/** Themed messages for API failure states (mapped from 429/503 responses). */
export const THEMED = {
  rateLimited: "RATE LIMIT — cool your tyres, then try again in a moment.",
  systemBusy: "SYSTEM BUSY — the pit wall is jammed. Try again shortly.",
  terminalOffline: "TERMINAL OFFLINE — the house terminal is powered down right now.",
  genericError: "SIGNAL LOST — that transmission dropped. Try again.",
} as const;

/** Session cap: after this many user turns, nudge toward the contact links. */
export const MAX_USER_MESSAGES = 15;

/** In-character line shown once the per-session message cap is reached. */
export const SESSION_LIMIT_LINE =
  "SESSION LIMIT — that's my lap count for now. To go deeper, reach Surya directly: type 'contact'.";
