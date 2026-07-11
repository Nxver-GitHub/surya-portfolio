/**
 * POST /api/cafe-terminal — the GT Café house terminal (E11).
 *
 * The site's FIRST backend surface. It streams an in-character chat reply from
 * Groq's free tier via the Vercel AI SDK, grounded ONLY in the owner's real
 * portfolio content (see terminal-prompt.ts). Treated as security-sensitive:
 *
 *   - Strict zod validation at the boundary; a client-supplied system prompt is
 *     NEVER accepted — the system prompt is built server-side only.
 *   - Upstash rate limits (per-IP + global) run BEFORE Groq is ever called.
 *   - No top-level client construction: the module is import-safe with NO env
 *     vars set, so `pnpm build` (keyless CI) never throws. Clients are built
 *     lazily inside the handler after an env check.
 *
 * The handler is deliberately thin; all pure logic (schema, IP extraction, env
 * readiness, message mapping) is exported for unit tests that never hit the
 * network. See tests/cafe-terminal-route.test.ts.
 */

import { streamText, type ModelMessage } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { z } from "zod";
import { buildSystemPrompt } from "@/lib/terminal-prompt";

/** Node runtime: Upstash + AI SDK stream cleanly here, and it keeps the route
 * off the Edge (where our keyless-build assumptions differ). */
export const runtime = "nodejs";
/** Never prerender/cache — this is a dynamic, per-request streaming endpoint. */
export const dynamic = "force-dynamic";
/** Cap streaming duration; a house-terminal reply is short. */
export const maxDuration = 30;

/** Groq free-tier model for the terminal (decided with the site owner). */
const GROQ_MODEL = "openai/gpt-oss-120b";
/** Generation caps — short, warm replies; low-ish temperature for grounding. */
const MAX_OUTPUT_TOKENS = 350;
const TEMPERATURE = 0.6;

/** Per-message content bounds (after trim). */
const MIN_CONTENT_CHARS = 1;
const MAX_CONTENT_CHARS = 500;
/** Max messages accepted in one request (whole conversation). */
const MAX_MESSAGES = 30;

/* ────────────────────────────── validation ─────────────────────────────── */

/**
 * Request schema. The client (useTerminalChat) flattens AI-SDK UI messages to
 * this minimal shape before POSTing, so the contract here is exact and testable.
 * Roles are restricted to user/assistant — a client system/other role is a 400.
 * Content is trimmed then bounded; `.strict()` rejects any extra keys (e.g. a
 * smuggled `system`).
 */
export const chatMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().min(MIN_CONTENT_CHARS).max(MAX_CONTENT_CHARS)),
  })
  .strict();

export const chatRequestSchema = z
  .object({
    messages: z.array(chatMessageSchema).min(1).max(MAX_MESSAGES),
  })
  .strict();

export type ChatMessage = z.infer<typeof chatMessageSchema>;

/**
 * Parse + validate an unknown request body against {@link chatRequestSchema}.
 * Pure: returns a discriminated result instead of throwing, so the handler and
 * the tests share one code path. Never trusts the input shape.
 */
export function parseChatBody(
  body: unknown,
):
  | { ok: true; messages: readonly ChatMessage[] }
  | { ok: false } {
  const result = chatRequestSchema.safeParse(body);
  if (!result.success) return { ok: false };
  return { ok: true, messages: result.data.messages };
}

/**
 * Map validated {role, content} messages to AI-SDK ModelMessages. Pure. We own
 * the shape entirely (no client parts), so no `convertToModelMessages` needed.
 */
