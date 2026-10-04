/**
 * pages — the markdown alternate of every indexable page, keyed by site path.
 *
 * Served at `<path>.md` (home: `/index.md`) via the rewrite in next.config.ts
 * to app/md/[...path]/route.ts, and advertised from each page's <head> as
 * <link rel="alternate" type="text/markdown">. Assistant agents read this in a
 * fraction of the tokens of the HTML, with no JS and no game chrome.
 */
import { allEventSlugs } from "../../../content/career";
import { carById, carPath, detailCars } from "../../../content/cars";
import { stageOrder } from "../../../content/gtme";
import { KNOWN_ROUTES } from "../routes";
import { PERSON_NAME } from "../identity";
import { absoluteUrl } from "../jsonld";
import { blocks, pageLink } from "./md";
import {
  aboutMd,
  cafeMd,
  careerEventMd,
  careerMd,
  contactMd,
  credentialsMd,
  missionsMd,
  projectMd,
  projectsMd,
  skillsMd,
  specialStageMd,
  stageMd,
} from "./sections";

/** The `.md` URL path for a page path. */
export function markdownPath(path: string): string {
  return path === "/" ? "/index.md" : `${path}.md`;
}

/** Every page path that has a markdown alternate (mirrors the sitemap). */
export function markdownPagePaths(): readonly string[] {
  return [
    ...KNOWN_ROUTES,
    ...allEventSlugs.map((slug) => `/career/${slug}`),
    ...detailCars.map((car) => carPath(car.id)),
    ...stageOrder.map((slug) => `/special-stage/${slug}`),
  ];
}

function pavilionDoc(title: string, path: string, body: string): string {
  return blocks(
    `# ${title}: ${PERSON_NAME}`,
    `Source page: ${absoluteUrl(path)}`,
    body,
  );
}

const PAVILION_DOCS: Readonly<Record<string, () => string>> = {
  "/": () =>
    blocks(
      `# ${PERSON_NAME}`,
      aboutMd(),
      "## Sections",
      [
        `- ${pageLink("Career", "/career")}: education and work history`,
        `- ${pageLink("Projects", "/garage")}: software projects with stack and results`,
        `- ${pageLink("Hackathons", "/missions")}: competitions and outcomes`,
        `- ${pageLink("Skills", "/license-center")}: skills, each backed by evidence`,
        `- ${pageLink("GTM engineering case studies", "/special-stage")}`,
        `- ${pageLink("Reading paths", "/cafe")}: curated tours for founders, investors and hiring managers`,
        `- ${pageLink("Photography", "/scapes")}`,
        `- ${pageLink("Contact", "/lobby")}`,
      ].join("\n"),
    ),
  "/career": () => pavilionDoc("Career", "/career", careerMd()),
  "/garage": () => pavilionDoc("Projects", "/garage", projectsMd()),
  "/missions": () => pavilionDoc("Hackathons and competitions", "/missions", missionsMd()),
  "/license-center": () =>
    pavilionDoc("Skills and credentials", "/license-center", blocks("## Credentials", credentialsMd(), "## Skills", skillsMd())),
  "/special-stage": () => pavilionDoc("GTM engineering case studies", "/special-stage", specialStageMd()),
  "/scapes": () =>
    pavilionDoc("Photography", "/scapes", "A photo gallery of nature, cars and life on the road, grouped by category. Some photos link to the projects and events they sit alongside."),
  "/cafe": () => pavilionDoc("Reading paths", "/cafe", cafeMd()),
  "/lobby": () => pavilionDoc("Contact", "/lobby", contactMd()),
};

/** Markdown for a page path, or null when the path has no page. Pure. */
export function markdownForPath(path: string): string | null {
  const pavilion = PAVILION_DOCS[path];
  if (pavilion) return pavilion();

  const [, section, slug, extra] = path.split("/");
  if (!slug || extra !== undefined) return null;

  if (section === "career") {
    const doc = careerEventMd(slug);
    return doc && blocks(doc, `Source page: ${absoluteUrl(path)}`);
  }
  if (section === "garage") {
    const car = carById.get(slug);
    if (!car || car.status === "locked") return null;
    return blocks(projectMd(car), `Source page: ${absoluteUrl(path)}`);
  }
  if (section === "special-stage") {
    const doc = stageMd(slug);
    return doc && blocks(doc, `Source page: ${absoluteUrl(path)}`);
  }
  return null;
}
