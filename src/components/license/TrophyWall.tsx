import Link from "next/link";
import { licenses, type License, type LicenseTest } from "../../../content/licenses";
import { carById } from "../../../content/cars";
import { missionById } from "../../../content/missions";
import { findEvent } from "../../../content/career";
import { LicenseBadge } from "../gt/LicenseBadge";
import { LiveryStripe } from "../livery/LiveryStripe";
import { GradeChip } from "./GradeChip";

/**
 * Trophy wall — the flattened License Center. Every tier and medal is visible
 * at once (no tabs, no detail panel): each test is ONE skimmable line whose
 * whole purpose is to springboard into the work that earned it. The page
 * exists to sell the projects, not to restate a resume — prose summaries
 * live only in tooltips.
 */

/** Resolve a test's primary evidence target: Garage first, then Career, then Missions. */
function evidenceTarget(
  test: LicenseTest,
): { href: string; label: string } | null {
  const car = test.carId ? carById.get(test.carId) : undefined;
  if (car) return { href: `/garage?car=${car.id}`, label: car.name };
  const careerEvent = test.careerEventId ? findEvent(test.careerEventId) : null;
  if (careerEvent)
    return {
      href: `/career/${careerEvent.event.slug}`,
      label: careerEvent.event.org,
    };
  const mission = test.missionId ? missionById.get(test.missionId) : undefined;
  if (mission) return { href: "/missions", label: mission.name };
  return null;
}

/** One medal line: grade chip, test name, and the machine that earned it. */
function MedalRow({ test }: { test: LicenseTest }) {
  const target = evidenceTarget(test);
  const row = (
    <span className="flex w-full flex-wrap items-center gap-x-2.5 gap-y-1">
      <GradeChip grade={test.grade} />
      <span className="ts-hard min-w-0 flex-1 truncate font-display text-sm leading-tight font-bold tracking-wide text-chrome uppercase">
        {test.name}
      </span>
      {target ? (
        <span className="ts-hard flex max-w-44 items-baseline gap-1 font-display text-xs font-semibold tracking-wider text-gt-bright uppercase">
          <span className="truncate">{target.label}</span>
          <span aria-hidden="true">→</span>
        </span>
      ) : null}
    </span>
  );

  return (
    <li title={test.summary}>
      {target ? (
        <Link
          href={target.href}
          className="flex border border-transparent px-2 py-1.5 outline-none transition-colors duration-(--duration-snap) ease-(--ease-mech) hover:border-steel hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-gt-bright"
        >
          {row}
        </Link>
      ) : (
        <span className="flex px-2 py-1.5">{row}</span>
      )}
    </li>
  );
}

/** One tier card on the wall: badge, name, theme, and its medal lines. */
function TierCard({ license }: { license: License }) {
  return (
    <article
      aria-labelledby={`trophy-tier-${license.id}`}
      className="border border-steel bg-[#0d0d0f] shadow-[2px_3px_0_rgba(0,0,0,0.7)]"
    >
      <LiveryStripe livery={license.livery} />
      <div className="flex flex-col gap-3 p-4">
        <header className="flex items-center gap-3">
          <LicenseBadge glyph={license.id} livery={license.livery} />
          <div className="min-w-0">
            <h3
              id={`trophy-tier-${license.id}`}
              className="ts-hard truncate font-display text-base leading-tight font-bold tracking-wide text-chrome uppercase"
            >
              {license.name}
            </h3>
            <p className="truncate font-display text-xs font-bold tracking-[0.16em] text-gt-bright uppercase">
              {license.theme}
            </p>
          </div>
        </header>
        <ul className="flex list-none flex-col">
          {license.tests.map((test) => (
            <MedalRow key={test.id} test={test} />
          ))}
        </ul>
      </div>
    </article>
  );
}

export function TrophyWall() {
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {licenses.map((license) => (
        <TierCard key={license.id} license={license} />
      ))}
    </div>
  );
}
