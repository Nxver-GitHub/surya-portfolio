/**
 * POST /api/admin/logout — clear the admin session cookie.
 *
 * Idempotent and unauthenticated: clearing a cookie can only ever reduce access,
 * so it needs no guard. Returns a Set-Cookie that expires the session cookie
 * immediately (Max-Age=0, same flags as when it was set).
 */

import { buildClearCookie } from "@/lib/adminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": buildClearCookie(),
    },
  });
}
