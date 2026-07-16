/**
 * loginMachine — the boot login flow (E11), as a pure step function.
 *
 * Boot ends at `CAFE-OS login:`. `guest` (or an empty Enter) starts the guest
 * shell; `admin` moves to a password prompt. The password SUBMISSION itself is
 * NOT handled here — it is async (verified against /api/admin/login) and owned
 * by adminLogin.ts + useTerminalChat. This step function stays pure and covers
 * only the synchronous account-selection transitions:
 * (state, input) → (next state, lines).
 */

import { makeLine, type TerminalLine } from "./terminalLines";
import type { LoginState } from "./terminalSession";

/** The prompt line shown when the terminal awaits an account name. */
export const LOGIN_PROMPT = "CAFE-OS login: (type 'guest' or press Enter)";

/** Result of feeding one input line to the login step. */
export interface LoginStepResult {
  readonly next: LoginState;
  /** Lines to append to the scrollback (echo + response). */
  readonly lines: readonly TerminalLine[];
}

/** Normalize submitted input for account/command matching: trim + lowercase. */
function normalize(input: string): string {
  return input.trim().toLowerCase();
}

/** Advance the login fiction by one submitted input. Pure. */
export function handleLoginInput(
  current: LoginState,
  input: string,
): LoginStepResult {
  // Authed guest shell and authed admin console are terminal steps here; the
  // password submission is verified asynchronously elsewhere (adminLogin.ts),
  // so this pure step never resolves it — it is a no-op passthrough.
  if (current === "authed" || current === "admin" || current === "password") {
    return { next: current, lines: [] };
  }

  // current === "login"
  const account = normalize(input);

  if (account === "" || account === "guest") {
    return {
      next: "authed",
      lines: [
        makeLine("prompt", "login: guest"),
        makeLine("system", "guest session started. type 'help' or ask a question."),
      ],
    };
  }

  if (account === "admin") {
    return {
      next: "password",
      lines: [makeLine("prompt", "login: admin"), makeLine("system", "password:")],
    };
  }

  return {
    next: "login",
    lines: [
      makeLine("prompt", `login: ${input.trim()}`),
      makeLine("error", `unknown account '${input.trim()}' — guest services only.`),
    ],
  };
}
