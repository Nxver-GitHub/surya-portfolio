/**
 * A generic low-slung GT / endurance-prototype silhouette — deliberately not
 * any specific (or project) car, so the intro never dates. Drawn in
 * currentColor; frames tint it via text color and can switch to an outline.
 */
interface CarSilhouetteProps {
  outline?: boolean;
  className?: string;
}

export function CarSilhouette({ outline = false, className }: CarSilhouetteProps) {
  const stroke = outline ? "currentColor" : "none";
  const fill = outline ? "none" : "currentColor";

  return (
    <svg
      viewBox="0 0 240 92"
      role="img"
      aria-label="Race car"
      className={className}
      style={{ overflow: "visible" }}
    >
      <g fill={fill} stroke={stroke} strokeWidth={outline ? 2.5 : 0}>
        {/* rear wing */}
        <rect x="198" y="20" width="42" height="6" rx="1" />
        <rect x="231" y="20" width="5" height="26" />
        {/* body wedge */}
        <path d="M4 68 L4 60 C4 52 12 49 26 48 L64 46 L96 31 L152 28 L178 43 L214 45 L236 52 L236 68 Z" />
        {/* wheels */}
        <circle cx="58" cy="72" r="18" />
        <circle cx="196" cy="72" r="18" />
      </g>
      {/* hubs — read as wheels against any tone, harmless in outline mode */}
      <g fill="rgba(0,0,0,0.38)">
        <circle cx="58" cy="72" r="7" />
        <circle cx="196" cy="72" r="7" />
      </g>
    </svg>
  );
}
