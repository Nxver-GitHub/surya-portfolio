import type { CareerEvent } from "../../content/career";
import { PERSON_NAME } from "./identity";
import { sentence } from "./project-lede";

/** A stint still running reads in the present tense. Pure. */
function isCurrent(event: CareerEvent): boolean {
  return /present/i.test(event.dates);
}

/**
 * The answer-first lede for a career page: who, in what role, where and when,
 * then the headline result — the same shape as the project pages. Built from
 * fields the page already renders; `event.lede` overrides only the first
 * sentence, for events the template would misstate. Pure.
 */
export function careerLede(event: CareerEvent): string {
  // An org that already ends in a parenthetical ("LvlUp Ventures (Shopline-backed
  // seed fund)") takes its dates after a comma, never a second bracket.
  const when = event.org.endsWith(")") ? `, ${event.dates}` : ` (${event.dates})`;
  const opening =
    event.lede ??
    `${PERSON_NAME} ${isCurrent(event) ? "serves" : "served"} as ${event.role} at ${event.org}${when}.`;
  return `${opening} ${sentence(`Result: ${event.result}`)}`;
}
