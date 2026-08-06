/**
 * Proximize — the owner's next venture, in its PRE-LAUNCH teaser state.
 *
 * This module is the SINGLE SOURCE for everything the site is allowed to say
 * about Proximize. It feeds four places, and they must never drift:
 *   1. the café terminal's system prompt (an UPCOMING block in
 *      src/lib/terminal-prompt.ts), which is also where the model is told that
 *      NOTHING beyond these fields is public;
 *   2. the linkify allowlist (src/components/cafe/terminal/linkify.ts), so the
 *      URL is clickable in the terminal;
 *   3. the terminal's teaser response (terminal/proximize.ts);
 *   4. the PS2-advert takeover cinematic (terminal/teaser/, a later change).
 *
 * DISCLOSURE BOUNDARY — read before adding a field. Everything here is
 * deliberately thin: a name, a positioning line, a status, and a URL. That is
 * exactly what is printed on the public teaser poster, and therefore exactly
 * what is public. Do NOT add what it does, the stack, funding, timing, team,
 * or customers until those are genuinely announced — the model is instructed
 * to refuse anything not in this file, and widening this file silently widens
 * what the terminal will tell strangers.
 *
 * POSTER ASSET — public/terminal/proximize/poster.webp is derived from the
 * source teaser artwork with the PlayStation mark and the Sony/Polyphony
 * disclaimer line removed (trademark safety: this repo and site are public,
 * and the project's rule is colours and patterns only, never real brand
 * marks). The vacated platform slot carries the site's own "SP / PORTFOLIO
 * SYSTEM" enamel badge instead — the same lockup as the boot intro's studio
 * mark, so the ad reads as "coming to the Surya Pugazhenthi Portfolio
 * System". Regenerate with scripts/build-proximize-poster.py.
 */

/** Aspect ratio of the teaser poster, as a CSS `aspect-ratio` value. */
export const POSTER_ASPECT = "1085 / 1450";

/** The complete public record of Proximize. See the disclosure note above. */
export const proximize = {
  /** Product/company name as it appears on the poster. */
  name: "Proximize",
  /** The strapline under the wordmark. */
  tagline: "improving geo for the physical world",
  /** The headline positioning, from the top of the poster. */
  positioning:
    "the next evolution of digital presence for the physical world",
  /** Launch state. Kept as prose because it is shown verbatim to visitors. */
  status: "coming soon",
  /** The only Proximize URL the site may link. Allowlisted by linkify.ts. */
  href: "https://proximize.net",
  /** The teaser poster, shown as a terminal media card and as the cinematic's
   * final held frame. */
  poster: {
    src: "/terminal/proximize/poster.webp",
    alt: "Proximize teaser poster — a car under a silver cover beneath the Proximize wordmark, captioned 'coming soon'",
  },
} as const;
