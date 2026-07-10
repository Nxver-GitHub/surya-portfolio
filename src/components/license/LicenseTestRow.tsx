import type { LicenseTest } from "../../../content/licenses";
import { GradeChip } from "./GradeChip";
import { EvidenceLinks } from "./EvidenceLinks";

/**
 * One license test on the detail panel: grade medal, race-flavored name,
 * factual summary, and evidence plates linking to the real project pages.
 */
export function LicenseTestRow({ test }: { test: LicenseTest }) {
  return (
    <li className="border border-steel bg-panel p-4 shadow-[2px_3px_0_rgba(0,0,0,0.7)]">
      <div className="flex flex-wrap items-center gap-3">
        <GradeChip grade={test.grade} />
        <h4 className="ts-hard font-display text-base leading-tight font-bold tracking-wide text-chrome uppercase">
          {test.name}
        </h4>
      </div>
      <p className="mt-2 text-sm text-silver">{test.summary}</p>
      <EvidenceLinks test={test} />
    </li>
  );
}
