import { randomBytes, scryptSync } from "node:crypto";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUD,
  CERTS_URL,
  OWNER_EMAIL,
  TEAM_DOMAIN,
  claims,
  jwksBody,
  makeKey,
  signJwt,
  type TestKey,
} from "./helpers/accessJwt";

/**
 * Shared, mutable rate-limit verdict the mocked Ratelimit instances read from.
 * `vi.hoisted` so it exists before the hoisted `vi.mock` factories below run.
 */
const limiterState = vi.hoisted(() => ({
  success: true,
  reset: 0,
  calls: 0,
}));

/** In-memory stand-in for the Upstash keys the admin routes touch. */
const redisState = vi.hoisted(() => ({
  values: new Map<string, number>(),
  fail: false,
}));

vi.mock("@upstash/redis", () => ({
  // A plain function (not an arrow) so `new Redis(...)` works — arrow
  // functions have no [[Construct]] and vi.fn() forwards `new` straight
  // through to the mock implementation.
  Redis: vi.fn().mockImplementation(function Redis() {
    return {
      async get(key: string) {
        if (redisState.fail) throw new Error("redis down");
        return redisState.values.get(key) ?? null;
      },
      async incr(key: string) {
        if (redisState.fail) throw new Error("redis down");
        const next = (redisState.values.get(key) ?? 0) + 1;
        redisState.values.set(key, next);
        return next;
      },
      async lrange() {
        return [];
      },
      async mget(...keys: string[]) {
        return keys.map(() => null);
      },
    };
  }),
}));

vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    static slidingWindow() {
      return {};
    }
    static fixedWindow() {
      return {};
    }
    async limit() {
      limiterState.calls += 1;
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
import { ADMIN_SESSION_COOKIE, SESSION_EPOCH_KEY } from "../src/lib/adminSession";
import { ACCESS_JWT_HEADER } from "../src/lib/cfAccess";
import { logAuthFailure, POST } from "../src/app/api/admin/login/route";
import { GET as dataGET } from "../src/app/api/admin/data/route";
import { POST as logoutPOST } from "../src/app/api/admin/logout/route";

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

let accessKey: TestKey;
let accessToken: string;

beforeAll(async () => {
  accessKey = await makeKey("route-kid");
  accessToken = await signJwt(accessKey, claims(Date.now()));
});

function baseHeaders(access: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    origin: "https://suryapugaz.com",
    host: "suryapugaz.com",
    "cf-connecting-ip": CLIENT_IP,
  };
  if (access) headers[ACCESS_JWT_HEADER] = access;
  return headers;
}

function loginRequest(passphrase: string, access: string | null = accessToken): Request {
  return new Request("https://suryapugaz.com/api/admin/login", {
    method: "POST",
    headers: baseHeaders(access),
    body: JSON.stringify({ passphrase }),
  });
}

function dataRequest(sessionToken: string | null, access: string | null = accessToken): Request {
  const headers = baseHeaders(access);
  if (sessionToken) headers.cookie = `${ADMIN_SESSION_COOKIE}=${sessionToken}`;
  return new Request("https://suryapugaz.com/api/admin/data", { headers });
}

/** The session token a successful login set. */
function tokenFrom(res: Response): string {
  const cookie = res.headers.get("set-cookie") ?? "";
  const match = cookie.match(new RegExp(`${ADMIN_SESSION_COOKIE}=([^;]+)`));
  if (!match) throw new Error("no session cookie");
  return match[1];
}

/** Every string argument any console call was made with, flattened. */
function allStrings(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls.flat().map((arg: unknown) => String(arg));
}

const ENV_KEYS = [
  "ADMIN_PASSPHRASE_SCRYPT",
  "ADMIN_SESSION_SECRET",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "CF_ACCESS_TEAM_DOMAIN",
  "CF_ACCESS_AUD",
  "ADMIN_ACCESS_EMAIL",
] as const;

