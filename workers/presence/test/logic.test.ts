import { describe, expect, it } from "vitest";
import { PRESENCE_LIMITS } from "../../../src/lib/presence/protocol";
import {
  chargeFrame,
  ipBucket,
  isStale,
  newAttachment,
  UNKNOWN_IP,
  type PresenceAttachment,
} from "../src/logic";

const T0 = 1_700_000_000_000;
const base = (): PresenceAttachment => newAttachment([], "hash", T0);

describe("ipBucket", () => {
  it("uses an IPv4 address whole", () => {
    expect(ipBucket("203.0.113.9")).toBe("203.0.113.9");
  });
  it("collapses an IPv6 host's /64 into one bucket", () => {
    const a = ipBucket("2001:db8:85a3:1::1");
    const b = ipBucket("2001:0db8:85a3:0001:ffff:ffff:ffff:ffff");
    expect(a).toBe("2001:0db8:85a3:0001::/64");
    expect(b).toBe(a);
    expect(ipBucket("2001:db8:85a3:2::1")).not.toBe(a);
  });
  it("fails closed on anything it cannot parse", () => {
    expect(ipBucket(null)).toBe(UNKNOWN_IP);
    expect(ipBucket("")).toBe(UNKNOWN_IP);
    expect(ipBucket("1:::2")).toBe(UNKNOWN_IP);
    expect(ipBucket("zz:1")).toBe(UNKNOWN_IP);
    expect(ipBucket("1:2:3:4:5:6:7:8:9")).toBe(UNKNOWN_IP);
  });
});

describe("chargeFrame", () => {
  it("allows up to frameBurst frames in a window, then floods", () => {
    let a = base();
    for (let i = 0; i < PRESENCE_LIMITS.frameBurst; i += 1) {
      const r = chargeFrame(a, T0 + i);
      expect(r.kind).toBe("ok");
      if (r.kind === "ok") a = r.attachment;
    }
    expect(chargeFrame(a, T0 + 50).kind).toBe("flood");
  });
  it("resets the window after frameWindowMs", () => {
    let a = base();
    for (let i = 0; i < PRESENCE_LIMITS.frameBurst; i += 1) {
      const r = chargeFrame(a, T0);
      if (r.kind === "ok") a = r.attachment;
    }
    const later = chargeFrame(a, T0 + PRESENCE_LIMITS.frameWindowMs);
    expect(later.kind).toBe("ok");
    if (later.kind === "ok") expect(later.attachment.frameCount).toBe(1);
  });
  it("records activity without mutating the input", () => {
    const a = base();
    const r = chargeFrame(a, T0 + 5);
    expect(a.lastSeenAt).toBe(T0);
    if (r.kind === "ok") expect(r.attachment.lastSeenAt).toBe(T0 + 5);
  });
});

describe("isStale", () => {
  it("is false for a socket that heartbeats", () => {
    expect(isStale(base(), T0 + PRESENCE_LIMITS.idleMs)).toBe(false);
  });
  it("is true once idle past idleMs", () => {
    expect(isStale(base(), T0 + PRESENCE_LIMITS.idleMs + 1)).toBe(true);
  });
  it("is true once the session ceiling passes even with activity", () => {
    const a = { ...base(), lastSeenAt: T0 + PRESENCE_LIMITS.maxSessionMs };
    expect(isStale(a, T0 + PRESENCE_LIMITS.maxSessionMs + 1)).toBe(true);
  });
});
