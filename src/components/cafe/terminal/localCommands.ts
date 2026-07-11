/**
 * Client-side local commands for the café terminal (E11).
 *
 * These commands are handled entirely on the client and NEVER hit the API:
 * `help`, `about`, `projects`, `contact`, `clear`, `exit`. Anything else is a
 * chat message routed to /api/cafe-terminal.
 *
 * The resolver is a PURE function (no DOM, no network) so it can be unit-tested
 * directly — see tests/cafe-terminal-route.test.ts. It returns a discriminated
 * result the hook interprets: print themed lines, clear the log, close the
 * terminal, or fall through to the model.
 */

import { cars } from "../../../../content/cars";
import { joinControls, statusChips } from "../../../../content/lobby";

/** Outcome of resolving a line of input against the local command table. */
export type LocalCommandResult =
  | { kind: "chat"; text: string }
  | { kind: "print"; lines: readonly string[] }
  | { kind: "clear" }
  | { kind: "exit" };

/** The recognised local command verbs (also surfaced by `help`). */
export const LOCAL_COMMANDS = [
  "help",
  "about",
  "projects",
  "contact",
  "clear",
  "exit",
] as const;

export type LocalCommand = (typeof LOCAL_COMMANDS)[number];

function isLocalCommand(word: string): word is LocalCommand {
  return (LOCAL_COMMANDS as readonly string[]).includes(word);
}

/** `help` output — the command list plus a nudge that free text just chats. */
function helpLines(): readonly string[] {
  return [
    "AVAILABLE COMMANDS",
    "  help      show this list",
    "  about     what this terminal is",
    "  projects  list the featured builds",
    "  contact   how to reach Surya",
    "  clear     wipe the screen",
    "  exit      leave the terminal",
    "",
    "Or just type a question — I'll answer from Surya's portfolio.",
  ];
}

/** `about` output — in-character description of the terminal. */
function aboutLines(): readonly string[] {
  const availability = statusChips.map((s) => s.label).join(" / ");
  return [
    "CAFE-OS v2.2 — house terminal, GT Cafe.",
    "I answer questions about Surya Pugazhenthi's projects, skills, and how to",
    "reach him, grounded in this site's real content.",
    "",
    `Status: ${availability}.`,
  ];
}

/** `projects` output — the browsable builds, from content/cars.ts (no network). */
function projectsLines(): readonly string[] {
  const lines: string[] = ["FEATURED BUILDS"];
  for (const car of cars) {
    if (car.status === "locked") continue;
    const tag = car.tagline ? ` — ${car.tagline}` : "";
    lines.push(`  ${car.name}${tag}`);
  }
  lines.push("");
  lines.push("Open the Garage to inspect any of them in 3D.");
  return lines;
}

/** `contact` output — the real links from content/lobby.ts. */
function contactLines(): readonly string[] {
  const lines: string[] = ["REACH SURYA"];
  for (const control of joinControls) {
    lines.push(`  ${control.label.padEnd(9)}${control.href}`);
  }
  return lines;
}

/**
 * Resolve one line of terminal input. Trims and lowercases only the leading
 * verb for command matching; unknown input passes through as a chat message
 * with its original text. Pure and deterministic.
 */
export function resolveLocalCommand(input: string): LocalCommandResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    // Empty line: nothing to send, nothing to print.
    return { kind: "print", lines: [] };
  }

  const verb = trimmed.split(/\s+/)[0].toLowerCase();
  if (!isLocalCommand(verb)) {
    return { kind: "chat", text: trimmed };
  }

  switch (verb) {
    case "help":
      return { kind: "print", lines: helpLines() };
    case "about":
      return { kind: "print", lines: aboutLines() };
    case "projects":
      return { kind: "print", lines: projectsLines() };
    case "contact":
      return { kind: "print", lines: contactLines() };
    case "clear":
      return { kind: "clear" };
    case "exit":
      return { kind: "exit" };
  }
}
