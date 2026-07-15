/**
 * POST /api/admin/login — passphrase → signed session cookie (E11 admin).
 *
 * Security posture (matches the cafe-terminal house standard):
 *   - Strict zod validation with a hard length cap on the passphrase.
 *   - Env gate: if the admin secret/hash (or the Upstash creds the limiter
 *     needs) are absent, the route returns 503 ADMIN_NOT_CONFIGURED — NEVER a
 *     bypass. Absent config can only lock you out, never let you in.
 *   - Per-IP rate limit, FAIL CLOSED, stricter than guest chat (5 / hour). Runs
 *     BEFORE the CPU-bound scrypt so a flood can't burn the function.
 *   - scrypt + timingSafeEqual verification (see lib/adminAuth). On failure an
 *     opaque 401 with the same code regardless of why; the verify path runs the
 *     same scrypt cost for wrong and malformed inputs.
 *   - On success: httpOnly + Secure + SameSite=Strict signed session cookie,
 *     24h expiry, no server-side store (see lib/adminSession).
 *
 * Import-safe with no env set (no top-level client construction), so keyless CI
 * builds never throw — clients are built lazily inside the handler.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { z } from "zod";
import { verifyPassphrase } from "@/lib/adminAuth";
import {
  buildSessionCookie,
  mintSessionToken,
} from "@/lib/adminSession";
import { extractClientIp, retryAfterSeconds } from "@/app/api/cafe-terminal/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Passphrase bounds — long enough for a real passphrase, capped to stop abuse
 * (scrypt cost scales with input; an unbounded body is a CPU-DoS vector). */
export const MIN_PASSPHRASE_CHARS = 1;
export const MAX_PASSPHRASE_CHARS = 256;

/** Per-IP login attempts allowed per hour. Stricter than guest chat by design —
 * the owner logs in rarely; brute force gets ~5 tries an hour, then 429. */
export const LOGIN_LIMIT_PER_HOUR = 5;
/** Redis key prefix for the login limiter — namespaced away from cafeterm:. */
export const LOGIN_KEY_PREFIX = "adminlogin:ip:hour";

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
}

/** True only when every var needed to safely process a login is present. When
 * false the route answers 503 rather than constructing clients or bypassing the
 * (fail-closed) rate limiter. Pure. */
export function loginConfigured(env: LoginEnv): boolean {
  return Boolean(
    env.ADMIN_PASSPHRASE_SCRYPT &&
      env.ADMIN_SESSION_SECRET &&
      env.UPSTASH_REDIS_REST_URL &&
      env.UPSTASH_REDIS_REST_TOKEN,
  );
}

let cachedLimiter: Ratelimit | null = null;
function getLoginLimiter(url: string, token: string): Ratelimit {
  if (cachedLimiter) return cachedLimiter;
  cachedLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(LOGIN_LIMIT_PER_HOUR, "1 h"),
    prefix: LOGIN_KEY_PREFIX,
  });
  return cachedLimiter;
}

function json(body: unknown, status: number, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

export async function POST(request: Request): Promise<Response> {
  const env: LoginEnv = {
    ADMIN_PASSPHRASE_SCRYPT: process.env.ADMIN_PASSPHRASE_SCRYPT,
    ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
  if (!loginConfigured(env)) {
    return json({ error: "ADMIN_NOT_CONFIGURED" }, 503);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "BAD_REQUEST" }, 400);
  }
  const parsed = parseLoginBody(raw);
  if (!parsed.ok) {
    return json({ error: "BAD_REQUEST" }, 400);
  }

  // Rate limit BEFORE the expensive scrypt — fail CLOSED on any backend error.
  const ip = extractClientIp((name) => request.headers.get(name));
  try {
    const limiter = getLoginLimiter(
      env.UPSTASH_REDIS_REST_URL as string,
      env.UPSTASH_REDIS_REST_TOKEN as string,
    );
    const res = await limiter.limit(ip);
    if (!res.success) {
      const retry = retryAfterSeconds(res.reset);
      return json(
        { error: "RATE_LIMITED", retryAfterSeconds: retry },
        429,
        { "retry-after": String(retry) },
      );
    }
  } catch (error) {
    console.error("[admin-login] rate-limit backend error", error);
    return json({ error: "SYSTEM_BUSY" }, 503);
  }

  // Verify — constant-time, opaque failure.
  const ok = await verifyPassphrase(
    parsed.passphrase,
    env.ADMIN_PASSPHRASE_SCRYPT,
  );
  if (!ok) {
    return json({ error: "INVALID_CREDENTIALS" }, 401);
  }

  const token = mintSessionToken(env.ADMIN_SESSION_SECRET as string);
  return json({ ok: true }, 200, {
    "set-cookie": buildSessionCookie(token),
  });
}
