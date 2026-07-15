/**
 * events — anonymized, capped analytics written to the SAME Upstash Redis the
 * terminal rate-limiter already uses (E11). This is the site's only telemetry.
 *
 * PRIVACY POLICY (enforced here, not optional):
 *   - NO IP addresses, NO session ids, NO cookies, NO user agents are ever
 *     written. NO assistant/response text is stored — only the guest's question.
 *   - Question text is trimmed and truncated to {@link QUESTION_MAX} chars.
 *   - The question ring buffer is hard-capped at {@link RING_CAP} entries
 *     (LPUSH + LTRIM), so storage is bounded no matter the traffic.
 *   - Daily counters carry a ~90-day TTL and then expire on their own.
 *
 * RELIABILITY: every write is fire-and-forget. A telemetry failure must NEVER
 * block or fail a visitor's request, so the public helpers swallow errors and
 * log them server-side only. Callers use `void recordChatQuestion(...)`.
 *
 * The pure key/shape helpers and the low-level `writeChatQuestion` /
 * `writePageView` (which take an injected client) are exported for unit tests
 * that assert truncation + cap behavior against a mock Redis — no network.
 */

import { Redis } from "@upstash/redis";

/** Ring-buffer key holding recent guest questions (newest at head via LPUSH). */
export const RING_KEY = "guest-questions";
/** Hard cap on ring-buffer length. LTRIM keeps indices [0, RING_CAP-1]. */
export const RING_CAP = 200;
/** Max stored question length, in characters (after trim). */
export const QUESTION_MAX = 280;
/** TTL applied to daily counters: 90 days, in seconds. */
export const COUNTER_TTL_SECONDS = 90 * 24 * 60 * 60;

/** One stored question entry — timestamp + truncated text ONLY. */
export interface QuestionEntry {
  /** Epoch milliseconds the question was recorded. */
  readonly t: number;
  /** Trimmed + truncated question text (≤ {@link QUESTION_MAX}). */
  readonly q: string;
}

/** The minimal Redis surface these helpers need — satisfied by @upstash/redis
 * and by the test mock. Keeps the writes injectable and unit-testable. */
export interface EventsRedis {
  lpush(key: string, ...values: string[]): Promise<number>;
  ltrim(key: string, start: number, stop: number): Promise<unknown>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
  lrange(key: string, start: number, stop: number): Promise<unknown[]>;
  mget(...keys: string[]): Promise<(unknown | null)[]>;
}

/* ────────────────────────────── pure helpers ───────────────────────────── */

/** Trim then truncate a question to {@link QUESTION_MAX} code points — code
 * points, not UTF-16 units, so a cut never strands half a surrogate pair. */
export function truncateQuestion(raw: string, max: number = QUESTION_MAX): string {
  return Array.from(raw.trim()).slice(0, max).join("");
}

/** yyyymmdd stamp (UTC) for the given date. Pure. */
export function dayStamp(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/** The last `n` day stamps ending today (index 0 = today), UTC. Pure. */
export function recentDayStamps(n: number, now: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(dayStamp(d));
  }
  return out;
}

/** Redis key for a route's page-view counter on a given day. Pure. */
export function viewsKey(route: string, day: string): string {
  return `views:${route}:${day}`;
}

/** Redis key for the chat counter on a given day. Pure. */
export function chatsKey(day: string): string {
  return `chats:${day}`;
}

/* ───────────────────────────── low-level writes ─────────────────────────── */

/**
 * Append one guest question to the ring buffer (truncated), trim to the cap, and
 * bump today's chat counter with a TTL. Takes an injected client so tests can
 * assert the exact calls against a mock. Awaited by the fire-and-forget wrapper.
 */
export async function writeChatQuestion(
  client: EventsRedis,
  question: string,
  now: Date = new Date(),
): Promise<void> {
  const entry: QuestionEntry = {
    t: now.getTime(),
    q: truncateQuestion(question),
  };
  await client.lpush(RING_KEY, JSON.stringify(entry));
  await client.ltrim(RING_KEY, 0, RING_CAP - 1);
  const key = chatsKey(dayStamp(now));
  await client.incr(key);
  await client.expire(key, COUNTER_TTL_SECONDS);
}

/**
 * Bump a route's page-view counter for today with a TTL. Takes an injected
 * client for testing. The route is assumed already validated against the known
 * list by the caller — never pass arbitrary strings here.
 */
export async function writePageView(
  client: EventsRedis,
  route: string,
  now: Date = new Date(),
): Promise<void> {
  const key = viewsKey(route, dayStamp(now));
  await client.incr(key);
  await client.expire(key, COUNTER_TTL_SECONDS);
}

/* ────────────────────────────── client + wrappers ──────────────────────── */

/** Build the Upstash client, or null when its env is absent (keyless-safe). */
export function getEventsRedis(): EventsRedis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token }) as unknown as EventsRedis;
}

/**
 * Fire-and-forget: record a guest question. Never throws, never rejects to the
 * caller — a telemetry failure must not affect the visitor's chat request.
 */
export async function recordChatQuestion(question: string): Promise<void> {
  try {
    const client = getEventsRedis();
    if (!client) return;
    await writeChatQuestion(client, question);
  } catch (error) {
    console.error("[events] recordChatQuestion failed", error);
  }
}

/**
 * Fire-and-forget: record a page view for an already-validated route. Never
 * throws — losing a page-view count must never break browsing.
 */
export async function recordPageView(route: string): Promise<void> {
  try {
    const client = getEventsRedis();
    if (!client) return;
    await writePageView(client, route);
  } catch (error) {
    console.error("[events] recordPageView failed", error);
  }
}
