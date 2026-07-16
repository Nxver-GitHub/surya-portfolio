import { describe, expect, it } from "vitest";
import {
  MAX_PASSPHRASE_CHARS,
  loginConfigured,
  parseLoginBody,
} from "../src/app/api/admin/login/route";
import { parseBeaconBody } from "../src/app/api/beacon/route";
import {
  parseQuestionEntry,
  toCount,
} from "../src/app/api/admin/data/route";
import { isKnownRoute, normalizePathname } from "../src/lib/routes";

describe("admin login — request schema", () => {
  it("accepts a valid passphrase", () => {
    const r = parseLoginBody({ passphrase: "hunter2" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.passphrase).toBe("hunter2");
  });

  it("rejects empty, oversized, and malformed bodies", () => {
    expect(parseLoginBody({ passphrase: "" }).ok).toBe(false);
    expect(
      parseLoginBody({ passphrase: "a".repeat(MAX_PASSPHRASE_CHARS + 1) }).ok,
    ).toBe(false);
    expect(parseLoginBody({}).ok).toBe(false);
    expect(parseLoginBody({ passphrase: 123 }).ok).toBe(false);
    expect(parseLoginBody(null).ok).toBe(false);
    // Extra keys rejected (.strict) — no smuggled fields.
    expect(parseLoginBody({ passphrase: "x", admin: true }).ok).toBe(false);
  });

  it("accepts a passphrase at exactly the cap", () => {
    expect(
      parseLoginBody({ passphrase: "a".repeat(MAX_PASSPHRASE_CHARS) }).ok,
    ).toBe(true);
  });
});

describe("admin login — env gate", () => {
  it("is configured only when all four vars are present", () => {
    expect(loginConfigured({})).toBe(false);
    expect(
      loginConfigured({
        ADMIN_PASSPHRASE_SCRYPT: "s:h",
        ADMIN_SESSION_SECRET: "sec",
        UPSTASH_REDIS_REST_URL: "u",
        // token missing
      }),
    ).toBe(false);
    expect(
      loginConfigured({
        ADMIN_PASSPHRASE_SCRYPT: "s:h",
        ADMIN_SESSION_SECRET: "sec",
        UPSTASH_REDIS_REST_URL: "u",
        UPSTASH_REDIS_REST_TOKEN: "t",
      }),
    ).toBe(true);
  });
});

describe("beacon — request schema (closed route list)", () => {
  it("accepts a known route", () => {
    const r = parseBeaconBody({ route: "/garage" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.route).toBe("/garage");
  });

  it("rejects arbitrary/unknown routes and extra keys", () => {
    expect(parseBeaconBody({ route: "/etc/passwd" }).ok).toBe(false);
    expect(parseBeaconBody({ route: "https://evil.test" }).ok).toBe(false);
    expect(parseBeaconBody({ route: "/garage", extra: 1 }).ok).toBe(false);
    expect(parseBeaconBody({}).ok).toBe(false);
    expect(parseBeaconBody({ route: 42 }).ok).toBe(false);
  });
});

describe("routes — normalization", () => {
  it("recognizes known routes", () => {
    expect(isKnownRoute("/garage")).toBe(true);
    expect(isKnownRoute("/nope")).toBe(false);
  });

  it("collapses career detail pages to /career and drops unknowns", () => {
    expect(normalizePathname("/career/lofted")).toBe("/career");
    expect(normalizePathname("/career")).toBe("/career");
    expect(normalizePathname("/")).toBe("/");
    expect(normalizePathname("/garage")).toBe("/garage");
    expect(normalizePathname("/admin/data")).toBeNull();
  });
});

describe("admin data — parsing helpers", () => {
  it("parses ring entries from both string and object forms", () => {
    const obj = parseQuestionEntry({ t: 5, q: "hi", src: "admin" });
    expect(obj).toEqual({ t: 5, q: "hi", src: "admin" });
    const str = parseQuestionEntry('{"t":6,"q":"yo","src":"guest"}');
    expect(str).toEqual({ t: 6, q: "yo", src: "guest" });
  });

  it("back-compat: legacy entries without src read as guest", () => {
    expect(parseQuestionEntry({ t: 5, q: "hi" })).toEqual({
      t: 5,
      q: "hi",
      src: "guest",
    });
    // A malformed src value also falls back to guest (never spoofed to admin).
    expect(parseQuestionEntry({ t: 5, q: "hi", src: "root" })).toEqual({
      t: 5,
      q: "hi",
      src: "guest",
    });
  });

  it("drops malformed ring entries", () => {
    expect(parseQuestionEntry("not json")).toBeNull();
    expect(parseQuestionEntry({ t: "x", q: 1 })).toBeNull();
    expect(parseQuestionEntry(null)).toBeNull();
  });

  it("coerces counter reads to numbers", () => {
    expect(toCount(5)).toBe(5);
    expect(toCount("7")).toBe(7);
    expect(toCount(null)).toBe(0);
    expect(toCount("nope")).toBe(0);
  });
});
