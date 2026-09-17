/**
 * adminData — client fetch of the admin telemetry payload (E11).
 *
 * GETs `/api/admin/data` (shipped on main). The admin session cookie is
 * httpOnly, so JS can't attach it; a same-origin request sends it automatically.
 *
 * We import the response TYPE ONLY from the route module. A value import would
 * pull the route's server-only dependencies (node:crypto via adminSession,
 * @upstash/redis, etc.) into the client bundle; `import type` is erased at
 * compile time, so we honour the single-source-of-truth contract without
 * shipping server code. A small structural guard validates the untrusted
 * response at the boundary before any command formats it.
 */

import type { AdminDataResponse } from "@/app/api/admin/data/route";
import { fetchAdminEndpoint, type FetchLike } from "./adminFetch";

export const ADMIN_DATA_PATH = "/api/admin/data";

export type { AdminDataResponse, FetchLike };

export type AdminDataFetch =
  | { readonly ok: true; readonly data: AdminDataResponse }
  | { readonly ok: false; readonly reason: "expired" | "error" | "access_required" };

/** Structural boundary check for the untrusted response. Not a re-declaration
 * of the server schema — just enough shape validation to fail safe before the
 * formatters read fields. */
export function isAdminDataResponse(value: unknown): value is AdminDataResponse {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  return (
    Array.isArray(o.logs) &&
    typeof o.stats === "object" &&
    o.stats !== null &&
    typeof o.sysinfo === "object" &&
    o.sysinfo !== null
  );
}

/**
 * Fetch the admin telemetry. A 401 means the 24h session expired mid-use →
 * `expired` (the caller drops to the login line). Cloudflare Access blocking
 * the request (see adminFetch.ts) → `access_required` (the caller stays put
 * and tells the visitor to authenticate with Access in another tab).
 * Anything else non-200, a malformed body, or a network failure → `error`.
 * Never throws.
 */
export async function fetchAdminData(
  fetchImpl: FetchLike = fetch,
): Promise<AdminDataFetch> {
  const outcome = await fetchAdminEndpoint(
    ADMIN_DATA_PATH,
    {
      method: "GET",
      credentials: "same-origin",
      headers: { accept: "application/json" },
    },
    fetchImpl,
  );
  if (outcome.kind === "network_error") return { ok: false, reason: "error" };
  if (outcome.kind === "access_required") {
    return { ok: false, reason: "access_required" };
  }

  const response = outcome.response;
  if (response.status === 401) return { ok: false, reason: "expired" };
  if (response.status !== 200) return { ok: false, reason: "error" };

  try {
    const body: unknown = await response.json();
    if (!isAdminDataResponse(body)) return { ok: false, reason: "error" };
    return { ok: true, data: body };
  } catch {
    return { ok: false, reason: "error" };
  }
}
