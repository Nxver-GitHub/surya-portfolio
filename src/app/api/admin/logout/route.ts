/**
 * POST /api/admin/logout — end the admin session, server-side and in the browser.
 *
 * Always clears the session cookie (Max-Age=0, same flags as when it was set).
 * Clearing a cookie can only ever reduce access, so that part needs no
 * authorization.
 *
 * REVOCATION: when — and only when — the request carries a VALID, CURRENT
 * session, the session epoch in Upstash is advanced (see lib/adminSession),
 * which kills every outstanding token, including copies of this one. An
 * unauthenticated logout never touches the epoch: otherwise anyone could
 * force-logout the owner just by POSTing here. If the epoch cannot be advanced
 * (Redis down) the response is 503 SYSTEM_BUSY — the cookie is still cleared,
 * but the caller is told the server-side revocation did not happen.
 *
 * It DOES need the same-origin guard — the cookie is SameSite=Strict on the way
 * in but a cross-site POST still reaches this handler. No body is read here, so
 * there is nothing to cap.
 *
 * On success only, the response also carries `Clear-Site-Data: "cookies"`.
 * Deliberately scoped to "cookies" alone — NOT "storage" and NOT "*". This site
 * keeps visitor preferences in localStorage (CRT mode, sound/BGM prefs, and the
 * café terminal's own session — see src/components/cafe/terminal/terminalSession.ts)
 * that belong to the browser, not the admin session, and must survive an admin
 * logout. Clearing "storage" or "*" would wipe them for no security benefit.
 */

import {
  buildClearCookie,
  sessionConfigFromEnv,
  sessionTokenFrom,
  verifyCurrentSession,
  type SessionConfig,
} from "@/lib/adminSession";
import { errorMessage } from "@/lib/logging";
import { hasTrustedOrigin } from "@/lib/requestGuards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status: number, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

/**
 * Advance the epoch iff `request` carries a valid current session. Resolves
 * "revoked", "skipped" (nothing valid to revoke) or "failed" (Redis error while
 * revoking). Never throws. Exported for tests, which inject `config`.
 */
export async function revokeIfAuthenticated(
  request: Request,
  config: SessionConfig | null,
): Promise<"revoked" | "skipped" | "failed"> {
  if (!config) return "skipped";
  const check = await verifyCurrentSession(sessionTokenFrom(request), config.key, config.store);
  if (check.status !== "valid") return "skipped";
  try {
    await config.store.bump();
    return "revoked";
  } catch (error) {
    console.error("[admin-logout] session epoch error", errorMessage(error));
    return "failed";
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!hasTrustedOrigin(request)) {
    return json({ error: "FORBIDDEN" }, 403);
  }

  let config: SessionConfig | null;
  try {
    config = sessionConfigFromEnv();
  } catch {
    config = null;
  }
  const outcome = await revokeIfAuthenticated(request, config);
  if (outcome === "failed") {
    return json({ error: "SYSTEM_BUSY" }, 503, { "set-cookie": buildClearCookie() });
  }
  return json({ ok: true }, 200, {
    "set-cookie": buildClearCookie(),
    // "cookies" only — see the header comment above for why not "storage"/"*".
    "clear-site-data": '"cookies"',
  });
}
