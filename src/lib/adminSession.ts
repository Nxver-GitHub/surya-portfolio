/**
 * adminSession — stateless signed session tokens + the requireAdmin guard.
 *
 * There is NO server-side session store. A successful login mints a token that
 * is its own proof: `${expiry}.${nonce}.${sig}` where
 *   sig = HMAC-SHA256( `${expiry}.${nonce}`, ADMIN_SESSION_SECRET )   (hex).
 *
 * Verification recomputes the HMAC over the presented `expiry.nonce` and
 * compares it to the presented signature in constant time, then checks that the
 * token has not expired. Because the secret never leaves the server, a client
 * cannot forge or extend a token. Tokens carry NO identity or privilege data —
 * possession of a valid, unexpired signature IS the admin grant.
 *
 * The cookie is httpOnly + Secure + SameSite=Strict + Path=/, so it is invisible
 * to JS, never sent cross-site, and only travels over HTTPS.
 *
 * Pure crypto (mint/verify/parse) reads no env and is unit-tested directly; only
 * `requireAdmin` touches `process.env` and the Request.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Cookie name carrying the signed admin session token. */
export const ADMIN_SESSION_COOKIE = "admin_session";

/** Session lifetime: 24 hours, in milliseconds and seconds (cookie Max-Age). */
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
export const SESSION_TTL_SECONDS = 24 * 60 * 60;

/** A verified token's decoded payload. */
export interface SessionPayload {
  /** Absolute expiry, epoch milliseconds. */
  readonly expiry: number;
  /** Random per-token nonce (hex) — makes each token unique + unguessable. */
  readonly nonce: string;
}

/** Compute the hex HMAC-SHA256 signature over `${expiry}.${nonce}`. */
function sign(expiry: number, nonce: string, secret: string): string {
  return createHmac("sha256", secret).update(`${expiry}.${nonce}`).digest("hex");
}

/**
 * Mint a signed session token valid for {@link SESSION_TTL_MS} from `now`. The
 * nonce is 16 random bytes so tokens never collide and can't be predicted. Pure
 * given its inputs (nonce source is injectable for deterministic tests).
 */
export function mintSessionToken(
  secret: string,
  now: number = Date.now(),
  nonce: string = randomBytes(16).toString("hex"),
): string {
  const expiry = now + SESSION_TTL_MS;
  const sig = sign(expiry, nonce, secret);
  return `${expiry}.${nonce}.${sig}`;
}

/** Constant-time string compare that never throws on length mismatch. */
function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Verify a token's signature and expiry. Returns the decoded payload on success
 * or null on any failure (bad shape, bad signature, expired). Never throws. The
 * signature is checked in constant time BEFORE the expiry, so a forged token and
 * an expired one are indistinguishable by timing.
 */
export function verifySessionToken(
  token: string | undefined | null,
  secret: string,
  now: number = Date.now(),
): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [expiryStr, nonce, sig] = parts;
  if (!expiryStr || !nonce || !sig) return null;
  const expiry = Number(expiryStr);
  if (!Number.isSafeInteger(expiry)) return null;

  const expected = sign(expiry, nonce, secret);
  if (!safeEqualHex(sig, expected)) return null;
  if (expiry <= now) return null;
  return { expiry, nonce };
}

/* ─────────────────────────────── cookies ───────────────────────────────── */

/** Serialize the Set-Cookie header for a freshly minted session token. */
export function buildSessionCookie(token: string): string {
  return [
    `${ADMIN_SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ].join("; ");
}

/** Serialize a Set-Cookie header that immediately clears the session cookie. */
export function buildClearCookie(): string {
  return [
    `${ADMIN_SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Max-Age=0",
  ].join("; ");
}

/**
 * Read one cookie value from a raw Cookie header. Pure. Returns null when the
 * header is absent or the named cookie is not present.
 */
export function readCookie(
  cookieHeader: string | null,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) return part.slice(eq + 1).trim();
  }
  return null;
}

/* ────────────────────────────── the guard ──────────────────────────────── */

/** Opaque JSON response used for every admin-guard rejection. */
function deny(status: number): Response {
  const code = status === 503 ? "ADMIN_NOT_CONFIGURED" : "UNAUTHORIZED";
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Result of the admin guard: proceed, or a ready-to-return rejection Response. */
export type AdminGuardResult =
  | { readonly ok: true; readonly session: SessionPayload }
  | { readonly ok: false; readonly response: Response };

/**
 * Guard every admin API route. Reads `ADMIN_SESSION_SECRET` and the session
 * cookie, verifies the token, and returns either `{ ok: true }` or a rejection
 * Response the route should return verbatim:
 *   - secret not configured        → 503 ADMIN_NOT_CONFIGURED (never a bypass)
 *   - missing/invalid/expired token → 401 UNAUTHORIZED (opaque)
 */
export function requireAdmin(request: Request): AdminGuardResult {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return { ok: false, response: deny(503) };

  const token = readCookie(request.headers.get("cookie"), ADMIN_SESSION_COOKIE);
  const session = verifySessionToken(token, secret);
  if (!session) return { ok: false, response: deny(401) };
  return { ok: true, session };
}
