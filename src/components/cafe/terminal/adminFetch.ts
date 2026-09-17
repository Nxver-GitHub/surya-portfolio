/**
 * adminFetch — shared low-level fetch wrapper for every `/api/admin/*` call
 * the terminal client makes (adminLogin.ts, adminData.ts).
 *
 * CLOUDFLARE ACCESS CONTEXT: the owner plans to put Cloudflare Access in
 * front of `suryapugaz.com/api/admin/*` as a second layer ahead of the app's
 * own passphrase. When the visitor has no (or an expired) Access session,
 * Access responds to that request with a 302 to `<team>.cloudflareaccess.com`
 * instead of ever reaching this app's route. A plain `fetch` follows that
 * redirect automatically and cross-origin, which either:
 *   - throws a network-ish TypeError (opaque redirect blocked by CORS), or
 *   - "succeeds" with Access's own HTML login page as the body, which then
 *     breaks whatever `response.json()` call expected the real API shape.
 *
 * Neither is a clean signal a caller can act on, so every admin request goes
 * through `redirect: "manual"` here instead. That turns a same-origin
 * request whose redirect target is cross-origin into an "opaque redirect"
 * response (`response.type === "opaqueredirect"`, no readable status/body) —
 * a value we can detect and turn into one distinct `access_required` outcome.
 * As a defensive fallback (some proxies quietly rewrite a redirect into a 200
 * HTML page rather than a real redirect fetch can see as opaque), a 2xx
 * response on an admin route whose content-type isn't JSON is treated the
 * same way — this route family never legitimately returns anything else.
 *
 * ALSO NOTE: `Clear-Site-Data: "cookies"` on `/api/admin/logout` (see that
 * route) clears every cookie on suryapugaz.com, Access's own `CF_Authorization`
 * included — so this "no Access session" state is expected to recur after
 * every admin logout, not just from a session naturally expiring. Callers
 * should treat `access_required` as a routine, actionable state, not an error.
 *
 * Does NOT touch the visitor-facing `/api/cafe-terminal` chat fetch, which is
 * never behind Access and is unaffected by any of this.
 */

/** Minimal fetch shape so tests can inject a mock without a DOM. */
export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export type AdminFetchOutcome =
  | { readonly kind: "response"; readonly response: Response }
  | { readonly kind: "access_required" }
  | { readonly kind: "network_error" };

/**
 * Fetch an `/api/admin/*` endpoint with the Access-aware handling described
 * above. Never throws — a network failure or a thrown redirect becomes
 * `network_error`. Forces `redirect: "manual"` regardless of what `init`
 * requests, since a caller-supplied `redirect` here would defeat the whole
 * point of this wrapper.
 */
export async function fetchAdminEndpoint(
  path: string,
  init: RequestInit,
  fetchImpl: FetchLike = fetch,
): Promise<AdminFetchOutcome> {
  let response: Response;
  try {
    response = await fetchImpl(path, { ...init, redirect: "manual" });
  } catch {
    return { kind: "network_error" };
  }

  if (response.type === "opaqueredirect") {
    return { kind: "access_required" };
  }

  // Defensive fallback — see the file header. A JSON-only route family
  // returning a 2xx with a non-JSON content-type is never legitimate.
  const contentType = response.headers.get("content-type") ?? "";
  if (response.ok && !contentType.includes("application/json")) {
    return { kind: "access_required" };
  }

  return { kind: "response", response };
}

/**
 * The in-character line shown when Access blocks a request. Built from the
 * caller-supplied origin (pass `window.location.origin`), never a hardcoded
 * host, so it reads correctly on preview/dev deployments too.
 */
export function accessRequiredMessage(origin: string): string {
  return `Access session missing or expired. Open ${origin}/api/admin/data in a new tab, sign in, then retry.`;
}
