/**
 * Citation — the owner's next venture, in its PRE-LAUNCH teaser state.
 *
 * This module is the SINGLE SOURCE for everything the site is allowed to say
 * about Citation. It feeds four places, and they must never drift:
 *   1. the café terminal's system prompt (an UPCOMING block in
 *      src/lib/terminal-prompt.ts), which is also where the model is told that
 *      NOTHING beyond these fields is public;
 *   2. the linkify allowlist (src/components/cafe/terminal/linkify.ts), so the
 *      URL is clickable in the terminal;
 *   3. the terminal's teaser response (terminal/citation.ts);
 *   4. the PS2-advert takeover cinematic (terminal/teaser/).
 *
 * DISCLOSURE BOUNDARY — read before adding a field. Everything here is
 * deliberately thin: a name, a positioning line, a status, and a URL. That is
 * exactly what is printed on the public teaser poster, and therefore exactly
 * what is public. Do NOT add what it does, the stack, funding, timing, team,
 * or customers until those are genuinely announced — the model is instructed
 * to refuse anything not in this file, and widening this file silently widens
 * what the terminal will tell strangers.
 *
 * POSTER ASSET — public/terminal/citation/poster.webp is the Oct 2026
 * rebrand of the earlier Proximize teaser. It carries no real platform marks
 * (trademark safety: this repo and site are public, and the project's rule is
 * colours and patterns only, never real brand marks). The platform slot holds
 * the site's own "SP / PORTFOLIO SYSTEM" enamel badge, the same lockup as the
 * boot intro's studio mark, so the ad reads as "coming to the Surya
 * Pugazhenthi Portfolio System". Regenerate with
 * scripts/build-citation-poster.py.
 */

/** Aspect ratio of the teaser poster, as a CSS `aspect-ratio` value. */
export const POSTER_ASPECT = "1085 / 1450";

/** The complete public record of Citation. See the disclosure note above. */
export const citation = {
  /** Product/company name as it appears on the poster. */
  name: "Citation",
  /** The strapline under the wordmark. */
  tagline: "improving geo for the physical world",
  /** The headline positioning, from the top of the poster. */
  positioning:
    "the next evolution of digital presence for the physical world",
  /** Launch state. Kept as prose because it is shown verbatim to visitors. */
  status: "coming soon",
  /** The only Citation URL the site may link. Allowlisted by linkify.ts. */
  href: "https://citation.so",
  /** The teaser poster, shown as a terminal media card and as the cinematic's
   * final held frame. */
  poster: {
    src: "/terminal/citation/poster.webp",
    alt: "Citation teaser poster — a car under a silver cover beneath the Citation wordmark, captioned 'coming soon'",
  },
  /**
   * Individual elements cut out of the poster for the takeover cinematic's
   * beats. Both carry luminance-keyed alpha so they composite seamlessly on
   * the cinematic's black — see scripts/build-citation-frames.py. They are
   * decorative within the sequence (the whole takeover is announced as one
   * sentence to assistive tech), so their alt text is empty by design.
   */
  frames: {
    car: {
      src: "/terminal/citation/car.webp",
      width: 1070,
      height: 316,
    },
    lockup: {
      src: "/terminal/citation/lockup.webp",
      width: 666,
      height: 184,
    },
  },
} as const;
