import Link from "next/link";

/** Orange breadcrumb strip bleeding off the right screen edge (GT2). */
export function GtCrumb({ label }: { label: string }) {
  return (
    <div className="pointer-events-none absolute top-6 right-0 md:top-8">
      <span className="gt-crumb block py-1 pr-6 pl-5 font-display text-sm font-bold tracking-[0.2em] text-asphalt uppercase md:pr-10">
        {label}
      </span>
    </div>
  );
}

export type GtTitleInk = "default" | "dark" | "light";

/** GT2 page header: heavy serif title over a red rule with a diagonal kick. */
export function GtTitle({
  children,
  kicker,
  ink = "default",
}: {
  children: React.ReactNode;
  kicker?: string;
  /**
   * Ink for the kicker + title. "default" (chrome title / silver kicker) is
   * used on the asphalt page background. "dark" (solid asphalt) and "light"
   * (solid chrome) are used when the title sits on a warm season field
   * (career-detail warmth) — solid ink, never reduced opacity, so contrast
   * holds regardless of the field's luminance.
   */
  ink?: GtTitleInk;
}) {
  const kickerClass =
    ink === "dark" ? "text-asphalt" : ink === "light" ? "text-chrome" : "text-silver";
  const titleClass = ink === "dark" ? "text-asphalt" : "text-chrome";
  return (
    <div className="max-w-fit">
      {kicker ? (
        <p
          className={`ts-hard font-display text-sm font-semibold tracking-[0.25em] uppercase ${kickerClass}`}
        >
          {kicker}
        </p>
      ) : null}
      <h1 className={`gt-title text-5xl md:text-6xl ${titleClass}`}>
        {children}
      </h1>
      <div className="gt-rule mt-2 mr-3" />
    </div>
  );
}

/** Orange lozenge link — GT2's back button shape. */
export function LozengeLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="lozenge inline-flex min-h-11 items-center gap-2 px-4 py-1.5 font-display text-sm font-bold tracking-widest text-asphalt uppercase outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-chrome"
    >
      {children}
    </Link>
  );
}
