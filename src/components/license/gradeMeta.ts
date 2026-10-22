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
  /**
   * Lettering on the metallic face: the rim hue taken down to 25% (a
   * multiply toward black), so the medal still reads gold/silver/bronze but
   * clears WCAG AA 4.5:1 against the face's darkest stop (#9fa3aa). The rim
   * color itself measured 1.1-1.7:1 there.
   */
  ink: string;
  /** True for earned medals (gold/silver/bronze) — drives the metallic face */
  earned: boolean;
  /** Screen-reader phrasing */
  aria: string;
}

export const GRADE_META: Record<LicenseGrade, GradeMeta> = {
  gold: {
    label: "Gold",
    rim: "#d9a520",
    ink: "#362908",
    earned: true,
    aria: "Gold license",
  },
  silver: {
    label: "Silver",
    rim: "#c0c4cb",
    ink: "#303133",
    earned: true,
    aria: "Silver license",
  },
  bronze: {
    label: "Bronze",
    rim: "#b06a34",
    ink: "#2c1a0d",
    earned: true,
    aria: "Bronze license",
  },
  inprogress: {
    label: "In progress",
    rim: "#34363a",
    ink: "#bfc4cf",
    earned: false,
    aria: "In progress, not yet awarded",
  },
};
