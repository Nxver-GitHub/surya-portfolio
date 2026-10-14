import Link from "next/link";
import { garageCarIds } from "../../../content/cars";
import { allEventSlugs } from "../../../content/career";
import { missionById } from "../../../content/missions";
import { licenses } from "../../../content/licenses";
import { openCount, pavilions } from "../../../content/pavilions";
import { HudOnline } from "./HudOnline";
import { VersionLog } from "./VersionLog";

/**
 * GT2 save-file status bar: real totals derived at build time from the content
 * files, flanked by the VERSION plate (update log) on the left and the
 * copyright line on the right. Each count segment links to its pavilion; the
 * trailing OPEN segment absorbs the world-map open-pavilion chip so it is
 * never shown twice. Locked/hidden entries (e.g. the "???" stealth car) are
 * excluded from counts.
 */
const SEGMENTS: readonly { label: string; value: number; href: string }[] = [
  { label: "Cars", value: garageCarIds.size, href: "/garage" },
  { label: "Events", value: allEventSlugs.length, href: "/career" },
  { label: "Missions", value: missionById.size, href: "/missions" },
  { label: "Licenses", value: licenses.length, href: "/license-center" },
];

/* Hidden on phones: the row wraps there, and a wrapped line begins with the
   divider of the segment that moved down — a dot dangling in front of nothing.
   Spacing alone separates the counts at that width. */
function Divider() {
  return (
    <span aria-hidden="true" className="text-steel max-sm:hidden">
      ·
    </span>
  );
}

function Segment({ segment }: { segment: (typeof SEGMENTS)[number] }) {
  return (
    <Link
      transitionTypes={["nav-forward"]}
      href={segment.href}
      /* WCAG 2.5.8 wants a 24px target. Above sm, py-1 grows the hit area
         from 16px to 24px and the matching -my-1 hands the same 8px back to
         layout: this strip is inside the desktop height-aware no-scroll
         budget, so the row must not grow. Phones have room, so there the
         padding is real (28px). */
      className="ts-hard group inline-flex items-baseline gap-1.5 py-1 -my-1 text-silver outline-none max-sm:my-0 max-sm:py-1.5 hover:text-gt-bright focus-visible:ring-2 focus-visible:ring-gt-bright"
    >
      <span className="text-chrome tabular-nums group-hover:text-gt-bright">
        {segment.value}
      </span>
      {segment.label}
    </Link>
  );
}

export function HudTotals() {
  return (
    <div className="mt-6 w-full border-t border-steel">
      {/* Mobile wraps to two rows (totals on top, version + copyright below);
          sm+ is one row with the totals centered between the flanks. */}
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-1 py-2">
        <div className="order-2 sm:order-1">
          <VersionLog />
        </div>
        <div
          aria-label="Portfolio totals"
          className="order-1 flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-1 font-display text-xs font-bold tracking-[0.14em] whitespace-nowrap uppercase sm:order-2 sm:w-auto sm:flex-1 sm:gap-x-4"
        >
          {SEGMENTS.slice(0, -1).map((s, i) => (
            <span key={s.label} className="flex items-center gap-x-2.5 sm:gap-x-4">
              {i > 0 ? <Divider /> : null}
              <Segment segment={s} />
            </span>
          ))}
          {/* The last count and the OPEN chip wrap as one unit: alone, the
              chip was the only thing on a phone's second row ("8/8 OPEN" as
              an orphan). Each keeps its own divider, so a wrapped row never
              starts or ends on a dangling "·". */}
          <span className="flex items-center gap-x-2.5 sm:gap-x-4">
            <Divider />
            <Segment segment={SEGMENTS[SEGMENTS.length - 1]} />
            <Divider />
            <span className="ts-hard inline-flex items-baseline gap-1.5 text-silver">
              <span className="text-gt-bright tabular-nums">
                {openCount}/{pavilions.length}
              </span>
              Open
            </span>
          </span>
          <HudOnline />
        </div>
        <p className="ts-hard order-3 font-display text-xs font-bold tracking-[0.14em] text-silver uppercase">
          © <span className="num">2026</span> Surya Pugazhenthi
        </p>
      </div>
    </div>
  );
}
