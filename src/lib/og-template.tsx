import type { LiveryId } from "../../content/liveries";
import { liveries } from "../../content/liveries";
import { SITE_LABEL } from "./site";

/** Shared pixel size for every OG/Twitter card in the site. */
export const OG_SIZE = { width: 1200, height: 630 } as const;

/** GT2 system palette (mirrors the CSS custom properties in globals.css). */
const ASPHALT = "#0a0a0b";
const GT_ORANGE = "#ef8100";
const GT_ORANGE_LIGHT = "#ff9d1f";
const GT_ORANGE_DARK = "#d06e00";
const ACCENT_RED = "#c81f1f";
const CHROME = "#f2f0ec";
const INK = "#c9ccd2";
const SILVER = "#a4a7ad";

/**
 * Fine grid-paper texture as an inline SVG data URI (satori renders
 * background-image via <img>-style url() sourcing, so this tiles the same
 * way the page body's CSS grid does, just at a coarser 24px pitch that reads
 * better at OG-card scale). Kept at ~0.04 alpha so it stays a texture, not a
 * pattern that fights the title.
 */
const GRID_TILE = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><path d='M24 0H0V24' fill='none' stroke='rgba(255,255,255,0.045)' stroke-width='1'/></svg>`,
);
const GRID_SVG_URL = `data:image/svg+xml,${GRID_TILE}`;

function titleFontSize(title: string): number {
  if (title.length <= 12) return 138;
  if (title.length <= 18) return 106;
  return 80;
}

export interface OgCardProps {
  title: string;
  tagline: string;
  /** Pavilion livery accent chips; omit for the flagship/home card. */
  liveryId?: LiveryId;
}

/**
 * Shared GT2-styled OG/Twitter card template, parameterized per route.
 * Satori (ImageResponse) only supports a CSS subset — flexbox layout, no
 * grid, limited transforms — so every rule here is deliberately simple.
 */
export function OgCard({ title, tagline, liveryId }: OgCardProps) {
  const livery = liveryId ? liveries[liveryId] : null;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        backgroundColor: ASPHALT,
        backgroundImage: `url(${GRID_SVG_URL})`,
        backgroundRepeat: "repeat",
        backgroundSize: "24px 24px",
        padding: "56px 72px",
        fontFamily: "Saira",
      }}
    >
      {/* Orange crumb strip bleeding off the right edge, mirrors .gt-crumb */}
      <div
        style={{
          position: "absolute",
          top: 44,
          right: -40,
          width: 300,
          height: 40,
          display: "flex",
          background: `linear-gradient(180deg, ${GT_ORANGE_LIGHT}, ${GT_ORANGE} 55%, ${GT_ORANGE_DARK})`,
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flexGrow: 1,
          maxWidth: 1010,
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Source Serif 4",
            fontWeight: 700,
            fontSize: titleFontSize(title),
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
            color: CHROME,
            textShadow: "4px 4px 0 rgba(0,0,0,0.95), 5px 6px 8px rgba(0,0,0,0.55)",
          }}
        >
          {title}
        </div>

        <div style={{ display: "flex", flexDirection: "row", marginTop: 26 }}>
          <div
            style={{
              display: "flex",
              width: 190,
              height: 8,
              background: ACCENT_RED,
            }}
          />
          <div
            style={{
              display: "flex",
              width: 30,
              height: 8,
              background: ACCENT_RED,
              transform: "rotate(-38deg) translateX(6px)",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 38,
            // Long taglines drop a size so they hold one line instead of
            // orphaning the last word onto a second row.
            fontSize: tagline.length > 42 ? 33 : 40,
            fontWeight: 400,
            color: INK,
            maxWidth: 1000,
          }}
        >
          {tagline}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-end",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 24,
            fontWeight: 400,
            letterSpacing: "0.14em",
            color: SILVER,
          }}
        >
          {SITE_LABEL}
        </div>
      </div>

      {/* Full-width livery band anchoring the bottom edge — the site's
          LiveryStripe language (skewed bars, 3:1 lead segment). The flagship
          card carries the GT system band instead of a pavilion livery. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 26,
          display: "flex",
          flexDirection: "row",
          overflow: "hidden",
        }}
      >
        {(livery?.bars ?? [GT_ORANGE_LIGHT, GT_ORANGE, GT_ORANGE_DARK]).map(
          (color, i, bars) => (
            <div
              key={`${color}-${i}`}
              style={{
                display: "flex",
                height: "100%",
                flexGrow: i === 0 ? 3 : 1,
                background: color,
                transform: "skewX(-24deg) scaleX(1.2)",
                marginLeft: i === 0 ? -30 : 0,
                marginRight: i === bars.length - 1 ? -30 : 0,
              }}
            />
          ),
        )}
      </div>
    </div>
  );
}
