import type { Car } from "../../content/cars";
import { PERSON_NAME } from "./identity";

/** End a fragment with a full stop unless it already carries punctuation. */
export function sentence(text: string): string {
  return /[.!?…]$/.test(text) ? text : `${text}.`;
}

/**
 * The answer-first lede for a project page: what it is, who built it and
 * when, and the headline result. Built only from fields the spec sheet
 * already renders. Pure.
 */
export function projectLede(car: Car): string {
  const role = car.team?.find((m) => m.name === PERSON_NAME)?.role;
  const builtBy = `Built by ${PERSON_NAME}${role ? ` (${role})` : ""}${car.raced ? `, ${car.raced}` : ""}.`;
  return [
    car.tagline && sentence(car.tagline),
    builtBy,
    car.lapRecord && sentence(`Result: ${car.lapRecord}`),
  ]
    .filter(Boolean)
    .join(" ");
}
