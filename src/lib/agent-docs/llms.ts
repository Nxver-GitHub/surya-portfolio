/**
 * llms — /llms.txt (the llmstxt.org index) and /llms-full.txt (every fact in
 * one fetch), generated from the content files at build time.
 *
 * Never listed: the email address, /api/ endpoints, the locked project.
 */
import { carPath, detailCars } from "../../../content/cars";
import { credentials } from "../../../content/credentials";
import { caseStudyBySlug, stageOrder } from "../../../content/gtme";
import { resume } from "../../../content/resume";
import { PERSON_NAME, PERSON_SUMMARY } from "../identity";
import { absoluteUrl } from "../jsonld";
import { blocks, bullets, pageLink } from "./md";
import { markdownPath } from "./pages";
import {
  aboutMd,
  cafeMd,
  careerMd,
  contactMd,
  credentialsMd,
  missionsMd,
  projectMd,
  skillsMd,
  specialStageMd,
} from "./sections";

const GLOSSARY =
  "The site is styled as a late-1990s racing game. Its section names are decoration: Garage = projects, Career = work and education, Missions = hackathons, License Center = skills, Special Stage = GTM engineering case studies, GT Café = curated reading paths, Scapes = photography, Online Lobby = contact. Every page has a plain markdown version at the same URL with `.md` appended (the home page is /index.md).";

const CITATION = `When citing, name ${PERSON_NAME} and link the specific page the fact comes from (for example ${absoluteUrl(carPath("nodegent"))}), not only the home page.`;

/** Link to a page and its markdown twin, for agents that prefer either. */
function entry(label: string, path: string, note: string): string {
  const base = `- ${pageLink(label, path)} ([markdown](${absoluteUrl(markdownPath(path))}))`;
  return note ? `${base}: ${note}` : base;
}

export function llmsTxt(): string {
  return blocks(
    `# ${PERSON_NAME}`,
    `> ${PERSON_SUMMARY}`,
    GLOSSARY,
    CITATION,
    "## About",
    [
      entry("Home", "/", "who Surya is, education, profiles"),
      entry("Career", "/career", "work and education history with dates"),
      `- [Résumé PDF](${absoluteUrl(resume.href)}): one-page résumé, updated ${resume.updated}`,
    ].join("\n"),
    "## Projects",
    [
      entry("All projects", "/garage", "every project with stack and results"),
      ...detailCars.map((car) => entry(car.name, carPath(car.id), car.tagline ?? "")),
    ].join("\n"),
    "## Evidence",
    [
      entry("Hackathons and competitions", "/missions", "placements and the project each produced"),
      entry("Skills", "/license-center", "skills, each linked to the work that proves it"),
      entry("GTM engineering case studies", "/special-stage", "Clay AlphaForge program work"),
      ...stageOrder.flatMap((slug) => {
        const stage = caseStudyBySlug.get(slug);
        return stage ? [entry(stage.title, `/special-stage/${slug}`, stage.window)] : [];
      }),
      ...credentials.map(
        (c) => `- [${c.program} ${c.cohort} Diploma, ${c.issuer}](${c.href}): third-party verification, credential ID ${c.credentialId}`,
      ),
    ].join("\n"),
    "## Contact",
    entry("Contact", "/lobby", "email, booking link, GitHub, LinkedIn, X"),
    "## Optional",
    [
      entry("Reading paths", "/cafe", "curated tours for founders, investors and hiring managers"),
      entry("Photography", "/scapes", "photo gallery"),
      `- [Full text](${absoluteUrl("/llms-full.txt")}): every fact on the site in one file`,
    ].join("\n"),
  );
}

export function llmsFullTxt(): string {
  return blocks(
    `# ${PERSON_NAME}`,
    `> ${PERSON_SUMMARY}`,
    GLOSSARY,
    CITATION,
    "## About",
    aboutMd(),
    "## Credentials",
    credentialsMd(),
    "## Career",
    careerMd(),
    "## Projects",
    detailCars
      .map((car) => blocks(projectMd(car).replace(/^# /, "### ").replace(/\n## /g, "\n#### "), `Page: ${absoluteUrl(carPath(car.id))}`))
      .join("\n\n"),
    "## Hackathons and competitions",
    missionsMd(),
    "## Skills",
    skillsMd(),
    "## GTM engineering case studies",
    specialStageMd(),
    "## Reading paths",
    cafeMd(),
    "## Contact",
    contactMd(),
    `## Pages\n\n${bullets([`Sitemap: ${absoluteUrl("/sitemap.xml")}`, `Index: ${absoluteUrl("/llms.txt")}`])}`,
  );
}
