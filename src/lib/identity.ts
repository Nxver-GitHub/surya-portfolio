/**
 * identity — the one place the site states who Surya is, in plain English.
 *
 * Every machine-readable surface reads from here: the root <title>/meta
 * description, the Person JSON-LD, llms.txt and the markdown alternates. So
 * when a role changes, this file and the dated career content are the only
 * edits — the headline is deliberately durable ("Product Builder"), and no
 * current employer is stated outside content/career.ts, where it carries dates.
 */
import { joinControls } from "../../content/lobby";
import { SITE_URL } from "./site";

export const PERSON_NAME = "Surya Pugazhenthi";

/** Durable headline role — never an employer, so it can't go stale. */
export const PERSON_ROLE = "Product Builder";

/**
 * Names the owner actually goes by, so partial and informal queries resolve to
 * this person. Owner-approved list (2026-10-03): no misspellings, no handles
 * the owner doesn't use as a name.
 */
export const PERSON_ALTERNATE_NAMES = [
  "Surya Pugaz",
  "suryapugaz",
  "Surya P.",
  "Surya P",
] as const;

export const PERSON_EDUCATION = {
  school: "University of California, Santa Cruz",
  shortSchool: "UC Santa Cruz",
  department: "Baskin School of Engineering",
  degree: "B.S. Computer Science",
  year: 2026,
} as const;

export const PERSON_PRIOR_SCHOOL = {
  school: "Diablo Valley College",
  degree: "A.S. Computer Science",
} as const;

/** Topics the work on this site evidences (License Center tiers, Garage). */
export const PERSON_TOPICS = [
  "AI agents",
  "Full-stack web development",
  "Product management",
  "GTM engineering",
  "Venture capital",
] as const;

/** Plain-English one-sentence answer to "who is Surya Pugazhenthi?". */
export const PERSON_SUMMARY =
  `${PERSON_NAME} is a product builder and ${PERSON_EDUCATION.shortSchool} computer science graduate (${PERSON_EDUCATION.year}) who builds AI agents and web products, competes in hackathons, and has worked in early-stage venture capital in the Bay Area.`;

export const SITE_TITLE = `${PERSON_NAME} — ${PERSON_ROLE} · UCSC Computer Science '26`;

export const SITE_DESCRIPTION =
  `${PERSON_NAME} is a product builder and UC Santa Cruz computer science graduate (2026). Projects, hackathon results, career history, skills and contact.`;

/** Short credential line for the home Driver Profile card. */
export const PERSON_SCHOOL_LINE = "UCSC Computer Science '26";

/** Public profiles that are this person — from content/lobby.ts, never retyped. */
export const PERSON_PROFILES: readonly string[] = joinControls
  .filter((c) => c.channel === "github" || c.channel === "linkedin" || c.channel === "x")
  .flatMap((c) => (c.href ? [c.href] : []));

export const PERSON_PORTRAIT = `${SITE_URL}/terminal/portrait.jpg`;