let warnSpy: ReturnType<typeof vi.spyOn>;
let infoSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  limiterState.success = true;
  limiterState.reset = 0;
  limiterState.calls = 0;
  redisState.values.clear();
  redisState.fail = false;
  verifyOverride.outcome = null;
  process.env.ADMIN_PASSPHRASE_SCRYPT = STORED_HASH;
  process.env.ADMIN_SESSION_SECRET = "test-session-secret";
  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  process.env.CF_ACCESS_TEAM_DOMAIN = TEAM_DOMAIN;
  process.env.CF_ACCESS_AUD = AUD;
  process.env.ADMIN_ACCESS_EMAIL = OWNER_EMAIL;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url !== CERTS_URL) throw new Error(`unexpected fetch ${url}`);
      return new Response(JSON.stringify(jwksBody(accessKey)), {
        headers: { "content-type": "application/json" },
      });
    }),
  );
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
});

afterEach(() => {
  warnSpy.mockRestore();
  infoSpy.mockRestore();
  vi.unstubAllGlobals();
  for (const key of ENV_KEYS) delete process.env[key];
});

describe("admin login — structured failed-login log line", () => {
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

    const logged = allStrings(warnSpy).join(" ");
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

    const logged = allStrings(warnSpy).join(" ");
    expect(logged).not.toContain(PASSPHRASE);
  });

  it("truncates a wildly oversized ip header to MAX_LOGGED_IP_CHARS in the log line", async () => {
    const hugeIp = "9".repeat(500);
    const request = new Request("https://suryapugaz.com/api/admin/login", {
      method: "POST",
      headers: { ...baseHeaders(accessToken), "cf-connecting-ip": hugeIp },
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

describe("admin login — success audit line + session epoch", () => {
  it("logs exactly one [admin-login] success {ip} line and no warning", async () => {
    const res = await POST(loginRequest(PASSPHRASE));
    expect(res.status).toBe(200);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledTimes(1);
    const [prefix, payload] = infoSpy.mock.calls[0];
    expect(prefix).toBe("[admin-login] success");
    expect(JSON.parse(payload as string)).toEqual({ ip: CLIENT_IP });

    const logged = allStrings(infoSpy).join(" ");
    expect(logged).not.toContain(PASSPHRASE);
    expect(logged).not.toContain(STORED_HASH);
    expect(logged).not.toContain(OWNER_EMAIL);
    expect(logged).not.toContain(tokenFrom(res));
  });

  it("advances the epoch on each login and signs it into the cookie", async () => {
    const first = tokenFrom(await POST(loginRequest(PASSPHRASE)));
    const second = tokenFrom(await POST(loginRequest(PASSPHRASE)));
    expect(first.split(".").slice(0, 2)).toEqual(["v2", "1"]);
    expect(second.split(".").slice(0, 2)).toEqual(["v2", "2"]);
    expect(redisState.values.get(SESSION_EPOCH_KEY)).toBe(2);
  });

  it("fails closed with 503 and no cookie when the epoch cannot be advanced", async () => {
    // The limiter is mocked separately, so only the epoch store is down here.
    redisState.fail = true;
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const res = await POST(loginRequest(PASSPHRASE));
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: "SYSTEM_BUSY" });
      expect(res.headers.get("set-cookie")).toBeNull();
      expect(infoSpy).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });
});

describe("admin login — Cloudflare Access gate", () => {
  it("403s without an Access JWT, BEFORE spending rate-limit budget", async () => {
    const res = await POST(loginRequest(PASSPHRASE, null));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "FORBIDDEN" });
    expect(limiterState.calls).toBe(0);
    expect(redisState.values.size).toBe(0);
    const [prefix, payload] = warnSpy.mock.calls[0];
    expect(prefix).toBe("[admin-access] denied");
    expect(JSON.parse(payload as string)).toEqual({ ip: CLIENT_IP, reason: "missing_token" });
  });

  it("403s an Access JWT for someone else's email", async () => {
    const other = await signJwt(accessKey, claims(Date.now(), { email: "intruder@x.test" }));
    const res = await POST(loginRequest(PASSPHRASE, other));
    expect(res.status).toBe(403);
    expect(limiterState.calls).toBe(0);
    expect(JSON.parse(warnSpy.mock.calls[0][1] as string).reason).toBe("wrong_email");
  });

  it("503s ADMIN_NOT_CONFIGURED when any Access var is missing", async () => {
    for (const key of ["CF_ACCESS_TEAM_DOMAIN", "CF_ACCESS_AUD", "ADMIN_ACCESS_EMAIL"] as const) {
      const saved = process.env[key];
      delete process.env[key];
      const res = await POST(loginRequest(PASSPHRASE));
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: "ADMIN_NOT_CONFIGURED" });
      process.env[key] = saved;
    }
    expect(limiterState.calls).toBe(0);
  });

  it("still runs the origin guard before the Access check", async () => {
    const request = new Request("https://suryapugaz.com/api/admin/login", {
      method: "POST",
      headers: { ...baseHeaders(null), origin: "https://evil.test" },
      body: JSON.stringify({ passphrase: PASSPHRASE }),
    });
    const res = await POST(request);
    expect(res.status).toBe(403);
    expect(warnSpy).not.toHaveBeenCalled(); // origin guard, not an Access denial
  });
});

