/**
 * R4-warmth exploration (feat/p2-r4-warmth-exploration) — DRAFT / experimental.
 *
 * Season-tinted Career headers: one restrained flat warm field per season,
 * derived from that season's identity. The intent is Ridge Racer Type 4 warmth
 * — confident, authored warm color fields — never neon and never decoration.
 * Every field carries dark asphalt ink and clears WCAG AA (>= 4.5:1).
 *
 * Flip CAREER_WARMTH_VARIANT to screenshot both treatments:
 *  - "A" header band — a flat warm field behind the STORY MODE kicker + title
 *                       block only, bleeding to the left screen edge. (default)
 *  - "B" plate wash  — the selected season card + the Season Briefing rail take
 *                      the warm field as their fill; the content zone stays
 *                      asphalt. More contained, less bold.
 */
export type CareerWarmthVariant = "A" | "B";

export const CAREER_WARMTH_VARIANT: CareerWarmthVariant = "A";

export interface SeasonTint {
  /** Flat warm field — no gradient, hard edges. */
  field: string;
  /** Dark asphalt ink used for all text sitting on the field. */
  ink: string;
  /** Contrast ratio of ink on field (WCAG), for the record. */
  contrast: number;
}

/**
 * Warm, era-plausible tints against the asphalt world. Contrast measured for
 * ink #0a0a0b on each field: S1 7.91:1, S2 5.69:1, S3 9.72:1 (all >= AA).
 * Hues are spread (amber / terracotta / gold) so they read as three distinct
 * seasons and stay clear of the GT system orange used on the chrome.
 */
const SEASON_TINTS: Record<string, SeasonTint> = {
  s1: { field: "#DE9433", ink: "#0a0a0b", contrast: 7.91 }, // deep sunset amber
  s2: { field: "#CE7048", ink: "#0a0a0b", contrast: 5.69 }, // warm crimson-brown / terracotta
  s3: { field: "#E7AB47", ink: "#0a0a0b", contrast: 9.72 }, // warm signal-gold
};

const FALLBACK: SeasonTint = SEASON_TINTS.s1;

export function seasonTint(seasonId: string): SeasonTint {
  return SEASON_TINTS[seasonId] ?? FALLBACK;
}
