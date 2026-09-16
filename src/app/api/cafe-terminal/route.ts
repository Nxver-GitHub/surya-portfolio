/**
 * POST /api/cafe-terminal — the GT Café house terminal (E11).
 *
 * The site's FIRST backend surface. It streams an in-character chat reply from
 * Groq's free tier via the Vercel AI SDK, grounded ONLY in the owner's real
 * portfolio content (see terminal-prompt.ts). Treated as security-sensitive:
 *
 *   - Strict zod validation at the boundary; a client-supplied system prompt is
 *     NEVER accepted — the system prompt is built server-side only. The
 *     transcript must also be well-SHAPED (opens with the visitor, strictly
 *     alternating) and fit a total-character budget, so a hand-rolled request
 *     cannot pad the context window.
 *   - Every assistant turn must present the HMAC this server issued for that
 *     exact text; unsigned ones are dropped before the model sees them, so a
 *     hand-rolled request cannot invent assistant "precedent". Shape alone did
 *     NOT achieve this — see lib/transcriptSignature.ts.
 *   - Same-origin guard and a hard body-size cap run BEFORE the body is read.
 *   - Upstash rate limits (per-IP + global) run BEFORE the body is parsed and
 *     before Groq is ever called.
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
import { recordChatQuestion, type ChatSource } from "@/lib/events";
import {
  ADMIN_SESSION_COOKIE,
  readCookie,
  verifySessionToken,
} from "@/lib/adminSession";
import {
  MAX_ASSISTANT_CONTENT_CHARS,
  MAX_TOTAL_CONTENT_CHARS,
  MAX_USER_CONTENT_CHARS,
  isWellFormedConversation,
  normalizeAssistantContent,
  totalContentChars,
} from "@/lib/conversation";
import {
  TURN_SIGNATURE_PATTERN,
  deriveTurnSigningKey,
  signAssistantTurn,
  verifiedTranscript,
} from "@/lib/transcriptSignature";
import { errorMessage } from "@/lib/logging";
import {
  MAX_CHAT_BODY_BYTES,
  hasTrustedOrigin,
  readCappedJson,
} from "@/lib/requestGuards";

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

/** Per-message content bounds (after trim), BY ROLE. Defined in lib/conversation
 * because the signature covers the post-truncation string and both sides must
 * truncate identically; re-exported here so the route's contract reads whole. */
const MIN_CONTENT_CHARS = 1;
export { MAX_USER_CONTENT_CHARS, MAX_ASSISTANT_CONTENT_CHARS };
/** Max messages accepted in one request (whole conversation). */
const MAX_MESSAGES = 30;

/**
 * Options for the streamed response. `sendReasoning` defaults to TRUE in the AI
 * SDK, and GROQ_MODEL is a reasoning model — so the model's raw chain of
 * thought was being streamed to every visitor. Invisible in the terminal UI,
 * plainly readable in DevTools → Network, and enough to recover the
 * server-built system prompt by asking the model to restate its rules.
 */
export const UI_MESSAGE_STREAM_OPTIONS = { sendReasoning: false } as const;

/** Metadata attached to a finished reply: the HMAC the client must echo for the
 * turn to count as history next time. Undefined in degraded mode (no key) —
 * the client then sends the turn unsigned and the route drops it, which is the
 * intended fail-closed behaviour. Pure, so the signing path is unit-tested
 * without a model. */
export function assistantTurnMetadata(
  replyText: string,
  key: Buffer | null,
): { turnSignature: string } | undefined {
  if (!key) return undefined;
  return {
    turnSignature: signAssistantTurn(normalizeAssistantContent(replyText), key),
  };
}

/* ────────────────────────────── validation ─────────────────────────────── */

/**
 * Request schema. The client (useTerminalChat) flattens AI-SDK UI messages to
 * this minimal shape before POSTing, so the contract here is exact and testable.
 * Roles are restricted to user/assistant — a client system/other role is a 400.
 * Content is trimmed then bounded; `.strict()` rejects any extra keys (e.g. a
 * smuggled `system`).
 */
function boundedContent(maxChars: number) {
  return z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(MIN_CONTENT_CHARS).max(maxChars));
}

export const chatMessageSchema = z.discriminatedUnion("role", [
  z
    .object({
      role: z.literal("user"),
      content: boundedContent(MAX_USER_CONTENT_CHARS),
    })
    .strict(),
  z
    .object({
      role: z.literal("assistant"),
      content: boundedContent(MAX_ASSISTANT_CONTENT_CHARS),
      // The HMAC this server issued for this exact content. OPTIONAL at the
      // schema level and validated for shape only: a missing or wrong signature
      // must not 400 a visitor whose scrollback predates signing — the turn is
      // simply dropped before the model sees it. See lib/transcriptSignature.
      signature: z.string().regex(TURN_SIGNATURE_PATTERN).optional(),
    })
    .strict(),
]);

