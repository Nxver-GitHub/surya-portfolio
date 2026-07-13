/**
 * Map a transport error into a themed terminal line (E11).
 *
 * When the API returns a non-2xx status, the AI SDK's DefaultChatTransport
 * throws `new Error(await response.text())` — i.e. the error's message is our
 * JSON error body (e.g. `{"error":"RATE_LIMITED","retryAfterSeconds":12}`).
 * This pure helper parses that message and returns the right themed line, so
 * users see "RATE LIMIT — cool your tyres…" instead of a raw error. Pure and
 * DOM-free for unit testing.
 */

import { THEMED } from "./terminalLines";

/** Known server error codes (kept in sync with route.ts). */
export type TerminalErrorCode =
  | "RATE_LIMITED"
  | "SYSTEM_BUSY"
  | "TERMINAL_OFFLINE"
  | "BAD_REQUEST";

/** Extract a known error code from an error message that may contain our JSON
 * body, or a bare code. Returns null when nothing recognisable is found. */
export function parseErrorCode(message: string): TerminalErrorCode | null {
  // Try JSON first (the common transport case).
  try {
    const parsed = JSON.parse(message) as { error?: unknown };
    if (typeof parsed.error === "string" && isKnownCode(parsed.error)) {
      return parsed.error;
    }
  } catch {
    // not JSON — fall through to substring scan
  }
  for (const code of [
    "RATE_LIMITED",
    "TERMINAL_OFFLINE",
    "SYSTEM_BUSY",
    "BAD_REQUEST",
  ] as const) {
    if (message.includes(code)) return code;
  }
  return null;
}

function isKnownCode(value: string): value is TerminalErrorCode {
  return (
    value === "RATE_LIMITED" ||
    value === "SYSTEM_BUSY" ||
    value === "TERMINAL_OFFLINE" ||
    value === "BAD_REQUEST"
  );
}

/**
 * Turn an unknown error (from useChat's onError) into a single themed line.
 * Never throws; always returns a friendly, in-character string.
 */
export function themedErrorLine(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const code = parseErrorCode(message);
  switch (code) {
    case "RATE_LIMITED":
      return THEMED.rateLimited;
    case "TERMINAL_OFFLINE":
      return THEMED.terminalOffline;
    case "SYSTEM_BUSY":
      return THEMED.systemBusy;
    case "BAD_REQUEST":
    case null:
      return THEMED.genericError;
  }
}
