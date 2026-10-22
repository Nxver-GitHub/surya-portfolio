/**
 * POST /api/admin/login — passphrase → signed session cookie (E11 admin).
 *
 * Security posture (matches the cafe-terminal house standard):
 *   - Strict zod validation with a hard length cap on the passphrase.
 *   - Env gate: if the admin secret/hash (or the Upstash creds the limiter
 *     needs) are absent, the route returns 503 ADMIN_NOT_CONFIGURED — NEVER a
 *     bypass. Absent config can only lock you out, never let you in.
 *   - Same-origin guard and a hard body-size cap; no cross-site page can post a
 *     login attempt, and no caller can make us buffer an unbounded body.
 *   - Cloudflare Access JWT check (lib/cfAccess), FAIL CLOSED, right after the
 *     origin guard and BEFORE the rate limiter — a request Access never saw
 *     cannot spend the owner's login budget. Denied → opaque 403.
 *   - Per-IP rate limit, FAIL CLOSED, stricter than guest chat (5 / hour). Runs
 *     BEFORE the body is read and before the CPU-bound scrypt, so a flood can't
 *     burn the function on parsing either.
 *   - scrypt + timingSafeEqual verification (see lib/adminAuth). On failure an
 *     opaque 401 with the same code regardless of why; the verify path runs the
 *     same scrypt cost for wrong and malformed inputs. Verification is also
 *     concurrency-gated (verifyPassphraseGuarded) — at capacity, a request is
 *     refused with the same 503 SYSTEM_BUSY shape as a rate-limiter backend
 *     error, without ever running scrypt for it.
 *   - On success: the session epoch is advanced in Upstash (killing any older
 *     session) and an httpOnly + Secure + SameSite=Strict signed cookie carrying
 *     the new epoch is set, 24h expiry (see lib/adminSession). One structured
 *     `[admin-login] success {"ip"}` line is logged.
 *
 * Import-safe with no env set (no top-level client construction), so keyless CI
 * builds never throw — clients are built lazily inside the handler.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { z } from "zod";
import { verifyPassphraseGuarded } from "@/lib/adminAuth";
import {
  buildSessionCookie,
  mintSessionToken,
  sessionConfigFromEnv,
} from "@/lib/adminSession";
import { accessConfigFromEnv, checkCfAccess } from "@/lib/cfAccess";
import { extractClientIp, retryAfterSeconds } from "@/app/api/cafe-terminal/route";
import { errorMessage, truncateIpForLog } from "@/lib/logging";
import {
  MAX_TINY_BODY_BYTES,
  hasTrustedOrigin,
  readCappedJson,
} from "@/lib/requestGuards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Passphrase bounds — long enough for a real passphrase, capped to stop abuse
 * (scrypt cost scales with input; an unbounded body is a CPU-DoS vector). */
export const MIN_PASSPHRASE_CHARS = 1;
export const MAX_PASSPHRASE_CHARS = 256;

/** Per-IP login attempts allowed per hour. Stricter than guest chat by design —
 * the owner logs in rarely; brute force gets ~5 tries an hour, then 429. */
export const LOGIN_LIMIT_PER_HOUR = 5;
/** Global floor across ALL IPs — defense-in-depth if per-IP keying is ever
 * weakened (proxy misconfig, self-hosting). The owner can't hit this alone;
 * a distributed guesser can't get past it. */
export const LOGIN_LIMIT_GLOBAL_PER_HOUR = 100;
/** Redis key prefix for the login limiter — namespaced away from cafeterm:. */
export const LOGIN_KEY_PREFIX = "adminlogin:ip:hour";
export const LOGIN_GLOBAL_KEY_PREFIX = "adminlogin:global:hour";

export const loginRequestSchema = z
  .object({
    passphrase: z
      .string()
      .min(MIN_PASSPHRASE_CHARS)
      .max(MAX_PASSPHRASE_CHARS),
  })
  .strict();

/** Parse an unknown body without throwing. Pure. */
export function parseLoginBody(
  body: unknown,
): { ok: true; passphrase: string } | { ok: false } {
  const result = loginRequestSchema.safeParse(body);
  if (!result.success) return { ok: false };
  return { ok: true, passphrase: result.data.passphrase };
}