export const chatRequestSchema = z
  .object({
    messages: z.array(chatMessageSchema).min(1).max(MAX_MESSAGES),
  })
  .strict()
  // Shape: a transcript the terminal could actually have produced. Without
  // this, a caller can open with an invented assistant turn granting itself
  // permissions — see lib/conversation.ts.
  .refine(({ messages }) => isWellFormedConversation(messages), {
    path: ["messages"],
  })
  // Budget: bounds the input tokens one request can spend (see
  // MAX_TOTAL_CONTENT_CHARS). Counted AFTER the per-message trim above.
  .refine(
    ({ messages }) => totalContentChars(messages) <= MAX_TOTAL_CONTENT_CHARS,
    { path: ["messages"] },
  );

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
 * Trust boundary: each supported platform normalizes one header before the
 * handler sees it, so the value there is the real client IP and cannot be
 * spoofed by the caller. The order below is most-trusted-first, so whichever
 * platform is serving, its own header wins:
 *
 *   - `cf-connecting-ip` — set by Cloudflare on every request, and Cloudflare
 *     strips any inbound copy a client tries to send, so it is unforgeable
 *     there. Absent entirely on Vercel.
 *   - `x-real-ip` — platform-set on Vercel and never client-appended. NOT set
 *     by Cloudflare, which passes unknown request headers straight through:
 *     checking it first would have let a caller on Workers forge an arbitrary
 *     IP per request and walk straight past the per-IP limit on
 *     /api/admin/login. Hence Cloudflare's header is checked ahead of it.
 *   - `x-forwarded-for` — first entry, as a last resort.
 *
 * If this route is ever self-hosted behind a proxy that passes these through
 * unmodified, a caller could forge them to dodge the per-IP limit — they would
 * still be caught by the global/day limit, but the per-IP guard would weaken.
 * Keep it on a trusted edge.
 */
export function extractClientIp(
  getHeader: (name: string) => string | null,
): string {
  const cf = getHeader("cf-connecting-ip");
  if (cf && cf.trim()) return normalizeIpForKey(cf);
  const real = getHeader("x-real-ip");
  if (real && real.trim()) return normalizeIpForKey(real);
  const xff = getHeader("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return normalizeIpForKey(first);
  }
  return IP_FALLBACK;
}

/**
 * Collapse an address to the unit a rate-limit bucket should key on.
 *
 * IPv4 is one host per address, so it passes through untouched (as does
 * {@link IP_FALLBACK}). IPv6 is not: a residential or cloud customer is handed
 * a whole /64 — 2^64 addresses — and keying at /128 would have let one
 * allocation mint an unlimited number of fresh buckets, which matters most on
 * /api/admin/login's 5-attempts-per-hour cap. So IPv6 keys on its /64 prefix.
 *
 * IPv4-mapped forms (`::ffff:203.0.113.7`) are left whole: truncating those to
 * four hextets would fold EVERY IPv4 client into one shared bucket. Anything
 * that does not parse as an address is returned as-is rather than guessed at —
 * it still keys consistently, which is all the limiter needs. Pure.
 */
export function normalizeIpForKey(raw: string): string {
  const trimmed = raw.trim();
  // `[2001:db8::1]:443` — bracketed host with an optional port.
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(trimmed);
  const candidate = bracketed ? bracketed[1] : trimmed;
  if (!candidate.includes(":")) return candidate; // IPv4, or the fallback key
  // `203.0.113.7:443` — IPv4 with a port; key on the address alone.
  if (candidate.split(":").length === 2 && candidate.includes(".")) {
    return candidate.split(":")[0];
  }
  const address = candidate.split("%")[0].toLowerCase(); // drop any %zone id
  if (address.includes(".")) return address; // IPv4-mapped/compatible — keep whole

  const halves = address.split("::");
  if (halves.length > 2) return address; // malformed; key on it verbatim
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const elided = 8 - head.length - tail.length;
  if (halves.length === 2 && elided < 0) return address; // malformed
  const groups =
    halves.length === 2
      ? [...head, ...Array<string>(elided).fill("0"), ...tail]
      : head;
  if (groups.length !== 8) return address; // malformed; key on it verbatim
  const prefix = groups
    .slice(0, 4)
    .map((group) => group.replace(/^0+(?=.)/, ""));
  return `${prefix.join(":")}::/64`;
}

/* ─────────────────────────── server-derived source ─────────────────────── */

