/**
 * proximize — the "what is Surya working on next" teaser. Pure helpers,
 * mirroring the portrait (portrait.ts), café-origin (cafeOrigin.ts) and
 * meetup (meetup.ts) seams.
 *
 * IMPORTANT — this matcher is NOT like its siblings. The others ADD a card
 * beside a model answer, so a false positive is harmless. This one REPLACES
 * the model turn entirely: the teaser IS the answer, so it never reaches
 * /api/cafe-terminal, never spends one of MAX_USER_MESSAGES, and still fires
 * when the API is rate-limited or down (which is exactly when a live demo
 * would otherwise show "SYSTEM BUSY"). The cost of that guarantee is that a
 * false positive SWALLOWS a question the model should have answered — so the
 * tiers below are deliberately tighter than the siblings' "moderate" register,
 * and the response ends with a pointer to /garage so a visitor who actually
 * meant "what have you built" is one click from the right place.
 *
 * A later change wraps this with the PS2-advert takeover cinematic; the lines
 * built here remain the permanent scrollback residue once the ad dismisses,
 * so this module stays the single definition of "what the terminal says about
 * Proximize" either way.
 */

import { proximize, POSTER_ASPECT } from "../../../../content/proximize";
import { makeLine, makeMediaLine, type TerminalLine } from "./terminalLines";

/** Rendered width of the poster card (px). Larger than the 128px portrait
 * card — it is the payoff of the answer, not a thumbnail beside one. */
const POSTER_CARD_WIDTH = 176;

/**
 * Does this submitted chat text ask what the owner is building next?
 *
 * Four tiers, each independently sufficient. Present/future framing only —
 * past-tense phrasings ("what have you built", "what projects have you worked
 * on") deliberately fall through to the model and the Garage, because those
 * are asking about shipped work, not the teaser.
 */
export function isProximizeQuestion(text: string): boolean {
  // 1. Named directly — no ambiguity possible.
  if (/\bproximize\b/i.test(text)) return true;
  if (/\bproject\s+silhouette\b/i.test(text)) return true;

  // 2. "Secret next thing" vocabulary, unambiguous enough to stand alone.
  if (
    /\b(cooking|brewing|in\s+the\s+works|under\s+wraps|under\s+the\s+cover|stealth|skunk\s*works)\b/i.test(
      text,
    )
  ) {
    return true;
  }

  // 3. A present-progressive build verb ("working on", "building", "up to")
  //    anchored to the owner or to now/next. Note the verbs are matched in
  //    their -ing / bare forms only: "worked", "built" and "shipped" do NOT
  //    match, which is what keeps past-tense questions out.
  const buildingNow =
    /\b(working\s+on|build(ing)?|shipping|making|hacking\s+on|up\s+to)\b/i.test(
      text,
    );
  const anchored =
    /\b(surya|you|your|he|him|his|now|next|new|currently|lately|nowadays|these\s+days)\b/i.test(
      text,
    );
  if (buildingNow && anchored) return true;

  // 4. A forward-looking adjective paired with a venture noun ("next project",
  //    "new venture", "upcoming launch"), plus the bare "what's next?".
  const forward = /\b(next|new|upcoming|coming|future|secret)\b/i.test(text);
  const venture =
    /\b(project|projects|venture|startup|company|thing|move|chapter|launch|idea)\b/i.test(
      text,
    );
  if (forward && venture) return true;

  return /\bwhat(?:'s|s|\s+is)\s+next\b/i.test(text);
}

/** The poster card line, shown on its own row above the copy. */
export function makeProximizePosterLine(): TerminalLine {
  return makeMediaLine({
    ...proximize.poster,
    width: POSTER_CARD_WIDTH,
    aspect: POSTER_ASPECT,
  });
}

/**
 * The full teaser response: poster card, the public one-liner, the status and
 * link, then the Garage pointer. This is what the scrollback keeps forever —
 * the takeover cinematic is ephemeral, so a visitor who skipped it (or got
 * interrupted) can still reach proximize.net from the log.
 */
export function makeProximizeLines(): TerminalLine[] {
  return [
    makeProximizePosterLine(),
    makeLine("reply", `${proximize.name.toUpperCase()} — ${proximize.tagline}.`),
    makeLine("system", `Status: ${proximize.status}.  ${proximize.href}`),
    makeLine("system", ""),
    makeLine("system", "Shipped work lives in the Garage: /garage"),
  ];
}