/** Server-only env this route needs. Never NEXT_PUBLIC. */
interface LoginEnv {
  ADMIN_PASSPHRASE_SCRYPT?: string;
  ADMIN_SESSION_SECRET?: string;
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  ADMIN_ACCESS_EMAIL?: string;
}

/** True only when every var needed to safely process a login is present —
 * including the Cloudflare Access config (team domain, AUD tag, owner email).
 * When false the route answers 503 rather than constructing clients, skipping
 * the Access check, or bypassing the (fail-closed) rate limiter. Pure. */
export function loginConfigured(env: LoginEnv): boolean {
  return Boolean(
    env.ADMIN_PASSPHRASE_SCRYPT &&
      env.ADMIN_SESSION_SECRET &&
      env.UPSTASH_REDIS_REST_URL &&
      env.UPSTASH_REDIS_REST_TOKEN &&
      accessConfigFromEnv(env),
  );
}

let cachedLimiters: { perIp: Ratelimit; global: Ratelimit } | null = null;
function getLoginLimiters(
  url: string,
  token: string,
): { perIp: Ratelimit; global: Ratelimit } {
  if (cachedLimiters) return cachedLimiters;
  const redis = new Redis({ url, token });
  cachedLimiters = {
    perIp: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(LOGIN_LIMIT_PER_HOUR, "1 h"),
      prefix: LOGIN_KEY_PREFIX,
    }),
    global: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(LOGIN_LIMIT_GLOBAL_PER_HOUR, "1 h"),
      prefix: LOGIN_GLOBAL_KEY_PREFIX,
    }),
  };
  return cachedLimiters;
}

