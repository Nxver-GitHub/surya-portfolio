import Link from "next/link";
import { licenses, type License, type LicenseTest } from "../../../content/licenses";
import { carById } from "../../../content/cars";
import { missionById } from "../../../content/missions";
import { findEvent } from "../../../content/career";
import { caseStudyBySlug } from "../../../content/gtme";
import { credentialById } from "../../../content/credentials";
import { LicenseBadge } from "../gt/LicenseBadge";
import { LiveryStripe } from "../livery/LiveryStripe";
import { CredentialPlate } from "../rally/CredentialPlate";
import { GradeChip } from "./GradeChip";

/**
 * Trophy wall — the flattened License Center. Every tier and medal is visible
 * at once (no tabs, no detail panel): each test is ONE skimmable line whose
 * whole purpose is to springboard into the work that earned it. The page
 * exists to sell the projects, not to restate a resume — prose summaries
 * live only in tooltips.
 *
 * A tier may also carry an external credential (`credentialId`), which lands
 * at the foot of its card as a rally competition plate plus a verify link out
 * to the issuer's own page — the medals are self-assessed, the plate is not.
 */

/**
 * Resolve a test's primary evidence target: Garage first, then Special Stage,
 * then Career, then Missions.
 */
function evidenceTarget(
  test: LicenseTest,
): { href: string; label: string } | null {
  const car = test.carId ? carById.get(test.carId) : undefined;
  if (car) return { href: `/garage?car=${car.id}`, label: car.name };
  const stage = test.specialStageSlug
    ? caseStudyBySlug.get(test.specialStageSlug)
    : undefined;
  if (stage)
    return { href: `/special-stage/${stage.slug}`, label: stage.title };
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
    <span className="trophy-row w-full">
      <GradeChip grade={test.grade} />
      <span className="trophy-row-title ts-hard min-w-0 font-display text-sm leading-tight font-bold text-chrome uppercase">
        {test.name}
      </span>
      {target ? (
        <span className="trophy-evidence flex min-w-0 items-baseline gap-1 font-display text-xs font-semibold text-gt-bright uppercase">
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
          transitionTypes={["nav-forward"]}
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
  const credential = license.credentialId
    ? credentialById.get(license.credentialId)
    : undefined;

  return (
    <article
      aria-labelledby={`trophy-tier-${license.id}`}
      className="trophy-tier min-w-0"
    >
      <LiveryStripe livery={license.livery} />
      <div className="flex flex-col gap-3 p-4">
        <header className="flex items-center gap-3">
          <LicenseBadge glyph={license.id} livery={license.livery} />
          <div className="min-w-0">
            <h2
              id={`trophy-tier-${license.id}`}
              className="ts-hard font-display leading-tight font-bold text-chrome uppercase"
            >
              {license.name}
            </h2>
            <p className="mt-1 font-display text-xs font-bold text-silver uppercase">
              {license.theme}
            </p>
          </div>
        </header>
        <ul className="flex list-none flex-col">
          {license.tests.map((test) => (
            <MedalRow key={test.id} test={test} />
          ))}
        </ul>
        {credential ? (
          <div className="flex min-w-0 flex-col gap-2">
            <p className="font-display text-xs tracking-[0.14em] text-silver uppercase">
              Homologation
            </p>
            <CredentialPlate
              credential={credential}
              livery={license.livery}
            />
            <a
              href={credential.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Verify the ${credential.program} ${credential.track} credential at ${credential.issuer}`}
              className="self-start border border-transparent px-2 py-1.5 font-display text-xs font-semibold text-gt-bright uppercase outline-none transition-colors duration-(--duration-snap) ease-(--ease-mech) hover:border-steel hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-gt-bright"
            >
              Verify <span aria-hidden="true">→</span>
            </a>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function TrophyWall() {
  return (
    <div className="trophy-wall mt-6 grid gap-4">
      {licenses.map((license) => (
        <TierCard key={license.id} license={license} />
      ))}
    </div>
  );
}
