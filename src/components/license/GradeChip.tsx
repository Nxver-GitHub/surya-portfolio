import type { LicenseGrade } from "../../../content/licenses";
import { GRADE_META } from "./gradeMeta";

interface GradeChipProps {
  grade: LicenseGrade;
}

/**
 * Enamel medal chip for a license grade. Earned grades (gold/silver/bronze)
 * use the badge system's colored rim + metallic face; in-progress renders as a
 * subdued steel chip so it never reads as an awarded medal.
 */
export function GradeChip({ grade }: GradeChipProps) {
  const meta = GRADE_META[grade];

  if (!meta.earned) {
    return (
      <span
        className="ts-hard inline-flex items-center gap-1.5 border border-steel bg-panel px-2 py-0.5 font-display text-[11px] font-bold tracking-[0.16em] text-silver uppercase"
        aria-label={meta.aria}
      >
        <span aria-hidden="true" className="text-silver">
          ◷
        </span>
        {meta.label}
      </span>
    );
  }

  return (
    <span
      className="badge-rim inline-flex"
      style={{ backgroundColor: meta.rim, padding: 2 }}
      aria-label={meta.aria}
    >
      <span className="badge-face inline-flex items-center px-2 py-0.5">
        <span
          className="font-display text-[11px] font-black tracking-[0.16em] uppercase"
          style={{ color: meta.rim, textShadow: "1px 1px 0 rgba(0,0,0,0.35)" }}
        >
          {meta.label}
        </span>
      </span>
    </span>
  );
}