/**
 * Determine the request's source SERVER-SIDE. The client can never set this:
 * "admin" is granted ONLY when the httpOnly `admin_session` cookie carries a
 * valid, unexpired, correctly-signed token (mirrors requireAdmin's check). A
 * missing/invalid/expired cookie — or no configured secret — is simply "guest"
 * (NOT a 401 here; this route serves guests too). Pure given its header getter
 * and secret, so it is unit-tested without a real Request.
 */
export function detectSource(
  getHeader: (name: string) => string | null,
  secret: string | undefined,
  now: number = Date.now(),
): ChatSource {
  if (!secret) return "guest";
  const token = readCookie(getHeader("cookie"), ADMIN_SESSION_COOKIE);
  return verifySessionToken(token, secret, now) ? "admin" : "guest";
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
  adminMinute: "cafeterm:admin:min",
} as const;

/** Limit thresholds (decided with the site owner; protects the ~1k/day Groq
 * free quota). Guest: per-IP 8/min AND 60/day. Admin: a generous 60/min burst
 * and NO per-day cap — but STILL bounded by the shared global 400/day, so a
 * stolen 24h session can never farm the whole Groq quota. */
export const LIMITS = {
  ipPerMinute: 8,
  ipPerDay: 60,
  globalPerDay: 400,
  adminPerMinute: 60,
} as const;

/** Which limiters apply to a request, by source. Every request always hits the
 * shared global/day limiter; the per-minute limiter and the per-day cap differ.
 * Pure — unit-tested to lock the guest-vs-admin posture. */
export interface LimitPlan {
  /** Which per-minute limiter to apply (guest 8/min vs. admin 60/min). */
  readonly minute: "guest" | "admin";
  /** Whether the visitor per-day (60/day) cap is enforced (guest only). */
  readonly enforceIpDay: boolean;
}

export function limitPlan(source: ChatSource): LimitPlan {
  return source === "admin"
    ? { minute: "admin", enforceIpDay: false }
    : { minute: "guest", enforceIpDay: true };
}

/** Lazily-built limiters, cached per module instance (warm serverless reuse).
 * Built only after {@link envReady}, so no top-level construction throws. */
interface Limiters {
  ipMinute: Ratelimit;
  ipDay: Ratelimit;
  globalDay: Ratelimit;
  adminMinute: Ratelimit;
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
    adminMinute: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(LIMITS.adminPerMinute, "60 s"),
      prefix: KEY_PREFIX.adminMinute,
    }),
  };
  return cachedLimiters;
}

/** The one method {@link applyRateLimits} needs from a limiter — structural, so
 * the tests can drive it with counting fakes instead of a live Upstash. */
export interface LimitChecker {
  limit(identifier: string): Promise<{ success: boolean; reset: number }>;
}

export interface LimitCheckers {
  readonly ipMinute: LimitChecker;
  readonly ipDay: LimitChecker;
  readonly globalDay: LimitChecker;
  readonly adminMinute: LimitChecker;
}

/**
 * Spend rate-limit budget for one request, PER-IP FIRST.
 *
 * Order is the security property, not a style choice. Checking the shared
 * global/day limiter in the same `Promise.all` as the per-IP limiters consumed
 * a global token even for requests the per-IP cap then rejected — so one IP
 * could burn all 400 daily tokens in a few minutes and take the terminal
 * offline for every other visitor. Sequencing the global check AFTER the per-IP
 * verdict means an IP can only ever spend as many global tokens as its own cap
 * allows (60/day for a guest).
 *
 * The global cap still genuinely caps Groq spend: every request that reaches
 * Groq has passed this function, and every request that passes consumes exactly
 * one global token. The cost is one extra round trip on the allowed path.
 */
