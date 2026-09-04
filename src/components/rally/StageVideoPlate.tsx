import type { StageVideo } from "../../../content/gtme";

interface StageVideoPlateProps {
  video: StageVideo;
  className?: string;
}

/**
 * Link-out to a screen recording, stamped as a plate: play glyph, the
 * recording's label, its note underneath, and the external-link mark. The
 * recordings are hosted off-site, so every one of these leaves the site and
 * says so, both visually and to a screen reader.
 */
export function StageVideoPlate({ video, className = "" }: StageVideoPlateProps) {
  return (
    <a
      href={video.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`plate group flex items-start gap-3 px-4 py-3 outline-none transition-colors duration-(--duration-snap) ease-(--ease-mech) focus-visible:ring-2 focus-visible:ring-gt-bright ${className}`}
    >
      <svg
        viewBox="0 0 12 14"
        aria-hidden="true"
        focusable="false"
        className="mt-1 h-3.5 w-3 shrink-0 fill-gt-bright transition-colors duration-(--duration-snap) ease-(--ease-mech) group-hover:fill-chrome"
      >
        <polygon points="0,0 12,7 0,14" />
      </svg>

      <span className="flex min-w-0 flex-col gap-1">
        <span className="ts-hard font-display text-sm font-bold tracking-widest text-gt-bright uppercase transition-colors duration-(--duration-snap) ease-(--ease-mech) group-hover:text-chrome">
          {video.label}
        </span>
        {video.note ? (
          <span className="text-sm text-silver leading-snug">{video.note}</span>
        ) : null}
      </span>

      <span
        aria-hidden="true"
        className="ml-auto pl-2 font-display text-sm text-gt-bright transition-colors duration-(--duration-snap) ease-(--ease-mech) group-hover:text-chrome"
      >
        ↗
      </span>
      <span className="sr-only">Opens in a new tab</span>
    </a>
  );
}

interface FootageStripProps {
  footage: readonly StageVideo[];
  className?: string;
}

/** Every recording from the arc, listed once as a compact row of plates. */
export function FootageStrip({ footage, className = "" }: FootageStripProps) {
  if (footage.length === 0) return null;

  return (
    <section aria-label="Onboard footage" className={className}>
      <h2 className="font-display text-xs font-bold tracking-[0.22em] text-gt-bright uppercase">
        Onboard footage
      </h2>
      <div className="mt-3 flex flex-wrap gap-3">
        {footage.map((video) => (
          <StageVideoPlate
            key={video.href}
            video={video}
            className="flex-1 basis-72"
          />
        ))}
      </div>
    </section>
  );
}
