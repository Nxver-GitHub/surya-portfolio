import Link from "next/link";
import { SoundSelect } from "@/components/sound/SoundSelect";
import { GtMark } from "./GtMark";

/** Orange breadcrumb strip bleeding off the right screen edge (GT2). */
export function GtCrumb({ label }: { label: string }) {
  return (
    <div className="console-location">
      <span className="gt-crumb font-display text-sm font-bold uppercase">
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
  const titleClass = ink === "dark" ? "text-asphalt" : "text-chrome";
  return (
    <div className="console-title-block max-w-fit" title={kicker}>
      <h1 className={`gt-title ${titleClass}`}>
        {children}
      </h1>
      <div className="gt-rule mt-2 mr-3" />
    </div>
  );
}

/**
 * Every interior screen's top strip: the system mark, the way back out, then
 * the Sound Select deck in the run that was left empty between them and the
 * page label. Composed rather than left to each page so neither the mark nor
 * the deck can be forgotten on a pavilion added later — both are chrome that
 * has to be everywhere or nowhere.
 */
export function GtBackHeader({
  href,
  label,
}: {
  href: string;
  /** Plain destination name — the component supplies the arrow. */
  label: string;
}) {
  return (
    <header className="console-header">
      <GtMark />
      <LozengeLink href={href}>
        <span aria-hidden="true">←</span> {label}
      </LozengeLink>
      <SoundSelect />
    </header>
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
      data-sfx="back"
      transitionTypes={["nav-back"]}
      className="lozenge inline-flex min-h-11 items-center gap-2 px-4 py-1.5 font-display text-sm font-bold tracking-wide text-asphalt uppercase outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-chrome"
    >
      {children}
    </Link>
  );
}