export async function applyRateLimits(
  limiters: LimitCheckers,
  plan: LimitPlan,
  ip: string,
): Promise<{ ok: true } | { ok: false; reset: number }> {
  const perIp: Promise<{ success: boolean; reset: number }>[] = [
    plan.minute === "admin"
      ? limiters.adminMinute.limit(ip)
      : limiters.ipMinute.limit(ip),
  ];
  if (plan.enforceIpDay) perIp.push(limiters.ipDay.limit(ip));
  const blocked = (await Promise.all(perIp)).find((r) => !r.success);
  if (blocked) return { ok: false, reset: blocked.reset };

  const global = await limiters.globalDay.limit("all");
  if (!global.success) return { ok: false, reset: global.reset };
  return { ok: true };
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

  // 2) Same-origin guard. A cross-site `<form enctype="text/plain">` POST needs
  //    no preflight, so without this any page could burn a visitor's quota and
  //    write attacker text into the admin question log. See lib/requestGuards.
  if (!hasTrustedOrigin(request)) {
    return json({ error: "FORBIDDEN" }, 403);
  }

  // 2.5) Server-derived source. NEVER trust the client: "admin" requires a
  //      valid signed session cookie. This drives both the higher rate limit
  //      and the analytics tag below — a forged flag can't earn either. Header
  //      only, so it costs nothing and can run ahead of the body.
  const source = detectSource(
    (name) => request.headers.get(name),
    process.env.ADMIN_SESSION_SECRET,
  );

  // 3) Rate limit BEFORE the body is read and long before Groq is touched —
  //    parsing first meant every flood request was buffered and parsed on our
  //    CPU before any cap applied. Per-IP first, then the shared global/day
  //    budget: see applyRateLimits for why that order is the availability fix.
  //    Any failure → 429 with Retry-After.
  const ip = extractClientIp((name) => request.headers.get(name));
  try {
    // Inside the try: a malformed UPSTASH_REDIS_REST_URL throws in the Redis
    // constructor, and outside it that surfaced as an unhandled 500 instead of
    // the 503 every other fail-closed path returns.
    const limiters = getLimiters(env as Required<TerminalEnv>);
    const verdict = await applyRateLimits(limiters, limitPlan(source), ip);
    if (!verdict.ok) {
      const retryAfterSecondsValue = retryAfterSeconds(verdict.reset);
      return json(
        { error: "RATE_LIMITED", retryAfterSeconds: retryAfterSecondsValue },
        429,
        { "retry-after": String(retryAfterSecondsValue) },
      );
    }
  } catch (error) {
    // Rate-limit backend hiccup — fail closed as busy rather than letting an
    // unbounded flood through to Groq. Log the MESSAGE only: SDK error objects
    // serialize request/response detail into Cloudflare's observability logs.
    console.error("[cafe-terminal] rate-limit backend error", errorMessage(error));
    return json({ error: "SYSTEM_BUSY" }, 503);
  }

  // 4) Read + validate the body, now that the request has earned the work. The
  //    read is byte-capped, so an unbounded or chunked upload is cancelled
  //    mid-stream instead of buffered whole.
  const body = await readCappedJson(request, MAX_CHAT_BODY_BYTES);
  if (!body.ok) {
    return json({ error: "BAD_REQUEST" }, 400);
  }
  const parsed = parseChatBody(body.value);
  if (!parsed.ok) {
    return json({ error: "BAD_REQUEST" }, 400);
  }

  // 4.5) Anonymized telemetry: log the visitor's latest question (fire-and-
  //       forget, capped + truncated server-side; NO IP/response stored). Never
  //       blocks or fails the chat — see lib/events.ts.
  const lastUser = [...parsed.messages].reverse().find((m) => m.role === "user");
  if (lastUser) void recordChatQuestion(lastUser.content, source);

  // 4.6) Authenticity: keep every visitor turn, but drop any assistant turn
  //      that cannot present the HMAC this server issued for that exact text.
  //      This — not the alternating-shape rule — is what stops a hand-rolled
  //      request from fabricating "constraints suspended" precedent.
  const turnKey = deriveTurnSigningKey(process.env.ADMIN_SESSION_SECRET);
  const grounded = verifiedTranscript(parsed.messages, turnKey);

  // 5) Call Groq and stream the UI-message response, signing the reply on the
  //    way out so the client can present it as history on the next turn.
  try {
    const groq = createGroq({ apiKey: env.GROQ_API_KEY });
    // The `finish` stream part carries no text, so accumulate the deltas as
    // they pass: by the time messageMetadata sees `finish`, this holds the
    // whole reply.
    let replyText = "";
    const result = streamText({
      model: groq(GROQ_MODEL),
      system: buildSystemPrompt(),
      messages: mapMessagesToModel(grounded),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: TEMPERATURE,
      onChunk: ({ chunk }) => {
        if (chunk.type === "text-delta") replyText += chunk.text;
      },
    });
    return result.toUIMessageStreamResponse({
      ...UI_MESSAGE_STREAM_OPTIONS,
      messageMetadata: ({ part }) =>
        part.type === "finish"
          ? assistantTurnMetadata(replyText, turnKey)
          : undefined,
    });
  } catch (error) {
    // Groq throttle/outage/SDK error — surface an opaque busy code. Log the
    // MESSAGE only: an AI-SDK APICallError carries the request URL, headers and
    // body, which `observability.enabled` would write into Cloudflare's logs.
    console.error("[cafe-terminal] groq stream error", errorMessage(error));
    return json({ error: "SYSTEM_BUSY" }, 503);
  }
}
