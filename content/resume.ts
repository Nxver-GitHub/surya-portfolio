/**
 * Driver Profile: the one public résumé, served as a static PDF.
 *
 * The PDF is compiled from `assets-src/resume/main.tex` (Tectonic) and
 * committed to `public/resume/`. The web build of the résumé carries no phone
 * number or street address: this repo and the file are public. Email stays,
 * since a recruiter downloading a résumé expects one.
 *
 * Copy tone (per CLAUDE.md): "Driver Profile" is chrome; every fact below is
 * plain English and must match the PDF.
 */

export interface Resume {
  /** Public path under /public — one canonical file, stable URL */
  href: string;
  /** Download filename offered to the visitor */
  filename: string;
  /** Month the PDF was last regenerated, human-readable */
  updated: string;
  /** Plain-English one-liner of what the visitor is downloading */
  summary: string;
  /** Page count, so the visitor knows it is a one-lap read */
  pages: number;
}

export const resume: Resume = {
  href: "/resume/Surya_Pugazhenthi_Resume.pdf",
  filename: "Surya_Pugazhenthi_Resume.pdf",
  updated: "September 2026",
  summary:
    "One-page general résumé: education, venture and product roles, hackathon builds, and the stack behind them.",
  pages: 1,
};
