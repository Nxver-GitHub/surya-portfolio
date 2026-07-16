/**
 * adminSuperset — the admin-console input router (E11).
 *
 * The admin account is a full SUPERSET of the guest account: a logged-in admin
 * can run admin commands, run the guest commands, AND chat with the model. This
 * pure function encodes that precedence in ONE testable place:
 *
 *   admin command  →  guest local command  →  chat
 *
 * It only falls through to the guest shell when the input is NOT a recognised
 * admin command (resolveAdminCommand returns "unknown"). Everything else — the
 * admin verbs, plus `help`/`clear` which admin owns — resolves as admin. No DOM,
 * no network; the hook interprets the result exactly as it does the guest one.
 */

import { resolveAdminCommand, type AdminCommandResult } from "./adminCommands";
import { resolveLocalCommand, type LocalCommandResult } from "./localCommands";

/** Where a line of admin-console input routes to. */
export type AdminSupersetRoute =
  | { readonly kind: "admin"; readonly result: AdminCommandResult }
  | { readonly kind: "guest"; readonly result: LocalCommandResult };

/**
 * Route one line of admin-console input. Pure and deterministic. A recognised
 * admin command (including `help`/`clear`, and empty input) resolves as admin;
 * anything the admin table doesn't recognise falls through to the guest shell,
 * where it is a guest command (about/projects/contact/exit) or a chat message.
 */
export function routeAdminInput(input: string): AdminSupersetRoute {
  const admin = resolveAdminCommand(input);
  if (admin.kind !== "unknown") return { kind: "admin", result: admin };
  return { kind: "guest", result: resolveLocalCommand(input) };
}
