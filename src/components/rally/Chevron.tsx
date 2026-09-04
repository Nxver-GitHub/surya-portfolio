import { liveries, type LiveryId } from "../../../content/liveries";

interface ChevronProps {
  /**
   * "accent" is the red-on-white corner marker. "livery" swaps to the
   * pavilion's rally blue and yellow, for places where the page already
   * carries red (the incident stamp and the title rules) and a second red
   * would read as a mistake.
   */
  variant?: "accent" | "livery";
  livery?: LiveryId;
  className?: string;
}

/**
 * Corner-marker chevron strip: the angled boards that mark a bend on a rally
 * stage, flattened into a section divider. Two mirrored repeating gradients
 * meet at the midline, so the band reads as a row of chevrons without an image
 * or an SVG id. Purely decorative, and kept short enough that it separates
 * sections instead of shouting between them.
 */
export function Chevron({
  variant = "accent",
  livery = "subaru555",
  className = "",
}: ChevronProps) {
  const { bars } = liveries[livery];
  const foreground = variant === "accent" ? "var(--color-accent)" : bars[0];
  const background =
    variant === "accent" ? "var(--color-chrome)" : (bars[1] ?? bars[0]);
  const stripes = `repeating-linear-gradient(135deg, ${foreground} 0 5px, transparent 5px 10px)`;
  const mirrored = `repeating-linear-gradient(45deg, ${foreground} 0 5px, transparent 5px 10px)`;

  return (
    <div
      aria-hidden="true"
      className={`h-2 w-full max-w-[68ch] ${className}`}
      style={{
        backgroundColor: background,
        backgroundImage: `${stripes}, ${mirrored}`,
        backgroundSize: "100% 50%",
        backgroundPosition: "0 0, 0 100%",
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}
