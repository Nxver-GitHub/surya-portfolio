import { liveries, type LiveryId } from "../../../content/liveries";

interface LiveryStripeProps {
  livery: LiveryId;
  /** Stripe orientation: horizontal decal strip or vertical card edge */
  direction?: "horizontal" | "vertical";
  className?: string;
  /** Dim the decal (locked/inactive components) */
  muted?: boolean;
}

/**
 * Sponsor-decal stripe: skewed color bars in a livery's palette.
 * Purely decorative — the era's livery language at component scale.
 */
export function LiveryStripe({
  livery,
  direction = "horizontal",
  className = "",
  muted = false,
}: LiveryStripeProps) {
  const { bars } = liveries[livery];
  const horizontal = direction === "horizontal";

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none flex overflow-hidden ${
        horizontal ? "h-1.5 w-full flex-row" : "h-full w-2 flex-col"
      } ${muted ? "opacity-50" : ""} ${className}`}
    >
      {bars.map((color, i) => (
        <span
          key={i}
          className={horizontal ? "h-full -skew-x-[24deg] scale-x-110" : "w-full"}
          style={{
            background: color,
            flexGrow: i === 0 ? 3 : 1,
          }}
        />
      ))}
    </span>
  );
}
