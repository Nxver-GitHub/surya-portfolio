/**
 * sections — plain-English markdown for each part of the portfolio.
 *
 * RULE (owner-approved 2026-10-03): only fields the public pages already render
 * appear here. Racing chrome (Garage, Lap record, License tiers) is translated
 * to plain labels; the email address, /api/ endpoints and the locked stealth
 * project never appear. Each builder is pure over the content files.
 */
import { seasons, findEvent } from "../../../content/career";
import { carPath, detailCars, type Car } from "../../../content/cars";
import { credentials } from "../../../content/credentials";
import { caseStudyBySlug, specialStage, stageOrder } from "../../../content/gtme";
import { licenses } from "../../../content/licenses";
import { joinControls, playerList, statusChips } from "../../../content/lobby";
import { menuBooks } from "../../../content/menu-books";
import { missionPacks } from "../../../content/missions";
import { resume } from "../../../content/resume";
import {
  PERSON_ALTERNATE_NAMES,
  PERSON_EDUCATION,
  PERSON_NAME,
  PERSON_PRIOR_SCHOOL,
  PERSON_PROFILES,
  PERSON_ROLE,
  PERSON_SUMMARY,
} from "../identity";
import { careerLede } from "../career-lede";
import { absoluteUrl } from "../jsonld";
import { blocks, bullets, facts, pageLink } from "./md";

export function aboutMd(): string {
  return blocks(
    PERSON_SUMMARY,
    facts([
      ["Name", PERSON_NAME],
      ["Also known as", PERSON_ALTERNATE_NAMES.join(", ")],
      ["Role", PERSON_ROLE],
      [
        "Education",
        `${PERSON_EDUCATION.degree}, ${PERSON_EDUCATION.department}, ${PERSON_EDUCATION.school} (${PERSON_EDUCATION.year}); ${PERSON_PRIOR_SCHOOL.degree}, ${PERSON_PRIOR_SCHOOL.school}`,
      ],
      ["Website", absoluteUrl("/")],
      ["Profiles", PERSON_PROFILES.join(", ")],
    ]),
  );
}

export function careerMd(): string {
  return seasons
    .map((season) => {
      const events = season.events
        .filter((e) => !e.locked)
        .map(
          (e) => `- ${pageLink(e.title, `/career/${e.slug}`)}: ${careerLede(e)}`,
        );
      return blocks(`### ${season.number}: ${season.name} (${season.period})`, season.summary, events.join("\n"));
    })
    .join("\n\n");
}

export function careerEventMd(slug: string): string | null {
  const found = findEvent(slug);
  if (!found) return null;
  const { season, event } = found;
  return blocks(
    `# ${event.title}`,
    careerLede(event),
    facts([
      ["Organization", event.org],
      ["Role", event.role],
      ["Dates", event.dates],
      ["Result", event.result],
      ["Career period", `${season.number}, ${season.name} (${season.period})`],
    ]),
    "## Context",
    event.story.problem,
    "## What Surya did",
    bullets(event.story.actions),
    "## Outcome",
    event.story.results,
    event.links?.length ? `## Links\n\n${bullets(event.links.map((l) => `[${l.label}](${l.href})`))}` : null,
  );
}

/** One-line plain status for a project, shared by the list and detail docs. */
function projectStatus(car: Car): string {
  return car.status === "hero" ? "Shipped" : "In development";
}

export function projectsMd(): string {
  return detailCars
    .map(
      (car) =>
        `- ${pageLink(car.name, carPath(car.id))} (${car.raced ?? "undated"}, ${projectStatus(car)}): ${car.tagline ?? ""} ${car.lapRecord ? `Result: ${car.lapRecord}.` : ""}`.trim(),
    )
    .join("\n");
}

export function projectMd(car: Car): string {
  const career = car.careerEventSlug ? findEvent(car.careerEventSlug) : undefined;
  return blocks(
    `# ${car.name}`,
    car.tagline,
    facts([
      ["Status", projectStatus(car)],
      ["When", car.raced],
      ["Category", car.carClass],
      ["Headline result", car.lapRecord],
      ["Tech stack", car.drivetrain?.join(", ")],
    ]),
    car.performance?.length ? `## Impact\n\n${bullets(car.performance)}` : null,
    car.team?.length ? `## Team\n\n${bullets(car.team.map((m) => `${m.name}: ${m.role}`))}` : null,
    car.links?.length ? `## Links\n\n${bullets(car.links.map((l) => `[${l.label}](${l.href})`))}` : null,
    career ? `## Background\n\n${pageLink(career.event.title, `/career/${career.event.slug}`)}` : null,
  );
}

