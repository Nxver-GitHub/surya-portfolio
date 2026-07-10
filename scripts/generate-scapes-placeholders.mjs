/**
 * Generates GT-style "empty slot" placeholder photos for the Scapes pavilion.
 *
 * These stand in for the owner's real photography until it lands. Each output
 * is a small, self-contained SVG (a few KB, no external refs, no scripts) that
 * renders a dark GT2 photo-slot frame: asphalt-black field, faint grid texture,
 * a category-tinted gradient wash, corner ticks, and small "SCAPES" / category
 * caption text. Aspect ratios vary (landscape / portrait / square) to exercise
 * the masonry grid.
 *
 * Run:  node scripts/generate-scapes-placeholders.mjs
 * Output: public/scapes/<id>.svg  (committed to the repo)
 *
 * Swapping in real photos does NOT require this script — see the header of
 * content/photos.ts for the swap procedure. This is purely for regenerating the
 * placeholder set if the roster in content/photos.ts changes.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, "..", "public", "scapes");

const ASPHALT = "#0a0a0b";
const STEEL = "#34363a";
const SILVER = "#a4a7ad";

/** Category-tinted wash colors (kept low-saturation so text stays AA-legible). */
const CATEGORY_TINT = {
  nature: { glow: "#1c3a2e", edge: "#0e1a15", label: "NATURE" },
  cars: { glow: "#3a2a12", edge: "#1a130a", label: "CARS" },
  life: { glow: "#20304a", edge: "#101724", label: "LIFE / TRAVEL" },
};

/**
 * Build one placeholder SVG. Pure markup — no <script>, no event handlers,
 * no external hrefs. Safe to serve as a static image under a strict CSP.
 */
function buildSvg({ width, height, category }) {
  const tint = CATEGORY_TINT[category];
  const glyph = tint.label;
  const cx = width / 2;
  const cy = height / 2;
  const min = Math.min(width, height);
  const tick = min * 0.06;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Scapes placeholder — ${glyph}">
  <defs>
    <radialGradient id="wash" cx="50%" cy="42%" r="72%">
      <stop offset="0%" stop-color="${tint.glow}" stop-opacity="0.85"/>
      <stop offset="60%" stop-color="${tint.edge}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${ASPHALT}"/>
    </radialGradient>
    <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M24 0H0V24" fill="none" stroke="${STEEL}" stroke-width="1" opacity="0.28"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="${ASPHALT}"/>
  <rect width="100%" height="100%" fill="url(#wash)"/>
  <rect width="100%" height="100%" fill="url(#grid)"/>
  <rect x="8" y="8" width="${width - 16}" height="${height - 16}" fill="none" stroke="${STEEL}" stroke-width="2" opacity="0.7"/>
  <path d="M16 ${16 + tick} V16 H${16 + tick}" fill="none" stroke="${SILVER}" stroke-width="2" opacity="0.55"/>
  <path d="M${width - 16 - tick} 16 H${width - 16} V${16 + tick}" fill="none" stroke="${SILVER}" stroke-width="2" opacity="0.55"/>
  <path d="M16 ${height - 16 - tick} V${height - 16} H${16 + tick}" fill="none" stroke="${SILVER}" stroke-width="2" opacity="0.55"/>
  <path d="M${width - 16 - tick} ${height - 16} H${width - 16} V${height - 16 - tick}" fill="none" stroke="${SILVER}" stroke-width="2" opacity="0.55"/>
  <circle cx="${cx}" cy="${cy - height * 0.06}" r="${min * 0.11}" fill="none" stroke="${SILVER}" stroke-width="2" opacity="0.4"/>
  <line x1="${cx - min * 0.05}" y1="${cy - height * 0.06}" x2="${cx + min * 0.05}" y2="${cy - height * 0.06}" stroke="${SILVER}" stroke-width="2" opacity="0.4"/>
  <line x1="${cx}" y1="${cy - height * 0.06 - min * 0.05}" x2="${cx}" y2="${cy - height * 0.06 + min * 0.05}" stroke="${SILVER}" stroke-width="2" opacity="0.4"/>
  <text x="${cx}" y="${cy + height * 0.13}" text-anchor="middle" font-family="'Saira Semi Condensed','Arial Narrow',sans-serif" font-size="${min * 0.09}" font-weight="800" letter-spacing="4" fill="${SILVER}" opacity="0.9">SCAPES</text>
  <text x="${cx}" y="${cy + height * 0.21}" text-anchor="middle" font-family="'Saira Semi Condensed','Arial Narrow',sans-serif" font-size="${min * 0.055}" font-weight="700" letter-spacing="3" fill="${SILVER}" opacity="0.6">${glyph} · AWAITING SCAN</text>
</svg>
`;
}

/** Roster mirrors the placeholder entries in content/photos.ts (id + dims). */
const ROSTER = [
  { id: "nature-01", width: 1600, height: 1067, category: "nature" },
  { id: "nature-02", width: 1067, height: 1600, category: "nature" },
  { id: "nature-03", width: 1200, height: 1200, category: "nature" },
  { id: "nature-04", width: 1600, height: 900, category: "nature" },
  { id: "cars-01", width: 1600, height: 1067, category: "cars" },
  { id: "cars-02", width: 1067, height: 1600, category: "cars" },
  { id: "cars-03", width: 1600, height: 900, category: "cars" },
  { id: "cars-04", width: 1200, height: 1200, category: "cars" },
  { id: "life-01", width: 1600, height: 1067, category: "life" },
  { id: "life-02", width: 1067, height: 1600, category: "life" },
  { id: "life-03", width: 1200, height: 1200, category: "life" },
  { id: "life-04", width: 1600, height: 900, category: "life" },
];

mkdirSync(OUT_DIR, { recursive: true });
for (const entry of ROSTER) {
  const svg = buildSvg(entry);
  writeFileSync(join(OUT_DIR, `${entry.id}.svg`), svg, "utf8");
}
process.stdout.write(`Wrote ${ROSTER.length} placeholder SVGs to public/scapes/\n`);