describe("admin data — Access + current-session guard + audit line", () => {
  it("serves the owner's current session and logs one [admin-data] read {ip} line", async () => {
    const token = tokenFrom(await POST(loginRequest(PASSPHRASE)));
    infoSpy.mockClear();
    const res = await dataGET(dataRequest(token));
    expect(res.status).toBe(200);
    expect(infoSpy).toHaveBeenCalledTimes(1);
    const [prefix, payload] = infoSpy.mock.calls[0];
    expect(prefix).toBe("[admin-data] read");
    expect(JSON.parse(payload as string)).toEqual({ ip: CLIENT_IP });
    expect(allStrings(infoSpy).join(" ")).not.toContain(token);
  });

  it("401s a session superseded by a newer login (one live session)", async () => {
    const first = tokenFrom(await POST(loginRequest(PASSPHRASE)));
    const second = tokenFrom(await POST(loginRequest(PASSPHRASE)));
    expect((await dataGET(dataRequest(first))).status).toBe(401);
    expect((await dataGET(dataRequest(second))).status).toBe(200);
  });

  it("403s a valid session that arrives without an Access JWT", async () => {
    const token = tokenFrom(await POST(loginRequest(PASSPHRASE)));
    const res = await dataGET(dataRequest(token, null));
    expect(res.status).toBe(403);
  });

  it("503s ADMIN_NOT_CONFIGURED without the Access config", async () => {
    delete process.env.CF_ACCESS_AUD;
    const res = await dataGET(dataRequest(null));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "ADMIN_NOT_CONFIGURED" });
  });

  it("logout from the current session revokes it everywhere", async () => {
    const token = tokenFrom(await POST(loginRequest(PASSPHRASE)));
    const logout = await logoutPOST(
      new Request("https://suryapugaz.com/api/admin/logout", {
        method: "POST",
        headers: { ...baseHeaders(null), cookie: `${ADMIN_SESSION_COOKIE}=${token}` },
      }),
    );
    expect(logout.status).toBe(200);
    expect(redisState.values.get(SESSION_EPOCH_KEY)).toBe(2);
    // A copy of the token (e.g. stolen) is now dead.
    expect((await dataGET(dataRequest(token))).status).toBe(401);
  });

  it("an unauthenticated logout does not bump the epoch", async () => {
    const token = tokenFrom(await POST(loginRequest(PASSPHRASE)));
    const logout = await logoutPOST(
      new Request("https://suryapugaz.com/api/admin/logout", {
        method: "POST",
        headers: baseHeaders(null),
      }),
    );
    expect(logout.status).toBe(200);
    expect(redisState.values.get(SESSION_EPOCH_KEY)).toBe(1);
    expect((await dataGET(dataRequest(token))).status).toBe(200);
  });
});
