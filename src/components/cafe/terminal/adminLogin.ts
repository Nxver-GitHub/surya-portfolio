/**
 * adminLogin — client auth for the café terminal admin console (E11).
 *
 * The password step of the login flow submits the entered passphrase to the
 * real, server-side, rate-limited auth route (`/api/admin/login`, shipped in
 * PR #37). The route sets an httpOnly session cookie on success — JS can never
 * read it, so we rely on the browser sending it automatically with same-origin
 * requests thereafter.
 *
 * SECURITY: the passphrase is passed straight into the request body and never
 * stored, echoed, or logged. Callers echo a MASKED line only. This module maps
 * the route's status codes to an in-character outcome; the pure transition
 * helper turns that outcome into scrollback lines + the next login state, so it
 * is unit-testable with a mocked fetch.
 */

import { makeLine, type TerminalLine } from "./terminalLines";
import { LOGIN_PROMPT } from "./loginMachine";
import type { LoginState } from "./terminalSession";

/** The server auth endpoints (shipped on main — do not modify server code). */
export const ADMIN_LOGIN_PATH = "/api/admin/login";
export const ADMIN_LOGOUT_PATH = "/api/admin/logout";

/** Minimal fetch shape so tests can inject a mock without a DOM. */
export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

/** In-character outcome of a login attempt, derived from the HTTP status. */
export type AdminLoginOutcome =
  | "granted" // 200 — session cookie set, enter admin console
  | "denied" // 401 — wrong passphrase
  | "cooldown" // 429 — rate limited (per-IP or global)
  | "unconfigured" // 503 — admin console not set up on this deployment
  | "error"; // network failure or unexpected status

export interface AdminLoginResult {
  readonly outcome: AdminLoginOutcome;
  /** Present on `cooldown`, when the server advertises a retry window. */
  readonly retryAfterSeconds?: number;
}

/** Best-effort read of the retry window from a 429 (header or JSON body). Never
 * throws. Returns undefined when nothing usable is present. */
async function readRetryAfter(response: Response): Promise<number | undefined> {
  const header = response.headers.get("retry-after");
  if (header) {
    const n = Number(header);
    if (Number.isFinite(n) && n > 0) return Math.ceil(n);
  }
  try {
    const body = (await response.json()) as { retryAfterSeconds?: unknown };
    if (typeof body.retryAfterSeconds === "number" && body.retryAfterSeconds > 0) {
      return Math.ceil(body.retryAfterSeconds);
    }
  } catch {
    // no/invalid JSON body — fine, the window is optional
  }
  return undefined;
}

/**
 * POST the passphrase to the real auth route. Never stores or logs the secret.
 * Maps status → outcome. Any thrown/network error becomes `error` (fail safe:
 * we never treat an ambiguous failure as success).
 */
export async function requestAdminLogin(
  passphrase: string,
  fetchImpl: FetchLike = fetch,
): Promise<AdminLoginResult> {
  let response: Response;
  try {
    response = await fetchImpl(ADMIN_LOGIN_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ passphrase }),
    });
  } catch {
    return { outcome: "error" };
  }

  switch (response.status) {
    case 200:
      return { outcome: "granted" };
    case 401:
      return { outcome: "denied" };
    case 429: {
      const retryAfterSeconds = await readRetryAfter(response);
      return { outcome: "cooldown", retryAfterSeconds };
    }
    case 503:
      return { outcome: "unconfigured" };
    default:
      return { outcome: "error" };
  }
}

/** Clear the server session cookie. Idempotent; failures are swallowed (the
 * client state is cleared regardless). */
export async function requestAdminLogout(
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  try {
    await fetchImpl(ADMIN_LOGOUT_PATH, {
      method: "POST",
      credentials: "same-origin",
    });
  } catch {
    // best effort — the caller clears client admin state either way
  }
}

/** The scrollback lines + next login state produced by a login outcome. */
export interface AdminLoginTransition {
  readonly next: LoginState;
  readonly lines: readonly TerminalLine[];
}

/**
 * Pure mapping from a login result to what the terminal shows next. Kept apart
 * from the fetch so it is trivially unit-testable.
 *
 *   granted      → admin console
 *   denied       → stay on the password prompt, offer another try
 *   cooldown     → drop to the login line (further tries are pointless now)
 *   unconfigured → drop to the login line, framed as intentional (not broken)
 *   error        → stay on the password prompt, offer another try
 */
export function adminLoginTransition(
  result: AdminLoginResult,
): AdminLoginTransition {
  switch (result.outcome) {
    case "granted":
      return {
        next: "admin",
        lines: [
          makeLine("system", "root access granted — CAFE-OS admin console."),
          makeLine("system", "type 'help' for admin commands."),
        ],
      };
    case "denied":
      return {
        next: "password",
        lines: [
          makeLine("error", "ACCESS DENIED — invalid passphrase."),
          makeLine("system", "password:"),
        ],
      };
    case "cooldown": {
      const suffix =
        result.retryAfterSeconds && result.retryAfterSeconds > 0
          ? ` retry in ~${result.retryAfterSeconds}s.`
          : "";
      return {
        next: "login",
        lines: [
          makeLine("error", `TOO MANY ATTEMPTS — cooldown active.${suffix}`),
          makeLine("system", LOGIN_PROMPT),
        ],
      };
    }
    case "unconfigured":
      return {
        next: "login",
        lines: [
          makeLine("system", "admin console not configured on this deployment."),
          makeLine("system", LOGIN_PROMPT),
        ],
      };
    case "error":
      return {
        next: "password",
        lines: [
          makeLine("error", "SIGNAL LOST — login failed. Try again."),
          makeLine("system", "password:"),
        ],
      };
  }
}
