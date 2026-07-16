import { describe, expect, it, vi } from "vitest";
import {
  COUNTER_TTL_SECONDS,
  QUESTION_MAX,
  RING_CAP,
  RING_KEY,
  adminChatsKey,
  chatsKey,
  dayStamp,
  recentDayStamps,
  truncateQuestion,
  viewsKey,
  writeChatQuestion,
  writePageView,
  type EventsRedis,
} from "../src/lib/events";

/** A recording mock of the minimal Redis surface events.ts uses. */
function mockRedis() {
  return {
    lpush: vi.fn(async () => 1),
    ltrim: vi.fn(async () => "OK"),
    incr: vi.fn(async () => 1),
    expire: vi.fn(async () => 1),
    lrange: vi.fn(async () => []),
    mget: vi.fn(async () => []),
  } satisfies EventsRedis;
}

describe("events — pure helpers", () => {
  it("truncates a question to the max and trims whitespace", () => {
    expect(truncateQuestion("  hello  ")).toBe("hello");
    const long = "a".repeat(500);
    expect(truncateQuestion(long).length).toBe(QUESTION_MAX);
    expect(QUESTION_MAX).toBe(280);
  });

  it("formats a UTC yyyymmdd stamp", () => {
    expect(dayStamp(new Date("2026-07-15T23:59:00Z"))).toBe("20260715");
    expect(dayStamp(new Date("2026-01-05T00:00:00Z"))).toBe("20260105");
  });

  it("lists recent day stamps newest-first", () => {
    const days = recentDayStamps(7, new Date("2026-07-15T12:00:00Z"));
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("20260715");
    expect(days[6]).toBe("20260709");
  });

  it("builds namespaced counter keys", () => {
    expect(viewsKey("/garage", "20260715")).toBe("views:/garage:20260715");
    expect(chatsKey("20260715")).toBe("chats:20260715");
    expect(adminChatsKey("20260715")).toBe("adminchats:20260715");
  });
});

describe("events — writeChatQuestion", () => {
  it("pushes a truncated {t,q,src} entry, caps the ring, and bumps the GUEST counter", async () => {
    const redis = mockRedis();
    const now = new Date("2026-07-15T12:00:00Z");
    const question = "x".repeat(400); // over the cap
    await writeChatQuestion(redis, question, "guest", now);

    expect(redis.lpush).toHaveBeenCalledTimes(1);
    const [key, payload] = redis.lpush.mock.calls[0];
    expect(key).toBe(RING_KEY);
    const entry = JSON.parse(payload as string);
    expect(entry.t).toBe(now.getTime());
    expect(entry.q.length).toBe(QUESTION_MAX); // truncated
    expect(entry.src).toBe("guest"); // source tagged
    expect(entry).not.toHaveProperty("ip"); // privacy: no identifiers

    // Ring capped to RING_CAP entries.
    expect(redis.ltrim).toHaveBeenCalledWith(RING_KEY, 0, RING_CAP - 1);

    // A guest chat bumps the VISITOR counter, never the admin one.
    expect(redis.incr).toHaveBeenCalledWith(chatsKey("20260715"));
    expect(redis.incr).not.toHaveBeenCalledWith(adminChatsKey("20260715"));
    expect(redis.expire).toHaveBeenCalledWith(
      chatsKey("20260715"),
      COUNTER_TTL_SECONDS,
    );
  });

  it("tags an admin entry and bumps the ADMIN counter, never the visitor one", async () => {
    const redis = mockRedis();
    const now = new Date("2026-07-15T12:00:00Z");
    await writeChatQuestion(redis, "how many hits today?", "admin", now);

    const [, payload] = redis.lpush.mock.calls[0];
    expect(JSON.parse(payload as string).src).toBe("admin");

    // Admin chat increments ONLY the separate admin counter — visitor analytics
    // stay clean.
    expect(redis.incr).toHaveBeenCalledWith(adminChatsKey("20260715"));
    expect(redis.incr).not.toHaveBeenCalledWith(chatsKey("20260715"));
    expect(redis.expire).toHaveBeenCalledWith(
      adminChatsKey("20260715"),
      COUNTER_TTL_SECONDS,
    );
  });
});

describe("events — writePageView", () => {
  it("increments the per-route/day counter with a TTL", async () => {
    const redis = mockRedis();
    const now = new Date("2026-07-15T12:00:00Z");
    await writePageView(redis, "/garage", now);
    expect(redis.incr).toHaveBeenCalledWith(viewsKey("/garage", "20260715"));
    expect(redis.expire).toHaveBeenCalledWith(
      viewsKey("/garage", "20260715"),
      COUNTER_TTL_SECONDS,
    );
    // No list writes for a page view.
    expect(redis.lpush).not.toHaveBeenCalled();
  });
});
