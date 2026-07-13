/**
 * loginMachine — the boot login fiction (E11), as a pure step function.
 *
 * Boot ends at `CAFE-OS login:`. `guest` (or an empty Enter) starts the guest
 * shell; `admin` moves to a password prompt whose every submission is denied
 * in character (there is NO real auth here — the admin console is a future,
 * properly-authenticated story). Pure: (state, input) → (next state, lines).
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
  if (current === "authed") return { next: "authed", lines: [] };

  if (current === "password") {
    // Every password is denied in character — there is no real admin auth here.
    return {
      next: "login",
      lines: [
        makeLine("prompt", "password: ••••••"),
        makeLine("error", "ACCESS DENIED — admin console offline. guest services only."),
        makeLine("system", LOGIN_PROMPT),
      ],
    };
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