export function missionsMd(): string {
  return missionPacks
    .map((pack) =>
      blocks(
        `### ${pack.name}`,
        pack.description,
        pack.missions
          .map((m) => {
            const project = m.carId ? detailCars.find((c) => c.id === m.carId) : undefined;
            const built = project ? ` Project: ${pageLink(project.name, carPath(project.id))}.` : "";
            return `- **${m.name}** (${m.host}, ${m.date}): ${m.outcome}${built}`;
          })
          .join("\n"),
      ),
    )
    .join("\n\n");
}

const GRADE_LABEL = {
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
  inprogress: "In progress",
} as const;

export function skillsMd(): string {
  return licenses
    .map((tier) =>
      blocks(
        `### ${tier.theme}`,
        tier.summary,
        bullets(tier.tests.map((t) => `${t.name} (${GRADE_LABEL[t.grade]}): ${t.summary}`)),
      ),
    )
    .join("\n\n");
}

export function credentialsMd(): string {
  return bullets([
    `${PERSON_EDUCATION.degree}, ${PERSON_EDUCATION.department}, ${PERSON_EDUCATION.school}, ${PERSON_EDUCATION.year}`,
    `${PERSON_PRIOR_SCHOOL.degree}, ${PERSON_PRIOR_SCHOOL.school}`,
    ...credentials.map(
      (c) =>
        `${c.program} ${c.cohort} Diploma, ${c.track} (${c.issuer}, completed ${c.completed}). Credential ID ${c.credentialId}, verify at ${c.href}`,
    ),
  ]);
}

export function specialStageMd(): string {
  const stages = stageOrder.flatMap((slug) => {
    const stage = caseStudyBySlug.get(slug);
    return stage
      ? [`- ${pageLink(stage.title, `/special-stage/${slug}`)} (${stage.window}): ${stage.lede[0] ?? ""}`]
      : [];
  });
  return blocks(...specialStage.wedge, stages.join("\n"));
}

export function stageMd(slug: string): string | null {
  const stage = caseStudyBySlug.get(slug as (typeof stageOrder)[number]);
  if (!stage) return null;
  return blocks(
    `# ${stage.title}`,
    stage.assertion ? `> ${stage.assertion}` : null,
    stage.byline ? `By ${stage.byline.author}. ${stage.byline.context}, ${stage.byline.date}.` : null,
    `Window: ${stage.window}`,
    ...stage.lede,
    stage.metrics.length
      ? `## Key numbers\n\n${bullets(stage.metrics.map((m) => `${m.label}: ${m.value}${m.detail ? ` (${m.detail})` : ""}`))}`
      : null,
    ...stage.sections.map((s) => blocks(`## ${s.heading}`, ...s.body)),
    blocks(`## ${stage.failures.heading}`, ...stage.failures.body),
    blocks(`## ${stage.debrief.heading}`, ...stage.debrief.body),
  );
}

export function cafeMd(): string {
  return bullets(
    menuBooks.map((book) => `**${book.title}** (for ${book.audience}): ${book.blurb}`),
  );
}

export function contactMd(): string {
  const channels = joinControls.flatMap((c) => {
    if (c.channel === "email") return [`Email: listed on ${pageLink("the Lobby page", "/lobby")}`];
    if (c.channel === "resume") return [`Résumé (PDF, updated ${resume.updated}): ${absoluteUrl(resume.href)}`];
    if (c.channel === "calendly") return c.href ? [`Book a call: ${c.href}`] : [];
    return c.href ? [`${c.label}: ${c.href}`] : [];
  });
  return blocks(
    `Currently: ${statusChips.map((s) => s.label).join("; ")}.`,
    bullets(channels),
    "### Communities",
    bullets(playerList.map((p) => `${p.name} (${p.membership === "active" ? "current" : "past"}): ${p.description}`)),
  );
}
