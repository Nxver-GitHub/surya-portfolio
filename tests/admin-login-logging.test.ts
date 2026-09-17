import { randomBytes, scryptSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Shared, mutable rate-limit verdict the mocked Ratelimit instances read from.
 * `vi.hoisted` so it exists before the hoisted `vi.mock` factories below run.
 */
const limiterState = vi.hoisted(() => ({
  success: true,
  reset: 0,
}));

vi.mock("@upstash/redis", () => ({
  // A plain function (not an arrow) so `new Redis(...)` works — arrow
  // functions have no [[Construct]] and vi.fn() forwards `new` straight
  // through to the mock implementation.
  Redis: vi.fn().mockImplementation(function Redis() {
    return {};
  }),
}));

vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    static slidingWindow() {
      return {};
    }
    async limit() {
      return { success: limiterState.success, reset: limiterState.reset };
    }
  }
  return { Ratelimit };
});

/** Forces one specific verifyPassphraseGuarded outcome when set; otherwise
 * falls through to the real implementation. Lets the "busy" 503 path be
 * tested deterministically without racing real concurrent scrypt calls. */
const verifyOverride = vi.hoisted(() => ({
  outcome: null as "match" | "no_match" | "busy" | null,
}));

vi.mock("../src/lib/adminAuth", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/lib/adminAuth")>();
  return {
    ...actual,
    verifyPassphraseGuarded: vi.fn(
      async (candidate: string, stored: string | undefined) => {
        if (verifyOverride.outcome) return verifyOverride.outcome;
        return actual.verifyPassphraseGuarded(candidate, stored);
      },
    ),
  };
});

import { formatStoredHash } from "../src/lib/adminAuth";
import { logAuthFailure, POST } from "../src/app/api/admin/login/route";

const PASSPHRASE = "s3cret-test-passphrase-do-not-log-me";
const CLIENT_IP = "203.0.113.7";

// In-range but cheap cost params (2^12 is adminAuth's MIN_N) — only the
// wiring is under test here, not scrypt's cost; adminAuth.test.ts covers
// cost/format/bounds behavior in depth.
const TEST_PARAMS = { N: 2 ** 12, r: 1, p: 1 };
const SALT = randomBytes(16);
const HASH = scryptSync(PASSPHRASE, SALT, 64, {
  N: TEST_PARAMS.N,
  r: TEST_PARAMS.r,
  p: TEST_PARAMS.p,
  maxmem: 32 * 1024 * 1024,
});
const STORED_HASH = formatStoredHash(TEST_PARAMS, SALT, HASH);

function loginRequest(passphrase: string): Request {
  return new Request("https://suryapugaz.com/api/admin/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://suryapugaz.com",
      host: "suryapugaz.com",
      "cf-connecting-ip": CLIENT_IP,
    },
    body: JSON.stringify({ passphrase }),
  });
}

/** Every string argument any console.warn call was made with, flattened. */
function allWarnStrings(warnSpy: ReturnType<typeof vi.spyOn>): string[] {
  return warnSpy.mock.calls.flat().map((arg: unknown) => String(arg));
}

describe("admin login — structured failed-login log line", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    limiterState.success = true;
    limiterState.reset = 0;
    verifyOverride.outcome = null;
    process.env.ADMIN_PASSPHRASE_SCRYPT = STORED_HASH;
    process.env.ADMIN_SESSION_SECRET = "test-session-secret";
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    delete process.env.ADMIN_PASSPHRASE_SCRYPT;
    delete process.env.ADMIN_SESSION_SECRET;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("logAuthFailure emits the fixed prefix and exact {ip, reason} shape", () => {
    logAuthFailure("198.51.100.1", "bad_passphrase");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [prefix, payload] = warnSpy.mock.calls[0];
    expect(prefix).toBe("[admin-login] auth_failed");
    expect(JSON.parse(payload as string)).toEqual({
      ip: "198.51.100.1",
      reason: "bad_passphrase",
    });
  });

  it("logs bad_passphrase on a wrong-passphrase 401, never the candidate text", async () => {
    const res = await POST(loginRequest("definitely wrong"));
    expect(res.status).toBe(401);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [prefix, payload] = warnSpy.mock.calls[0];
    expect(prefix).toBe("[admin-login] auth_failed");
    expect(JSON.parse(payload as string)).toEqual({
      ip: CLIENT_IP,
      reason: "bad_passphrase",
    });

    const logged = allWarnStrings(warnSpy).join(" ");
    expect(logged).not.toContain("definitely wrong");
    expect(logged).not.toContain(PASSPHRASE);
    expect(logged).not.toContain(STORED_HASH);
  });

  it("logs rate_limited (its own prefix, not auth_failed) on a 429, never the candidate passphrase", async () => {
    limiterState.success = false;
    limiterState.reset = Date.now() + 60_000;

    const res = await POST(loginRequest(PASSPHRASE));
    expect(res.status).toBe(429);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [prefix, payload] = warnSpy.mock.calls[0];
    expect(prefix).toBe("[admin-login] rate_limited");
    expect(JSON.parse(payload as string)).toEqual({
      ip: CLIENT_IP,
      reason: "rate_limited",
    });

    const logged = allWarnStrings(warnSpy).join(" ");
    expect(logged).not.toContain(PASSPHRASE);
  });

  it("does not log at all on a successful login", async () => {
    const res = await POST(loginRequest(PASSPHRASE));
    expect(res.status).toBe(200);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("truncates a wildly oversized ip header to MAX_LOGGED_IP_CHARS in the log line", async () => {
    const hugeIp = "9".repeat(500);
    const request = new Request("https://suryapugaz.com/api/admin/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://suryapugaz.com",
        host: "suryapugaz.com",
        "cf-connecting-ip": hugeIp,
      },
      body: JSON.stringify({ passphrase: "definitely wrong" }),
    });
    const res = await POST(request);
    expect(res.status).toBe(401);
    const [, payload] = warnSpy.mock.calls[0];
    const logged = JSON.parse(payload as string) as { ip: string };
    expect(logged.ip.length).toBe(45);
    expect(logged.ip).toBe("9".repeat(45));
  });

  it("maps a 'busy' verify outcome to 503 SYSTEM_BUSY without logging a failure", async () => {
    verifyOverride.outcome = "busy";
    const res = await POST(loginRequest(PASSPHRASE));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "SYSTEM_BUSY" });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("treats an unexpected verify rejection as an opaque 401, never a 500", async () => {
    const { verifyPassphraseGuarded } = await import("../src/lib/adminAuth");
    vi.mocked(verifyPassphraseGuarded).mockRejectedValueOnce(
      new Error("unexpected"),
    );
    const res = await POST(loginRequest(PASSPHRASE));
    expect(res.status).toBe(401);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [prefix, payload] = warnSpy.mock.calls[0];
    expect(prefix).toBe("[admin-login] auth_failed");
    expect(JSON.parse(payload as string).reason).toBe("bad_passphrase");
  });
});
