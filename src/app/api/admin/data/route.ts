/**
 * GET /api/admin/data — the read foundation for the admin CLI (E11).
 *
 * requireAdmin-guarded. Returns the anonymized telemetry the future admin UI
 * renders: the guest-question ring buffer (newest first), 7-day view/chat
 * rollups, and build sysinfo. Read-only; writes NOTHING. The response shape is
 * exported as `adminDataResponseSchema` so the CLI can type against one contract.
 *
 * Fails closed via requireAdmin (503 if unconfigured, 401 if unauthenticated).
 */

import { z } from "zod";
import { requireAdmin } from "@/lib/adminSession";
import {
  RING_KEY,
  RING_CAP,
  chatsKey,
  adminChatsKey,
  viewsKey,
  recentDayStamps,
  getEventsRedis,
  type QuestionEntry,
} from "@/lib/events";
import { KNOWN_ROUTES } from "@/lib/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** How many days of rollup the dashboard shows. */
export const ROLLUP_DAYS = 7;

/** Build-time constant — the moment this bundle was built (≈ deploy time). */
const DEPLOYED_AT = new Date().toISOString();

/* ────────────────────────────── response shape ─────────────────────────── */

const dayCountSchema = z.object({ day: z.string(), count: z.number() });

export const questionEntrySchema = z.object({
  t: z.number(),
  q: z.string(),
  // Back-compat: entries written before source tagging — and any malformed
  // value — read as a guest question. So old logs never break, and the tag can
  // never be spoofed into "admin" by a corrupt entry.
  src: z.enum(["guest", "admin"]).default("guest").catch("guest"),
});

export const adminDataResponseSchema = z.object({
  logs: z.array(questionEntrySchema),
  stats: z.object({
    viewsByRoute7d: z.record(z.string(), z.number()),
    chatsPerDay7d: z.array(dayCountSchema),
    /** Owner (authed) chats per day — kept separate from visitor chats. */
    adminChatsPerDay7d: z.array(dayCountSchema),
  }),
  sysinfo: z.object({
    sha: z.string(),
    deployedAt: z.string(),
    node: z.string(),
  }),
});

export type AdminDataResponse = z.infer<typeof adminDataResponseSchema>;

/* ────────────────────────────── pure helpers ───────────────────────────── */

/**
 * Coerce one raw ring-buffer element into a {@link QuestionEntry} or null.
 * Upstash may return the stored value already JSON-parsed (object) OR as a
 * string — handle both, and drop anything that doesn't match the shape. Pure.
 */
export function parseQuestionEntry(raw: unknown): QuestionEntry | null {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  const result = questionEntrySchema.safeParse(value);
  return result.success ? result.data : null;
}

/** Coerce an Upstash counter read (number | string | null) to a number. Pure. */
export function toCount(raw: unknown): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/* ─────────────────────────────── the handler ───────────────────────────── */

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function GET(request: Request): Promise<Response> {
  const guard = requireAdmin(request);
  if (!guard.ok) return guard.response;

  const client = getEventsRedis();
  const sysinfo = {
    sha: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
    deployedAt: DEPLOYED_AT,
    node: process.version,
  };

  if (!client) {
    // Authenticated, but no telemetry backend — return an empty, valid payload.
    const empty: AdminDataResponse = {
      logs: [],
      stats: { viewsByRoute7d: {}, chatsPerDay7d: [], adminChatsPerDay7d: [] },
      sysinfo,
    };
    return json(empty, 200);
  }

  try {
    const days = recentDayStamps(ROLLUP_DAYS);

    const rawLogs = await client.lrange(RING_KEY, 0, RING_CAP - 1);
    const logs = rawLogs
      .map(parseQuestionEntry)
      .filter((e): e is QuestionEntry => e !== null);

    // Views: one MGET across every (route × day) key, summed per route.
    const viewKeys = KNOWN_ROUTES.flatMap((route) =>
      days.map((day) => viewsKey(route, day)),
    );
    const viewVals = viewKeys.length ? await client.mget(...viewKeys) : [];
    const viewsByRoute7d: Record<string, number> = {};
    KNOWN_ROUTES.forEach((route, ri) => {
      let sum = 0;
      for (let di = 0; di < days.length; di += 1) {
        sum += toCount(viewVals[ri * days.length + di]);
      }
      viewsByRoute7d[route] = sum;
    });

    // Chats: one MGET across the day keys, oldest→newest for a tidy series.
    const chatKeys = days.map(chatsKey);
    const chatVals = chatKeys.length ? await client.mget(...chatKeys) : [];
    const chatsPerDay7d = days
      .map((day, i) => ({ day, count: toCount(chatVals[i]) }))
      .reverse();

    // Admin (owner) chats: same shape, separate counter series.
    const adminChatKeys = days.map(adminChatsKey);
    const adminChatVals = adminChatKeys.length
      ? await client.mget(...adminChatKeys)
      : [];
    const adminChatsPerDay7d = days
      .map((day, i) => ({ day, count: toCount(adminChatVals[i]) }))
      .reverse();

    const payload: AdminDataResponse = {
      logs,
      stats: { viewsByRoute7d, chatsPerDay7d, adminChatsPerDay7d },
      sysinfo,
    };
    return json(payload, 200);
  } catch (error) {
    console.error("[admin-data] read error", error);
    return json({ error: "SYSTEM_BUSY" }, 503);
  }
}
