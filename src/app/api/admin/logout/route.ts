/**
 * POST /api/admin/logout — clear the admin session cookie.
 *
 * Idempotent and unauthenticated: clearing a cookie can only ever reduce access,
 * so it needs no authorization. Returns a Set-Cookie that expires the session
 * cookie immediately (Max-Age=0, same flags as when it was set).
 *
 * It DOES need the same-origin guard, though — the cookie is SameSite=Strict on
 * the way in but a cross-site POST still reaches this handler, which is enough
 * for any page to force-logout the owner mid-session. No body is read here, so
 * there is nothing to cap.
 */

import { buildClearCookie } from "@/lib/adminSession";
import { hasTrustedOrigin } from "@/lib/requestGuards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  if (!hasTrustedOrigin(request)) {
    return new Response(JSON.stringify({ error: "FORBIDDEN" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": buildClearCookie(),
    },
  });
}
