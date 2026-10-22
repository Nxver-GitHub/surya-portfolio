/**
 * The one JSON response shape every admin API path returns — success, the
 * Set-Cookie paths, and every 401/403/429/503 refusal alike.
 *
 * `Cache-Control: private, no-store` on all of them: admin responses carry the
 * session cookie or owner-only data, and a refusal is just as user-specific,
 * so no shared cache (Cloudflare, a corporate proxy) and no browser history
 * snapshot may keep any of them. Kept in its own dependency-free module so the
 * session guard, the Access check and each route share it without importing
 * one another.
 */

export const ADMIN_CACHE_CONTROL = "private, no-store";

/**
 * JSON response with the admin cache policy. `extra` is copied through a
 * `Headers`, so a caller can pass several `set-cookie` values (appended on a
 * `Headers` instance) — a plain object can hold only one. content-type and
 * cache-control are always set last, so a caller cannot weaken either.
 */
export function adminJson(
  body: unknown,
  status: number,
  extra?: HeadersInit,
): Response {
  const headers = new Headers(extra);
  headers.set("content-type", "application/json");
  headers.set("cache-control", ADMIN_CACHE_CONTROL);
  return new Response(JSON.stringify(body), { status, headers });
}
