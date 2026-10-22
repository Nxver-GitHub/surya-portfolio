import Image from "next/image";
import { liveries, type LiveryId } from "../../../content/liveries";

interface LicenseBadgeProps {
  glyph: string;
  /**
   * Optional org mark (a /public path) set into the enamel face in place of
   * the glyph. Decorative — the badge is aria-hidden and the org's name is
   * always visible beside it.
   */
  logo?: string;
  livery: LiveryId;
  /** Badge width in px (height follows the enamel-plate ratio) */
  size?: number;
  muted?: boolean;
  className?: string;
}

/**
 * GT2 license-badge tile: colored enamel rim, metallic silver face,
 * heavy italic glyph. The rim takes the pavilion's livery key color.
 */
export function LicenseBadge({
  glyph,
  logo,
  livery,
  size = 56,
  muted = false,
  className = "",
}: LicenseBadgeProps) {
  const rim = liveries[livery].key;

  return (
    <span
      aria-hidden="true"
      className={`badge-rim inline-block ${muted ? "opacity-45 saturate-50" : ""} ${className}`}
      style={{ backgroundColor: rim, width: size, height: size * 0.72 }}
    >
      <span className="badge-face flex h-full w-full items-center justify-center">
        {logo ? (
          // Square marks, set at the face's full height inside the keyline:
          // contained, never stretched to the plate's wider ratio.
          <Image
            src={logo}
            alt=""
            width={64}
            height={64}
            className="h-full w-auto object-contain p-px"
          />
        ) : (
        <span
          className="font-display leading-none font-black tracking-wide not-italic"
          style={{
            fontSize: size * 0.34,
            // The rim hue at 25% toward black: still the livery's letter,
            // but >= 4.5:1 on the face's darkest stop for every livery key
            // (the bare rim color fell to ~1.1:1 on the light ones). The
            // light emboss keeps the stamped read the dark shadow gave.
            color: `color-mix(in srgb, ${rim} 25%, #000)`,
            textShadow: "1px 1px 0 rgba(255,255,255,0.35)",
          }}
        >
          {glyph}
        </span>
        )}
      </span>
    </span>
  );
}