export function mapMessagesToModel(
  messages: readonly ChatMessage[],
): ModelMessage[] {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

/* ────────────────────────────── client IP ──────────────────────────────── */

/** Fallback identifier when no forwarded IP is present — one shared bucket so
 * an unknown-IP flood still gets rate limited rather than bypassing the guard. */
export const IP_FALLBACK = "unknown";

/**
 * Extract the client IP from `x-forwarded-for` (first entry), with a safe
 * fallback. Pure — takes a header getter so tests can drive it without a real
 * Request.
 *
 * Trust boundary: on Vercel (this app's only deployment target), the platform
 * sets/normalizes `x-forwarded-for` before the function sees it, so the first
 * entry is the real client IP and cannot be spoofed by the caller. If this route
 * is ever self-hosted behind a proxy that passes client XFF through unmodified,
 * a caller could forge this header to dodge the per-IP limit — they would still
 * be caught by the global/day limit, but the per-IP guard would weaken. Keep it
 * on a trusted edge.
 */
export function extractClientIp(
  getHeader: (name: string) => string | null,
): string {
  const xff = getHeader("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = getHeader("x-real-ip");
  if (real && real.trim()) return real.trim();
  return IP_FALLBACK;
}

/* ─────────────────────────────── env / limits ──────────────────────────── */

/** The server-only env vars this route needs. Never NEXT_PUBLIC. */
export interface TerminalEnv {
  GROQ_API_KEY?: string;
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
}

/**
 * True only when every required env var is present and non-empty. Pure. When
 * false the route answers 503 TERMINAL_OFFLINE instead of constructing clients
 * (which would throw) — this is what makes the module import-safe keyless.
 */
export function envReady(env: TerminalEnv): boolean {
  return Boolean(
    env.GROQ_API_KEY &&
      env.UPSTASH_REDIS_REST_URL &&
      env.UPSTASH_REDIS_REST_TOKEN,
  );
}

/** Redis key prefixes — namespaced so this app never collides with others. */
export const KEY_PREFIX = {
  ipMinute: "cafeterm:ip:min",
  ipDay: "cafeterm:ip:day",
  globalDay: "cafeterm:global:day",
} as const;

/** Limit thresholds (decided with the site owner; protects the ~1k/day Groq
 * free quota). Per-IP 8/min AND 60/day; global 400/day. */
export const LIMITS = {
  ipPerMinute: 8,
  ipPerDay: 60,
  globalPerDay: 400,
} as const;

/** Lazily-built limiters, cached per module instance (warm serverless reuse).
 * Built only after {@link envReady}, so no top-level construction throws. */
interface Limiters {
  ipMinute: Ratelimit;
  ipDay: Ratelimit;
  globalDay: Ratelimit;
}
let cachedLimiters: Limiters | null = null;

function getLimiters(env: Required<TerminalEnv>): Limiters {
  if (cachedLimiters) return cachedLimiters;
  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
  cachedLimiters = {
    ipMinute: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(LIMITS.ipPerMinute, "60 s"),
      prefix: KEY_PREFIX.ipMinute,
    }),
    ipDay: new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(LIMITS.ipPerDay, "1 d"),
      prefix: KEY_PREFIX.ipDay,
    }),
    globalDay: new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(LIMITS.globalPerDay, "1 d"),
      prefix: KEY_PREFIX.globalDay,
    }),
  };
  return cachedLimiters;
}

/** Ceil seconds until an Upstash `reset` (ms Unix timestamp) — the Retry-After. */
export function retryAfterSeconds(resetMs: number, nowMs: number = Date.now()): number {
  return Math.max(1, Math.ceil((resetMs - nowMs) / 1000));
}

/* ───────────────────────────── JSON responses ──────────────────────────── */

function json(body: unknown, status: number, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

/* ─────────────────────────────── the handler ───────────────────────────── */

export async function POST(request: Request): Promise<Response> {
  // 1) Env gate — offline (no clients constructed) when misconfigured.
  const env: TerminalEnv = {
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
  if (!envReady(env)) {
    return json({ error: "TERMINAL_OFFLINE" }, 503);
  }

  // 2) Validate body.
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "BAD_REQUEST" }, 400);
  }
  const parsed = parseChatBody(raw);
  if (!parsed.ok) {
    return json({ error: "BAD_REQUEST" }, 400);
  }

  // 3) Rate limit BEFORE touching Groq. Global first (cheapest signal to shed
  //    load), then per-IP minute + day. Any failure → 429 with Retry-After.
  const ip = extractClientIp((name) => request.headers.get(name));
  const limiters = getLimiters(env as Required<TerminalEnv>);
  try {
    const [globalRes, ipMinRes, ipDayRes] = await Promise.all([
      limiters.globalDay.limit("all"),
      limiters.ipMinute.limit(ip),
      limiters.ipDay.limit(ip),
    ]);
    const blocked = [globalRes, ipMinRes, ipDayRes].find((r) => !r.success);
    if (blocked) {
      const retryAfterSecondsValue = retryAfterSeconds(blocked.reset);
      return json(
        { error: "RATE_LIMITED", retryAfterSeconds: retryAfterSecondsValue },
        429,
        { "retry-after": String(retryAfterSecondsValue) },
      );
    }
  } catch (error) {
    // Rate-limit backend hiccup — fail closed as busy rather than letting an
    // unbounded flood through to Groq. Log server-side for observability; the
    // client only ever sees the opaque code.
    console.error("[cafe-terminal] rate-limit backend error", error);
    return json({ error: "SYSTEM_BUSY" }, 503);
  }

  // 4) Call Groq and stream the UI-message response.
  try {
    const groq = createGroq({ apiKey: env.GROQ_API_KEY });
    const result = streamText({
      model: groq(GROQ_MODEL),
      system: buildSystemPrompt(),
      messages: mapMessagesToModel(parsed.messages),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: TEMPERATURE,
    });
    return result.toUIMessageStreamResponse();
  } catch (error) {
    // Groq throttle/outage/SDK error — surface an opaque busy code, log detail
    // server-side only (never in the response body).
    console.error("[cafe-terminal] groq stream error", error);
    return json({ error: "SYSTEM_BUSY" }, 503);
  }
}
