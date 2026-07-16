/**
 * cafeOrigin — the "what is this café based on" photo cards. Pure helpers,
 * mirroring the portrait seam (portrait.ts).
 *
 * When the visitor asks what the café is based on / inspired by, the log
 * shows the two Motoring Coffee (San Francisco) photos that inspired the GT
 * Café pavilion — a real car-culture coffee shop with a green Lancia Fulvia
 * parked inside. The factual answer itself comes from the model, grounded by
 * the CAFE ORIGIN block in the system prompt (src/lib/terminal-prompt.ts);
 * these cards ride alongside it.
 */

import { makeMediaLine, type TerminalLine } from "./terminalLines";

/** The two Motoring Coffee photos, shared with the Scapes gallery. */
export const CAFE_ORIGIN_PHOTOS = [
  {
    src: "/scapes/motoring-coffee-fulvia.jpg",
    alt: "Motoring Coffee in San Francisco — a green Lancia Fulvia parked inside the café",
  },
  {
    src: "/scapes/motoring-coffee-bar.jpg",
    alt: "Motoring Coffee in San Francisco — the Fulvia's Cibié lamps in front of the espresso bar",
  },
] as const;

/**
 * Does this submitted chat text ask what the café is based on or inspired
 * by? Deliberately moderate, like isWhoIsSurya: a false positive just shows
 * two harmless café photos next to the model's answer.
 */
export function isCafeOriginQuestion(text: string): boolean {
  // "café" is matched without a trailing \b — JS word boundaries are
  // ASCII-only, so /\bcafé\b/ never matches the accented form.
  const mentionsCafe = /\b(cafe|coffee\s*shop)\b|café/i.test(text);
  const asksOrigin =
    /\b(based\s+(on|off)|inspir\w*|origin\w*|idea|real|come\s+from|why\s+a|reference)\b/i.test(
      text,
    );
  return mentionsCafe && asksOrigin;
}

/** Build the two café-origin media lines for the scrollback. */
export function makeCafeOriginLines(): TerminalLine[] {
  return CAFE_ORIGIN_PHOTOS.map((photo) => makeMediaLine(photo));
}
