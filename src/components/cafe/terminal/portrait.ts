/**
 * portrait — the "who is Surya" photo card (E11). Pure helpers.
 *
 * When the visitor asks who the owner is (or runs `about`), the log shows a
 * small portrait card — the real headshot at {@link PORTRAIT_SRC} (the card's
 * scanline overlay gives it the CRT treatment). To update the photo, replace
 * that file (480px web copy is plenty; the card renders ~128px wide).
 */

import { makeMediaLine, type TerminalLine } from "./terminalLines";

/** Public path of the portrait image. */
export const PORTRAIT_SRC = "/terminal/portrait.jpg";

/** Alt text for the portrait card. */
export const PORTRAIT_ALT = "Portrait of Surya Pugazhenthi";

/**
 * Does this submitted chat text ask who the owner is? Deliberately moderate:
 * a false positive just shows a harmless portrait next to the answer.
 */
export function isWhoIsSurya(text: string): boolean {
  return (
    /\bwho\b[\s\S]*\b(surya|you)\b/i.test(text) ||
    /\babout\s+(surya|you)\b/i.test(text)
  );
}

/** Build the portrait media line for the scrollback. */
export function makePortraitLine(): TerminalLine {
  return makeMediaLine({ src: PORTRAIT_SRC, alt: PORTRAIT_ALT });
}
