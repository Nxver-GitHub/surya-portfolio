/**
 * meetup — the "can I meet Surya" booking line. Pure helpers, mirroring the
 * portrait (portrait.ts) and café-origin (cafeOrigin.ts) seams.
 *
 * When the visitor asks to meet / book a call / grab coffee / attend office
 * hours, the log instantly shows a clickable Calendly line (the URL is
 * allowlisted by linkify.ts because it lives in content/lobby.ts
 * joinControls). The question still goes to the model, which also knows the
 * link via the contact block in the system prompt — the instant line just
 * guarantees the booking path even if the model omits it or errors.
 */

import { joinControls } from "../../../../content/lobby";
import { makeLine, type TerminalLine } from "./terminalLines";

/** The Calendly booking URL, sourced from lobby content (single source). */
export const BOOKING_URL =
  joinControls.find((c) => c.channel === "calendly")?.href ?? "";

/**
 * Does this submitted chat text ask to meet / schedule time with the owner?
 * Deliberately moderate like the sibling matchers: a false positive just
 * shows a harmless booking line next to the model's answer.
 */
export function isMeetupRequest(text: string): boolean {
  // Direct booking vocabulary stands alone…
  if (/\b(office\s*hours|calendly|book\s+a\s+(call|meeting|slot))\b/i.test(text)) {
    return true;
  }
  // …otherwise require an arranging verb + a meeting noun ("schedule a
  // call", "grab coffee", "set up a chat")…
  if (
    /\b(book|schedule|arrange|set\s*up|grab|hop\s+on|request|plan)\b[\s\S]*\b(call|meeting|meet|chat|coffee|time|sync)\b/i.test(
      text,
    )
  ) {
    return true;
  }
  // …or meeting him directly ("can I meet surya", "meet up with you?").
  return /\b(meet(\s+up)?|talk|speak|coffee|call)\b[\s\S]*\b(surya|you|him)\b/i.test(
    text,
  );
}

/** Build the instant booking lines for the scrollback. */
export function makeMeetupLines(): TerminalLine[] {
  return [
    makeLine("system", "BOOKING CHANNEL OPEN — grab a slot:"),
    makeLine("system", `  ${BOOKING_URL}`),
  ];
}
