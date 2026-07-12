/**
 * loginMachine — the boot login fiction (E11), as a pure step function.
 *
 * Boot ends at `CAFE-OS login:`. `guest` (or an empty Enter) starts the guest
 * shell; `admin` moves to a password prompt whose every submission is denied
 * in character (there is NO real auth here — the admin console is a future,
 * properly-authenticated story). Pure: (state, input) → (next state, lines).
 *
 * CONTRACT STUB for the parallel build — the full fiction lands in the
 * term/pure workstream. This stub logs every input straight into the guest
 * shell so dependent workstreams compile and run.
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

/** Advance the login fiction by one submitted input. Pure. */
export function handleLoginInput(
  current: LoginState,
  input: string,
): LoginStepResult {
  void input;
  if (current === "authed") return { next: "authed", lines: [] };
  // STUB: everyone is a guest. Full guest/admin/denied flow replaces this.
  return {
    next: "authed",
    lines: [makeLine("system", "guest session started. type 'help' or ask a question.")],
  };
}
