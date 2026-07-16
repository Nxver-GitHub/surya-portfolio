import Link from "next/link";
import { licenses, type LicenseTest } from "../../../content/licenses";
import { GradeChip } from "../license/GradeChip";

/**
 * The licenses a car earned — the trophy wall inverted so the Garage wears
 * the medals. Lists every EARNED license test that cites this car as
 * evidence (in-progress tests stay off the spec sheet; a spec sheet shows
 * achievements, not homework). Each chip links back to the trophy wall.
 */
export function LicensesEarned({ carId }: { carId: string }) {
  const earned: LicenseTest[] = licenses
    .flatMap((tier) => tier.tests)
    .filter((test) => test.carId === carId && test.grade !== "inprogress");

  if (earned.length === 0) return null;

  return (
    <div>
      <h3 className="font-display text-xs font-bold tracking-[0.18em] text-gt-bright uppercase">
        Licenses earned
      </h3>
      <ul className="mt-1.5 flex list-none flex-wrap gap-1.5">
      {earned.map((test) => (
        <li key={test.id}>
          <Link
            href="/license-center"
            title={test.summary}
            className="inline-flex items-center gap-1.5 border border-steel px-2 py-1 outline-none transition-colors duration-(--duration-snap) ease-(--ease-mech) hover:border-gt focus-visible:ring-2 focus-visible:ring-gt-bright"
          >
            <GradeChip grade={test.grade} />
            <span className="ts-hard font-display text-xs font-semibold tracking-wider text-chrome uppercase">
              {test.name}
            </span>
          </Link>
        </li>
      ))}
      </ul>
    </div>
  );
}