function json(body: unknown, status: number, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

/** Reason a login attempt failed — the only two cases that get logged. */
export type AuthFailureReason = "bad_passphrase" | "rate_limited";

/**
 * Emit the ONE structured, greppable log line a Cloudflare Workers
 * Observability alert matches on a failed admin login. A JSON object with
 * exactly `ip` (truncated, see MAX_LOGGED_IP_CHARS in lib/logging) and `reason` —
 * deliberately no parameter for the candidate passphrase, its length, or the
 * stored hash, so there is nothing here that could ever leak one into logs.
 *
 * The PREFIX differs by reason so a rate-limit flood (routine, and entirely
 * expected from a slow brute-force attempt) cannot be counted as the same
 * signal as an actual wrong-passphrase attempt and inflate a
 * wrong-passphrase alert: `[admin-login] auth_failed` is reserved for
 * `bad_passphrase`; the rate-limited path gets its own
 * `[admin-login] rate_limited` prefix. Both still carry `reason` in the JSON
 * payload for anyone grepping by field instead of by prefix.
 */
export function logAuthFailure(ip: string, reason: AuthFailureReason): void {
  const prefix =
    reason === "rate_limited"
      ? "[admin-login] rate_limited"
      : "[admin-login] auth_failed";
  console.warn(prefix, JSON.stringify({ ip: truncateIpForLog(ip), reason }));
}

/** The audit line for a successful login — the ip only; never the passphrase,
 * the token, the hash or the Access identity. */
export function logLoginSuccess(ip: string): void {
  console.info("[admin-login] success", JSON.stringify({ ip: truncateIpForLog(ip) }));
}

export async function POST(request: Request): Promise<Response> {
  const env: LoginEnv = {
    ADMIN_PASSPHRASE_SCRYPT: process.env.ADMIN_PASSPHRASE_SCRYPT,
    ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    CF_ACCESS_TEAM_DOMAIN: process.env.CF_ACCESS_TEAM_DOMAIN,
    CF_ACCESS_AUD: process.env.CF_ACCESS_AUD,
    ADMIN_ACCESS_EMAIL: process.env.ADMIN_ACCESS_EMAIL,
  };
  const access = accessConfigFromEnv(env);
  if (!access || !loginConfigured(env)) {
    return json({ error: "ADMIN_NOT_CONFIGURED" }, 503);
  }

  // Same-origin guard: nothing on another site has any business posting a login
  // attempt here. See lib/requestGuards for the missing-Origin policy.
  if (!hasTrustedOrigin(request)) {
    return json({ error: "FORBIDDEN" }, 403);
  }

  const ip = extractClientIp((name) => request.headers.get(name));

  // Cloudflare Access must have run: verify its signed JWT before anything
  // spends limiter budget or CPU.
  const accessDenied = await checkCfAccess(request, access, ip);
  if (accessDenied) return accessDenied;

  // Rate limit BEFORE the body is read and before the expensive scrypt — fail
  // CLOSED on any backend error. Reading first meant a flood of unbounded
  // bodies was buffered and parsed before the 5/hour cap could shed any of it.
  try {
    const limiters = getLoginLimiters(
      env.UPSTASH_REDIS_REST_URL as string,
      env.UPSTASH_REDIS_REST_TOKEN as string,
    );
    const [ipRes, globalRes] = await Promise.all([
      limiters.perIp.limit(ip),
      limiters.global.limit("all"),
    ]);
    if (!ipRes.success || !globalRes.success) {
      const reset = Math.max(ipRes.reset, globalRes.reset);
      const retry = retryAfterSeconds(reset);
      logAuthFailure(ip, "rate_limited");
      return json(
        { error: "RATE_LIMITED", retryAfterSeconds: retry },
        429,
        { "retry-after": String(retry) },
      );
    }
  } catch (error) {
    // Message only — an Upstash error object carries the REST URL and token
    // header, which Worker observability would retain. Same rule everywhere.
    console.error("[admin-login] rate-limit backend error", errorMessage(error));
    return json({ error: "SYSTEM_BUSY" }, 503);
  }

  // Body last, under a hard byte cap: the passphrase is ≤256 chars, so anything
  // approaching 8 KB is abuse, not a login.
  const body = await readCappedJson(request, MAX_TINY_BODY_BYTES);
  if (!body.ok) {
    return json({ error: "BAD_REQUEST" }, 400);
  }
  const parsed = parseLoginBody(body.value);
  if (!parsed.ok) {
    return json({ error: "BAD_REQUEST" }, 400);
  }

  // Verify — constant-time, opaque failure. Gated: at most
  // MAX_CONCURRENT_VERIFIES scrypt derivations run at once across the
  // isolate (see lib/adminAuth) — a flood of simultaneous attempts gets the
  // same SYSTEM_BUSY 503 as a rate-limiter backend error, rather than risking
  // the isolate's shared memory. Also wrapped in try/catch: any unexpected
  // rejection still yields the same opaque 401 as a wrong passphrase, never
  // a 500 that could hint at what went wrong internally.
  let outcome: Awaited<ReturnType<typeof verifyPassphraseGuarded>>;
  try {
    outcome = await verifyPassphraseGuarded(
      parsed.passphrase,
      env.ADMIN_PASSPHRASE_SCRYPT,
    );
  } catch (error) {
    console.error("[admin-login] verify error", errorMessage(error));
    logAuthFailure(ip, "bad_passphrase");
    return json({ error: "INVALID_CREDENTIALS" }, 401);
  }

  if (outcome === "busy") {
    return json({ error: "SYSTEM_BUSY" }, 503);
  }
  if (outcome === "no_match") {
    logAuthFailure(ip, "bad_passphrase");
    return json({ error: "INVALID_CREDENTIALS" }, 401);
  }

  // Advance the session epoch FIRST: the new token is the only one that will
  // match, so any older session (another device, a stolen cookie) dies here.
  // No epoch, no session — a Redis error fails closed.
  let token: string;
  try {
    const session = sessionConfigFromEnv(env);
    if (!session) return json({ error: "ADMIN_NOT_CONFIGURED" }, 503);
    const epoch = await session.store.bump();
    token = mintSessionToken(session.key, epoch);
  } catch (error) {
    console.error("[admin-login] session epoch error", errorMessage(error));
    return json({ error: "SYSTEM_BUSY" }, 503);
  }

  logLoginSuccess(ip);
  return json({ ok: true }, 200, {
    "set-cookie": buildSessionCookie(token),
  });
}
