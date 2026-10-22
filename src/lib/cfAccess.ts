/**
 * cfAccess — verify that Cloudflare Access actually ran (server-only).
 *
 * Access sits in front of `/api/admin/*` at the edge, but that is a dashboard
 * setting: if the Access app is deleted, its path is edited, or the Worker is
 * reached on a hostname Access does not cover (a preview URL), the passphrase
 * would be the only factor left. So the admin routes also check, in the Worker,
 * the JWT Access attaches to every request it lets through.
 *
 * WHAT IS CHECKED, FAIL CLOSED — any doubt is a denial, never a pass:
 *   - the `Cf-Access-Jwt-Assertion` request header is present and is a
 *     three-part compact JWS (the `CF_Authorization` cookie is NOT consulted:
 *     Access always injects the header on requests it proxies, so the cookie
 *     adds no coverage, only a second, browser-controlled input to parse);
 *   - header `alg` is exactly `RS256` (so `none`/`HS256` alg-confusion tokens
 *     are refused before any key is touched) and `kid` names a key in the
 *     team's JWKS at `https://<team>/cdn-cgi/access/certs`;
 *   - the RS256 signature verifies under that key (Web Crypto);
 *   - `iss` is exactly `https://<team>`, `aud` contains the app's AUD tag;
 *   - `exp` is in the future and `nbf` (if present) is not, both with
 *     {@link CLOCK_SKEW_SECONDS} of skew;
 *   - `email` equals the configured owner address, case-insensitively.
 *
 * JWKS are cached in module memory for {@link JWKS_TTL_MS}. A token naming an
 * unknown `kid` triggers ONE refetch (Access rotates keys), but at most every
 * {@link JWKS_MIN_REFETCH_MS}, so a stream of junk kids cannot turn this route
 * into a fetch amplifier. Any fetch or parse failure denies.
 *
 * Config (team domain, AUD tag, owner email) comes from env only — the email and
 * AUD are kept out of this public repo. No new dependency: Web Crypto does it.
 */

import { truncateIpForLog } from "@/lib/logging";

/** The request header Access sets on every request it lets through. */
export const ACCESS_JWT_HEADER = "cf-access-jwt-assertion";

/** How long a fetched JWKS is trusted before it is refetched. */
export const JWKS_TTL_MS = 10 * 60 * 1000;
/** Floor between two JWKS fetches forced by an unknown `kid`. */
export const JWKS_MIN_REFETCH_MS = 30 * 1000;
/** Allowed clock skew, applied to `exp` and `nbf`. */
export const CLOCK_SKEW_SECONDS = 30;
/** Hard cap on the token's length — a real Access JWT is well under 2 KB. */
export const MAX_TOKEN_CHARS = 8 * 1024;
/** Give up on a JWKS fetch after this long (then deny). */
export const JWKS_FETCH_TIMEOUT_MS = 5000;

/** Why a request was denied. Logged as-is; never the token itself. */
export type AccessDenyReason =
  | "missing_token"
  | "malformed"
  | "bad_alg"
  | "unknown_kid"
  | "bad_signature"
  | "bad_iss"
  | "bad_aud"
  | "expired"
  | "not_yet_valid"
  | "wrong_email"
  | "jwks_unavailable";

export interface AccessConfig {
  /** e.g. `example.cloudflareaccess.com` — no scheme, no path. */
  readonly teamDomain: string;
  /** The Access application's AUD tag. */
  readonly aud: string;
  /** The only identity allowed through. Compared case-insensitively. */
  readonly email: string;
}

/** The env vars this check needs. Runtime vars/secrets, never NEXT_PUBLIC. */
export interface AccessEnv {
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  ADMIN_ACCESS_EMAIL?: string;
}

const TEAM_DOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.cloudflareaccess\.com$/;

/**
 * Build the config from env, or null when any value is missing or the team
 * domain is not a `*.cloudflareaccess.com` host (a typo there must not point
 * the JWKS fetch somewhere else). Null means "not configured" → 503. Pure.
 */
export function accessConfigFromEnv(env: AccessEnv): AccessConfig | null {
  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN?.trim().toLowerCase();
  const aud = env.CF_ACCESS_AUD?.trim();
  const email = env.ADMIN_ACCESS_EMAIL?.trim();
  if (!teamDomain || !aud || !email) return null;
  if (!TEAM_DOMAIN_RE.test(teamDomain)) return null;
  return { teamDomain, aud, email };
}

