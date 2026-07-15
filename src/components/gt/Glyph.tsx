export type GlyphKind = "car" | "flag" | "lock";

interface GlyphProps {
  kind: GlyphKind;
  /** Icon size in any CSS length unit; defaults to "1em" so it scales with
   *  the surrounding chip's font-size and inherits its color. */
  size?: string | number;
  className?: string;
}

/**
 * Authored 1-bit era icon glyphs — flat, boxy, single-color silhouettes in
 * the GT2 spirit (no gradients, no detailed illustration). Replaces the
 * color car/flag/lock emoji so chips render consistently across
 * platforms/fonts and always tint with the surrounding text color.
 */
export function Glyph({ kind, size = "1em", className }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      {kind === "car" ? (
        <>
          <path d="M3 15 L4 10 L10 6 L18 6 L22 11 L23 15 Z" />
          <circle cx="8" cy="15" r="2.6" />
          <circle cx="18" cy="15" r="2.6" />
        </>
      ) : null}
      {kind === "flag" ? (
        <>
          <rect x="5" y="2" width="1.6" height="20" rx="0.5" />
          <rect x="7" y="3" width="4" height="4" />
          <rect x="15" y="3" width="4" height="4" />
          <rect x="11" y="7" width="4" height="4" />
        </>
      ) : null}
      {kind === "lock" ? (
        <>
          <path d="M8 11 V8 A4 4 0 0 1 16 8 V11 H14 V8 A2 2 0 0 0 10 8 V11 Z" />
          <rect x="5" y="11" width="14" height="10" rx="1.5" />
        </>
      ) : null}
    </svg>
  );
}
