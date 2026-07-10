import type { LicenseGrade } from "../../../content/licenses";

/**
 * Visual metadata for each license grade. Gold/silver/bronze render as enamel
 * medal chips (rim color + metallic face, consistent with the LicenseBadge
 * system); in-progress is a subdued steel state — honest, not a medal.
 */
export interface GradeMeta {
  /** Short uppercase label for the chip */
  label: string;
  /** Enamel rim color; steel for in-progress */
  rim: string;
  /** True for earned medals (gold/silver/bronze) — drives the metallic face */
  earned: boolean;
  /** Screen-reader phrasing */
  aria: string;
}

export const GRADE_META: Record<LicenseGrade, GradeMeta> = {
  gold: { label: "Gold", rim: "#d9a520", earned: true, aria: "Gold license" },
  silver: {
    label: "Silver",
    rim: "#c0c4cb",
    earned: true,
    aria: "Silver license",
  },
  bronze: {
    label: "Bronze",
    rim: "#b06a34",
    earned: true,
    aria: "Bronze license",
  },
  inprogress: {
    label: "In progress",
    rim: "#34363a",
    earned: false,
    aria: "In progress, not yet awarded",
  },
};