/** Read the Access env from `process.env`. */
export function readAccessEnv(): AccessEnv {
  return {
    CF_ACCESS_TEAM_DOMAIN: process.env.CF_ACCESS_TEAM_DOMAIN,
    CF_ACCESS_AUD: process.env.CF_ACCESS_AUD,
    ADMIN_ACCESS_EMAIL: process.env.ADMIN_ACCESS_EMAIL,
  };
}

export type AccessVerifyResult =
  | { readonly ok: true; readonly email: string }
  | { readonly ok: false; readonly reason: AccessDenyReason };

/** Fetch a URL and return its parsed JSON body; throw on any failure. */
export type JsonFetcher = (url: string) => Promise<unknown>;

export interface AccessVerifierDeps {
  readonly fetchJson?: JsonFetcher;
  /** Epoch milliseconds. Injectable so tests control the clock. */
  readonly now?: () => number;
}

export interface AccessVerifier {
  verify(token: string | null | undefined, config: AccessConfig): Promise<AccessVerifyResult>;
}

/* ───────────────────────────── encoding helpers ───────────────────────── */

const B64URL_RE = /^[A-Za-z0-9_-]+$/;

function decodeSegment(segment: string): Uint8Array<ArrayBuffer> | null {
  if (!B64URL_RE.test(segment)) return null;
  return Uint8Array.from(Buffer.from(segment, "base64url"));
}

function decodeJsonSegment(segment: string): Record<string, unknown> | null {
  const bytes = decodeSegment(segment);
  if (!bytes) return null;
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/* ─────────────────────────────── JWKS cache ───────────────────────────── */

const RS256_IMPORT = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" } as const;

/** Import every usable RS256 key from a JWKS body. Throws if none are usable. */
async function importJwks(body: unknown): Promise<Map<string, CryptoKey>> {
  const list =
    body && typeof body === "object" && Array.isArray((body as { keys?: unknown }).keys)
      ? ((body as { keys: unknown[] }).keys)
      : null;
  if (!list) throw new Error("jwks: no keys array");

  const keys = new Map<string, CryptoKey>();
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const jwk = raw as Record<string, unknown>;
    if (jwk.kty !== "RSA" || typeof jwk.kid !== "string" || !jwk.kid) continue;
    if (typeof jwk.n !== "string" || typeof jwk.e !== "string") continue;
    if (jwk.alg !== undefined && jwk.alg !== "RS256") continue;
    if (jwk.use !== undefined && jwk.use !== "sig") continue;
    try {
      const key = await crypto.subtle.importKey(
        "jwk",
        { kty: "RSA", n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
        RS256_IMPORT,
        false,
        ["verify"],
      );
      keys.set(jwk.kid, key);
    } catch {
      // An unimportable key is skipped, never trusted.
    }
  }
  if (keys.size === 0) throw new Error("jwks: no usable RS256 keys");
  return keys;
}

async function defaultFetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(JWKS_FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`jwks: HTTP ${response.status}`);
  return response.json();
}

interface CacheEntry {
  readonly url: string;
  readonly keys: Map<string, CryptoKey>;
  readonly fetchedAt: number;
}

/* ─────────────────────────────── verifier ─────────────────────────────── */

/**
 * Create a verifier with its own JWKS cache. The app uses the module-level
 * {@link defaultAccessVerifier}; tests build their own with a fake fetch and
 * clock so cache state never leaks between them.
 */
