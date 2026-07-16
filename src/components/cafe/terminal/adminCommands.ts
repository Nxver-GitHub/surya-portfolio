/**
 * adminCommands — the admin console command table + output formatters (E11).
 *
 * Reached only after a verified login (login state === "admin"). Resolution is
 * a PURE function (no DOM, no network) returning a discriminated result the
 * hook interprets: print themed lines, request a data fetch, clear, or log out.
 * The formatters are pure too — they take the typed `/api/admin/data` payload
 * and return aligned, DOS/BIOS-flavored scrollback lines.
 *
 * SECURITY: guest question text in `logs` is attacker-controlled. Every log row
 * is built with `makeRawLine` (verbatim) so the renderer bypasses the allowlist
 * linkifier and prints the question as literal, escaped characters only — no
 * substring can become a link and no markup can ever be honoured. The
 * escaped-rendering guarantee is covered by tests/terminal-admin-xss.test.ts.
 */

import {
  makeLine,
  makeLines,
  makeRawLine,
  type TerminalLine,
} from "./terminalLines";
import type { AdminDataResponse } from "./adminData";

/** The recognised admin command verbs (also surfaced by `help`). */
export const ADMIN_COMMANDS = [
  "logs",
  "stats",
  "sysinfo",
  "uptime",
  "help",
  "clear",
  "logout",
] as const;

export type AdminCommand = (typeof ADMIN_COMMANDS)[number];

/** Verbs that require a fetch of `/api/admin/data`. */
export type AdminDataCommand = "logs" | "stats" | "sysinfo" | "uptime";

/** Outcome of resolving a line of admin input. */
export type AdminCommandResult =
  | { kind: "data"; command: AdminDataCommand }
  | { kind: "print"; lines: readonly TerminalLine[] }
  | { kind: "clear" }
  | { kind: "logout" }
  | { kind: "unknown"; input: string }
  | { kind: "empty" };

const DATA_COMMANDS: readonly AdminDataCommand[] = [
  "logs",
  "stats",
  "sysinfo",
  "uptime",
];

function isDataCommand(verb: string): verb is AdminDataCommand {
  return (DATA_COMMANDS as readonly string[]).includes(verb);
}

/** `help` output — the admin command list. Not attacker-controlled. */
export function adminHelpLines(): readonly TerminalLine[] {
  return makeLines("system", [
    "ADMIN COMMANDS",
    "  logs      recent guest questions (newest first)",
    "  stats     views by route + chats/day (7d)",
    "  sysinfo   build sha, deploy time, runtime",
    "  uptime    time since last deploy",
    "  help      show this list",
    "  clear     wipe the screen",
    "  logout    end the admin session",
  ]);
}

/**
 * Resolve one line of admin input. Trims, lowercases only the leading verb.
 * Pure and deterministic.
 */
export function resolveAdminCommand(input: string): AdminCommandResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) return { kind: "empty" };

  const verb = trimmed.split(/\s+/)[0].toLowerCase();
  if (isDataCommand(verb)) return { kind: "data", command: verb };
  if (verb === "help") return { kind: "print", lines: adminHelpLines() };
  if (verb === "clear") return { kind: "clear" };
  if (verb === "logout") return { kind: "logout" };
  return { kind: "unknown", input: trimmed };
}

/* ─────────────────────────── formatting helpers ─────────────────────────── */

/** A short, human relative timestamp: "just now", "5m ago", "3h ago", "2d ago". */
export function relativeTimestamp(then: number, now: number): string {
  const deltaMs = Math.max(0, now - then);
  const s = Math.floor(deltaMs / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/** Compact elapsed duration, e.g. "2d 03h 14m". Clamps negatives to zero. */
export function formatElapsed(fromMs: number, toMs: number): string {
  const totalMin = Math.max(0, Math.floor((toMs - fromMs) / 60000));
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const hh = String(hours).padStart(2, "0");
  const mm = String(mins).padStart(2, "0");
  return days > 0 ? `${days}d ${hh}h ${mm}m` : `${hh}h ${mm}m`;
}

/**
 * The guest-question log, newest first (the route already returns it newest
 * first). Each row is VERBATIM — attacker-controlled text is rendered literally.
 */
export function formatLogs(
  logs: AdminDataResponse["logs"],
  now: number,
): readonly TerminalLine[] {
  const header = makeLine("system", "GUEST QUESTION LOG — newest first");
  if (logs.length === 0) {
    return [header, makeLine("system", "  (no questions logged)")];
  }
  const rows = logs.map((entry) => {
    const stamp = `[${relativeTimestamp(entry.t, now).padStart(8)}]`;
    // makeRawLine → verbatim: the question is never linkified or parsed.
    return makeRawLine("user", `${stamp}  ${entry.q}`);
  });
  return [header, ...rows];
}

/** Right-pad `value` to `width` (monospace column alignment). */
function padCol(value: string, width: number): string {
  return value.length >= width ? value : value + " ".repeat(width - value.length);
}

/** Views-by-route + chats/day, in aligned columns. Never attacker-controlled
 * (route names come from the server allowlist; days/counts are numeric). */
export function formatStats(
  stats: AdminDataResponse["stats"],
): readonly TerminalLine[] {
  const lines: string[] = ["VIEWS BY ROUTE (7d)"];
  const routes = Object.keys(stats.viewsByRoute7d);
  if (routes.length === 0) {
    lines.push("  (no views recorded)");
  } else {
    const width = Math.max(...routes.map((r) => r.length)) + 2;
    for (const route of routes) {
      const count = String(stats.viewsByRoute7d[route]).padStart(6);
      lines.push(`  ${padCol(route, width)}${count}`);
    }
  }

  lines.push("");
  lines.push("CHATS PER DAY (7d)");
  if (stats.chatsPerDay7d.length === 0) {
    lines.push("  (no chats recorded)");
  } else {
    for (const { day, count } of stats.chatsPerDay7d) {
      const bar = "#".repeat(Math.min(count, 40));
      lines.push(`  ${padCol(day, 12)}${String(count).padStart(5)}  ${bar}`);
    }
  }
  return makeLines("system", lines);
}

/** Build sysinfo. Values are server-owned build metadata, not user input. */
export function formatSysinfo(
  sysinfo: AdminDataResponse["sysinfo"],
): readonly TerminalLine[] {
  const sha = sysinfo.sha === "dev" ? "dev" : sysinfo.sha.slice(0, 7);
  return makeLines("system", [
    "SYSTEM INFO",
    `  build sha    ${sha}`,
    `  deployed at  ${sysinfo.deployedAt}`,
    `  node         ${sysinfo.node}`,
    "  framework    Next.js (App Router)",
  ]);
}

/** Uptime since the deployed-at timestamp. */
export function formatUptime(
  sysinfo: AdminDataResponse["sysinfo"],
  now: number,
): readonly TerminalLine[] {
  const deployedMs = Date.parse(sysinfo.deployedAt);
  if (Number.isNaN(deployedMs)) {
    return makeLines("system", [
      "UPTIME",
      "  deploy time unavailable.",
    ]);
  }
  return makeLines("system", [
    "UPTIME",
    `  since     ${sysinfo.deployedAt}`,
    `  elapsed   ${formatElapsed(deployedMs, now)}`,
  ]);
}
