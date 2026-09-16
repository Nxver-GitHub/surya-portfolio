/**
 * POST /api/beacon — anonymized page-view counter (E11 telemetry).
 *
 * Fired by navigator.sendBeacon from PageViewBeacon on every route change. The
 * body is `{ route }` validated against the CLOSED known-route list (never an
 * arbitrary string), so the analytics key space is bounded. No IP, no cookie,
 * no referrer is stored — only INCR of `views:<route>:<yyyymmdd>`.
 *
 * RATE LIMIT — FAILS OPEN (the ONLY route that does): this endpoint records a
 * page-view count and nothing security-sensitive. If the limiter backend
 * hiccups, dropping the count is fine but blocking the request is not — a broken
 * limiter must never degrade browsing. So on any limiter error we simply proceed
 * without limiting. (Contrast: cafe-terminal and admin-login fail CLOSED because
 * a bypass there is abuse/brute-force exposure.)
 *
 * Always answers 204 No Content — sendBeacon ignores the body, and a uniform
 * response never leaks whether a route was recognized or rate-limited.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { z } from "zod";
import { KNOWN_ROUTES } from "@/lib/routes";
import { recordPageView } from "@/lib/events";
import { extractClientIp } from "@/app/api/cafe-terminal/route";
import { errorMessage } from "@/lib/logging";
import {
  MAX_TINY_BODY_BYTES,
  hasTrustedOrigin,
  readCappedJson,
} from "@/lib/requestGuards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Generous per-IP cap — a real session changes routes often; this only stops a
 * pathological flood from inflating counts. */
export const BEACON_LIMIT_PER_MINUTE = 60;
export const BEACON_KEY_PREFIX = "beacon:ip:min";

export const beaconRequestSchema = z
  .object({
    // Enum over the known routes — arbitrary strings are rejected at the boundary.
    route: z.enum(KNOWN_ROUTES),
  })
  .strict();

/** Parse an unknown body without throwing. Pure. */
export function parseBeaconBody(
  body: unknown,
): { ok: true; route: (typeof KNOWN_ROUTES)[number] } | { ok: false } {
  const result = beaconRequestSchema.safeParse(body);
  if (!result.success) return { ok: false };
  return { ok: true, route: result.data.route };
}

const NO_CONTENT: ResponseInit = { status: 204 };

let cachedLimiter: Ratelimit | null = null;
function getBeaconLimiter(url: string, token: string): Ratelimit {
  if (cachedLimiter) return cachedLimiter;
  cachedLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(BEACON_LIMIT_PER_MINUTE, "60 s"),
    prefix: BEACON_KEY_PREFIX,
  });
  return cachedLimiter;
}

export async function POST(request: Request): Promise<Response> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  // No telemetry backend configured → quietly accept and drop. Never an error.
  if (!url || !token) return new Response(null, NO_CONTENT);

  // Same-origin guard. Another site posting here can only inflate our own
  // page-view counts, so the answer stays a silent 204 — same as every other
  // rejection on this route. (Fail open on a MISSING Origin, per requestGuards;
  // sendBeacon from our own pages always sends one.)
  if (!hasTrustedOrigin(request)) return new Response(null, NO_CONTENT);

  // Rate limit BEFORE the body is read — FAIL OPEN. A limiter error must not
  // drop the browsing request, but a flood must not be parsed for free either.
  const ip = extractClientIp((name) => request.headers.get(name));
  try {
    const res = await getBeaconLimiter(url, token).limit(ip);
    if (!res.success) return new Response(null, NO_CONTENT); // over cap → drop
  } catch (error) {
    // Fail open: proceed to record despite the limiter backend being down.
    // Message only — the error object carries the Upstash URL and token header.
    console.error(
      "[beacon] rate-limit backend error (failing open)",
      errorMessage(error),
    );
  }

  // A `{ route }` beacon is a few dozen bytes; 8 KB is a generous ceiling.
  const body = await readCappedJson(request, MAX_TINY_BODY_BYTES);
  if (!body.ok) return new Response(null, NO_CONTENT);
  const parsed = parseBeaconBody(body.value);
  if (!parsed.ok) return new Response(null, NO_CONTENT);

  void recordPageView(parsed.route);
  return new Response(null, NO_CONTENT);
}
