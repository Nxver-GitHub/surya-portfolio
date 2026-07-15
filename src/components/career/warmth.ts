/**
 * Season-tinted Career warmth (feat/p2-r4-warmth-exploration, R4).
 *
 * One restrained flat warm field per season, scoped to career DETAIL pages
 * (`/career/[slug]`) plus a slim accent on the selected season card in the
 * index rail. The intent is Ridge Racer Type 4 warmth — confident, authored
 * warm color fields — never neon and never decoration.
 *
 * R3 verdict: the flat-header treatment (now the only variant) worked, but
 * S1 (#DE9433) and S3 (#E7AB47) sat too close to the system orange
 * (#EF8100, H 32° / S 100% / L 47%) — same hue family at high saturation, so
 * they read as "more chrome" instead of season identity. R4 re-picks S1 and
 * S3 to be clearly off-orange:
 *  - S1 keeps the amber hue but drops saturation hard (desaturated sand/aged
 *    paper, not a paler orange) — H 36° / S 37% vs. the system's S 100%.
 *  - S2 (terracotta) is unchanged — it already read as its own season.
 *  - S3 moves hue entirely, from gold (H 37°) to deep crimson (H 3°) — on
 *    the opposite side of the wheel from the orange chrome, not just a
 *    lighter/darker step of it.
 *
 * Every field carries solid ink (no reduced opacity — opacity blending
 * against a colored field is fragile) and clears WCAG AA (>= 4.5:1). S1/S2
 * use dark asphalt ink; S3's field is too dark for asphalt ink to clear AA,
 * so it uses the warm off-white chrome ink instead (7.64:1).
 */
export interface SeasonTint {
  /** Flat warm field — no gradient, hard edges. */
  field: string;
  /** Ink used for all text sitting on the field. */
  ink: string;
  /** Which GtTitle ink mode reads this field correctly. */
  inkMode: "dark" | "light";
  /** Contrast ratio of ink on field (WCAG 2 relative-luminance formula). */
  contrast: number;
}

const SEASON_TINTS: Record<string, SeasonTint> = {
  // Diablo Valley era — desaturated sand/aged-paper, not a paler orange.
  s1: { field: "#C9B08A", ink: "#0a0a0b", inkMode: "dark", contrast: 9.48 },
  // UC Santa Cruz — terracotta, kept from R3 (already read as its own season).
  s2: { field: "#CE7048", ink: "#0a0a0b", inkMode: "dark", contrast: 5.69 },
  // Venture & Agents — deep crimson, opposite side of the hue wheel from
  // the orange chrome. Field is too dark for asphalt ink, so it takes the
  // warm off-white chrome ink instead.
  s3: { field: "#8C2621", ink: "#f2f0ec", inkMode: "light", contrast: 7.64 },
};

const FALLBACK: SeasonTint = SEASON_TINTS.s1;

export function seasonTint(seasonId: string): SeasonTint {
  return SEASON_TINTS[seasonId] ?? FALLBACK;
}
