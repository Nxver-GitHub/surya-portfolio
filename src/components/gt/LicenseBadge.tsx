import { liveries, type LiveryId } from "../../../content/liveries";

interface LicenseBadgeProps {
  glyph: string;
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
        <span
          className="font-display leading-none font-black tracking-wide not-italic"
          style={{
            fontSize: size * 0.34,
            color: rim,
            textShadow: "1px 1px 0 rgba(0,0,0,0.35)",
          }}
        >
          {glyph}
        </span>
      </span>
    </span>
  );
}
