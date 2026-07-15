import Link from "next/link";
import { garageCarIds } from "../../../content/cars";
import { allEventSlugs } from "../../../content/career";
import { missionById } from "../../../content/missions";
import { licenses } from "../../../content/licenses";
import { openCount, pavilions } from "../../../content/pavilions";

/**
 * GT2 save-file status bar: real totals derived at build time from the content
 * files. Each count segment links to its pavilion; the trailing OPEN segment
 * absorbs the world-map open-pavilion chip so it is never shown twice.
 * Locked/hidden entries (e.g. the "???" stealth car) are excluded from counts.
 */
const SEGMENTS: readonly { label: string; value: number; href: string }[] = [
  { label: "Cars", value: garageCarIds.size, href: "/garage" },
  { label: "Events", value: allEventSlugs.length, href: "/career" },
  { label: "Missions", value: missionById.size, href: "/missions" },
  { label: "Licenses", value: licenses.length, href: "/license-center" },
];

function Divider() {
  return (
    <span aria-hidden="true" className="text-steel">
      ·
    </span>
  );
}

export function HudTotals() {
  return (
    <div className="mt-6 w-full border-t border-steel">
      <div
        aria-label="Portfolio totals"
        className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-center gap-x-2.5 gap-y-1 px-1 py-2 font-display text-xs font-bold tracking-[0.14em] whitespace-nowrap uppercase sm:justify-start sm:gap-x-4"
      >
        {SEGMENTS.map((s, i) => (
          <span key={s.label} className="flex items-center gap-x-2.5 sm:gap-x-4">
            {i > 0 ? <Divider /> : null}
            <Link
              href={s.href}
              className="ts-hard group inline-flex items-baseline gap-1.5 text-silver outline-none hover:text-gt-bright focus-visible:ring-2 focus-visible:ring-gt-bright"
            >
              <span className="text-chrome tabular-nums group-hover:text-gt-bright">
                {s.value}
              </span>
              {s.label}
            </Link>
          </span>
        ))}
        <Divider />
        <span className="ts-hard inline-flex items-baseline gap-1.5 text-silver">
          <span className="text-gt-bright tabular-nums">
            {openCount}/{pavilions.length}
          </span>
          Open
        </span>
      </div>
    </div>
  );
}