export function createAccessVerifier(deps: AccessVerifierDeps = {}): AccessVerifier {
  const fetchJson = deps.fetchJson ?? defaultFetchJson;
  const now = deps.now ?? Date.now;
  let cache: CacheEntry | null = null;
  let lastFetchAt = Number.NEGATIVE_INFINITY;
  let inFlight: Promise<CacheEntry> | null = null;

  async function refresh(url: string): Promise<CacheEntry> {
    if (inFlight) return inFlight;
    lastFetchAt = now();
    inFlight = (async () => {
      const keys = await importJwks(await fetchJson(url));
      const entry: CacheEntry = { url, keys, fetchedAt: now() };
      cache = entry;
      return entry;
    })();
    try {
      return await inFlight;
    } finally {
      inFlight = null;
    }
  }

  /** Resolve `kid` to a key, or a denial reason. Never throws. */
  async function keyFor(
    kid: string,
    url: string,
  ): Promise<CryptoKey | "unknown_kid" | "jwks_unavailable"> {
    try {
      const fresh = cache && cache.url === url && now() - cache.fetchedAt < JWKS_TTL_MS;
      if (fresh && cache) {
        const hit = cache.keys.get(kid);
        if (hit) return hit;
      }
      // Throttle fetches unless one is already in flight (then share it): an
      // unknown kid on a fresh cache, or a fetch that failed moments ago,
      // must not make every request hit the certs endpoint again.
      if (!inFlight && now() - lastFetchAt < JWKS_MIN_REFETCH_MS) {
        return fresh ? "unknown_kid" : "jwks_unavailable";
      }
      const entry = await refresh(url);
      return entry.keys.get(kid) ?? "unknown_kid";
    } catch {
      return "jwks_unavailable";
    }
  }

  async function verify(
    token: string | null | undefined,
    config: AccessConfig,
  ): Promise<AccessVerifyResult> {
    const deny = (reason: AccessDenyReason): AccessVerifyResult => ({ ok: false, reason });
    if (!token) return deny("missing_token");
    if (token.length > MAX_TOKEN_CHARS) return deny("malformed");

    const parts = token.split(".");
    if (parts.length !== 3) return deny("malformed");
    const [headerB64, payloadB64, signatureB64] = parts;
    const header = decodeJsonSegment(headerB64);
    const payload = decodeJsonSegment(payloadB64);
    const signature = decodeSegment(signatureB64);
    if (!header || !payload || !signature) return deny("malformed");

    // Alg first: an attacker-chosen alg never reaches a key lookup.
    if (header.alg !== "RS256") return deny("bad_alg");
    if (typeof header.kid !== "string" || !header.kid) return deny("malformed");

    const issuer = `https://${config.teamDomain}`;
    const key = await keyFor(header.kid, `${issuer}/cdn-cgi/access/certs`);
    if (typeof key === "string") return deny(key);

    let valid = false;
    try {
      valid = await crypto.subtle.verify(
        RS256_IMPORT.name,
        key,
        signature,
        new TextEncoder().encode(`${headerB64}.${payloadB64}`),
      );
    } catch {
      valid = false;
    }
    if (!valid) return deny("bad_signature");

    // Claims are only read once the signature proves Access minted them.
    if (payload.iss !== issuer) return deny("bad_iss");
    const aud = payload.aud;
    const audiences = Array.isArray(aud) ? aud : [aud];
    if (!audiences.some((a) => typeof a === "string" && a === config.aud)) {
      return deny("bad_aud");
    }
    const nowSeconds = now() / 1000;
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
      return deny("malformed");
    }
    if (nowSeconds >= payload.exp + CLOCK_SKEW_SECONDS) return deny("expired");
    if (payload.nbf !== undefined) {
      if (typeof payload.nbf !== "number" || !Number.isFinite(payload.nbf)) {
        return deny("malformed");
      }
      if (nowSeconds + CLOCK_SKEW_SECONDS < payload.nbf) return deny("not_yet_valid");
    }
    if (
      typeof payload.email !== "string" ||
      payload.email.toLowerCase() !== config.email.toLowerCase()
    ) {
      return deny("wrong_email");
    }
    return { ok: true, email: payload.email };
  }

  return { verify };
}

/** The per-isolate verifier the admin routes share (one JWKS cache). */
export const defaultAccessVerifier: AccessVerifier = createAccessVerifier();

/* ─────────────────────────────── route glue ───────────────────────────── */

/**
 * The structured line a denial writes: `[admin-access] denied {"ip","reason"}`.
 * The token, its claims and the configured email are never passed in, so none
 * of them can reach the log.
 */
export function logAccessDenied(ip: string, reason: AccessDenyReason): void {
  console.warn(
    "[admin-access] denied",
    JSON.stringify({ ip: truncateIpForLog(ip), reason }),
  );
}

/** The opaque 403 every Access denial returns — same shape as the origin guard. */
export function accessDeniedResponse(): Response {
  return new Response(JSON.stringify({ error: "FORBIDDEN" }), {
    status: 403,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Check the request's Access JWT. Returns null when it passes, otherwise the
 * 403 to return verbatim (the denial is logged here).
 */
export async function checkCfAccess(
  request: Request,
  config: AccessConfig,
  ip: string,
  verifier: AccessVerifier = defaultAccessVerifier,
): Promise<Response | null> {
  const result = await verifier.verify(request.headers.get(ACCESS_JWT_HEADER), config);
  if (result.ok) return null;
  logAccessDenied(ip, result.reason);
  return accessDeniedResponse();
}
