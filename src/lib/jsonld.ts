/**
 * jsonld — schema.org builders for the structured data every page emits.
 *
 * Rule: schema only ever restates what the page visibly shows (Google's
 * structured-data policy, and the AEO reason — a model that finds a claim in
 * the markup and not on the page learns to distrust both). Builders are pure
 * and read the same content files the pages render, so they cannot drift.
 *
 * Never emitted here: the email address (kept out of static HTML since #114)
 * and any /api/ endpoint.
 */
import type { Car } from "../../content/cars";
import { carPath } from "../../content/cars";
import { credentials } from "../../content/credentials";
import {
  PERSON_ALTERNATE_NAMES,
  PERSON_EDUCATION,
  PERSON_NAME,
  PERSON_PORTRAIT,
  PERSON_PRIOR_SCHOOL,
  PERSON_PROFILES,
  PERSON_ROLE,
  PERSON_SUMMARY,
  PERSON_TOPICS,
  SITE_DESCRIPTION,
} from "./identity";
import { SITE_URL } from "./site";

export type JsonLdObject = { readonly [key: string]: unknown };

export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/** Absolute URL for a site path ("/" → SITE_URL with no trailing slash). */
export function absoluteUrl(path: string): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

/**
 * The site-wide Person: only what every page's chrome shows (name, role,
 * school, portrait) plus the profiles it links. The richer facts — summary,
 * skills, credentials — live in {@link personDetailJsonLd}, emitted only on
 * the page that renders them. Same @id, so consumers merge the two.
 */
export function personJsonLd(): JsonLdObject {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: PERSON_NAME,
    alternateName: [...PERSON_ALTERNATE_NAMES],
    jobTitle: PERSON_ROLE,
    url: SITE_URL,
    image: PERSON_PORTRAIT,
    sameAs: [...PERSON_PROFILES],
    alumniOf: [
      {
        "@type": "CollegeOrUniversity",
        name: PERSON_EDUCATION.school,
        department: {
          "@type": "Organization",
          name: PERSON_EDUCATION.department,
        },
      },
      { "@type": "CollegeOrUniversity", name: PERSON_PRIOR_SCHOOL.school },
    ],
  };
}

/**
 * Skills, summary and credentials for the License Center, which renders the
 * skill tiers, the degree and the issuer-verified credential plates.
 */
export function personDetailJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": PERSON_ID,
    name: PERSON_NAME,
    description: PERSON_SUMMARY,
    knowsAbout: [...PERSON_TOPICS],
    hasCredential: [
      {
        "@type": "EducationalOccupationalCredential",
        name: `${PERSON_EDUCATION.degree}, ${PERSON_EDUCATION.department}`,
        credentialCategory: "degree",
        dateCreated: String(PERSON_EDUCATION.year),
        recognizedBy: {
          "@type": "CollegeOrUniversity",
          name: PERSON_EDUCATION.school,
        },
      },
      ...credentials.map((c) => ({
        "@type": "EducationalOccupationalCredential",
        name: `${c.program} ${c.cohort} Diploma (${c.track})`,
        credentialCategory: "certificate",
        identifier: c.credentialId,
        url: c.href,
        recognizedBy: { "@type": "Organization", name: c.issuer },
      })),
    ],
  };
}

export function websiteJsonLd(): JsonLdObject {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: PERSON_NAME,
    alternateName: "Surya Racing Portfolio",
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    author: { "@id": PERSON_ID },
    publisher: { "@id": PERSON_ID },
  };
}

/** Site-wide graph: who the site is about, and the site itself. */
export function siteGraphJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@graph": [personJsonLd(), websiteJsonLd()],
  };
}

export interface Crumb {
  readonly name: string;
  readonly path: string;
}

/** BreadcrumbList rooted at the World Map (home). Pass the trail below home. */
export function breadcrumbJsonLd(trail: readonly Crumb[]): JsonLdObject {
  const items: readonly Crumb[] = [{ name: "World Map", path: "/" }, ...trail];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** A Garage project as a creative work by the owner, with its visible facts. */
export function projectJsonLd(car: Car): JsonLdObject {
  // Only a link labelled as the live product is the project's own site; a
  // demo video or Devpost page is about the project, not the project itself.
  const live = car.links?.find((l) => /^live\b/i.test(l.label));
  const repo = car.links?.find((l) => l.href.includes("github.com"));
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    "@id": `${absoluteUrl(carPath(car.id))}#project`,
    name: car.name,
    description: car.tagline,
    url: absoluteUrl(carPath(car.id)),
    creator: { "@id": PERSON_ID },
    ...(car.drivetrain ? { keywords: car.drivetrain.join(", ") } : {}),
    ...(repo ? { codeRepository: repo.href } : {}),
    ...(live ? { sameAs: live.href } : {}),
    author: { "@id": PERSON_ID },
    creativeWorkStatus: car.status === "hero" ? "Published" : "In development",
    ...(car.team
      ? {
          // The owner is the same node as the site-wide Person, never a
          // second, unlinked "Surya Pugazhenthi".
          contributor: car.team.map((m) =>
            m.name === PERSON_NAME
              ? { "@id": PERSON_ID }
              : { "@type": "Person", name: m.name, roleName: m.role },
          ),
        }
      : {}),
  };
}

/**
 * Serialize for a <script type="application/ld+json"> body. Escapes `<` so a
 * content string can never close the script element (Next's JSON-LD guidance).
 */
export function serializeJsonLd(data: JsonLdObject): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
