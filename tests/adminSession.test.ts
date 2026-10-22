import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  ADMIN_SESSION_COOKIE,
  LEGACY_ADMIN_SESSION_COOKIE,
  SESSION_EPOCH_KEY,
  SESSION_TTL_MS,
  buildClearCookie,
  buildLegacyClearCookie,
  buildSessionCookie,
  deriveSessionKey,
  mintSessionToken,
  readCookie,
  redisEpochStore,
  requireAdmin,
  sessionConfigFromEnv,
  verifyCurrentSession,
  verifySessionToken,
  type SessionConfig,
  type SessionEpochStore,
} from "../src/lib/adminSession";

const SECRET = "test-secret-key-do-not-use-in-prod";
const HASH = "32768:8:3:aabb:ccdd";
const KEY = deriveSessionKey(SECRET, HASH);
const NOW = 1_700_000_000_000;
const NONCE = "deadbeefdeadbeefdeadbeefdeadbeef";

/** In-memory epoch store; `fail` makes every call throw (Redis down). */
function memoryStore(initial: number | null = null): SessionEpochStore & {
  value: number | null;
  fail: boolean;
  bumps: number;
} {
  const store = {
    value: initial,
    fail: false,
    bumps: 0,
    async current() {
      if (store.fail) throw new Error("redis down");
      return store.value;
    },
    async bump() {
      if (store.fail) throw new Error("redis down");
      store.bumps += 1;
      store.value = (store.value ?? 0) + 1;
      return store.value;
    },
  };
  return store;
}

describe("adminSession — key derivation", () => {
  it("changes when the passphrase hash changes (passphrase rotation revokes)", () => {
    const other = deriveSessionKey(SECRET, "32768:8:3:aabb:eeff");
    expect(other.equals(KEY)).toBe(false);
    const token = mintSessionToken(KEY, 1, NOW, NONCE);
    expect(verifySessionToken(token, other, NOW + 1000)).toBeNull();
  });

  it("changes when the session secret changes", () => {
    expect(deriveSessionKey("another-secret", HASH).equals(KEY)).toBe(false);
  });

  it("is domain-separated: never the raw secret's HMAC of the hash", () => {
    const naive = createHmac("sha256", SECRET).update(HASH).digest();
    expect(naive.equals(KEY)).toBe(false);
  });
});

describe("adminSession — mint/verify round-trip", () => {
  it("mints a token that verifies with the same key", () => {
    const token = mintSessionToken(KEY, 7, NOW, NONCE);
    const payload = verifySessionToken(token, KEY, NOW + 1000);
    expect(payload).toEqual({ epoch: 7, expiry: NOW + SESSION_TTL_MS, nonce: NONCE });
  });

  it("produces a five-part v2.epoch.expiry.nonce.sig token", () => {
    const token = mintSessionToken(KEY, 3, NOW, NONCE);
    expect(token.split(".")).toHaveLength(5);
    expect(token.startsWith(`v2.3.${NOW + SESSION_TTL_MS}.${NONCE}.`)).toBe(true);
  });
});

describe("adminSession — tampered token rejection", () => {
  it("rejects a token signed with a different key", () => {
    const token = mintSessionToken(KEY, 1, NOW, NONCE);
    expect(verifySessionToken(token, deriveSessionKey("x", HASH), NOW + 1000)).toBeNull();
  });

  it("rejects a token whose signature was altered", () => {
    const token = mintSessionToken(KEY, 1, NOW, NONCE);
    const parts = token.split(".");
    const sig = parts[4];
    parts[4] = `${sig[0] === "0" ? "1" : "0"}${sig.slice(1)}`;
    expect(verifySessionToken(parts.join("."), KEY, NOW + 1000)).toBeNull();
  });

  it("rejects a token whose expiry was extended (breaks the signature)", () => {
    const parts = mintSessionToken(KEY, 1, NOW, NONCE).split(".");
    parts[2] = String(NOW + SESSION_TTL_MS * 10);
    expect(verifySessionToken(parts.join("."), KEY, NOW + 1000)).toBeNull();
  });

  it("rejects a token whose epoch was edited (breaks the signature)", () => {
    const parts = mintSessionToken(KEY, 1, NOW, NONCE).split(".");
    parts[1] = "2";
    expect(verifySessionToken(parts.join("."), KEY, NOW + 1000)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifySessionToken("", KEY, NOW)).toBeNull();
    expect(verifySessionToken(null, KEY, NOW)).toBeNull();
    expect(verifySessionToken("a.b", KEY, NOW)).toBeNull();
    expect(verifySessionToken("v2.1.2.3", KEY, NOW)).toBeNull();
    expect(verifySessionToken("v2.x.1.n.sig", KEY, NOW)).toBeNull();
    expect(verifySessionToken("v2.0.1.n.sig", KEY, NOW)).toBeNull();
    expect(verifySessionToken("v1.1.1.n.sig", KEY, NOW)).toBeNull();
  });

  it("rejects an old-format expiry.nonce.sig token outright", () => {
    const expiry = NOW + SESSION_TTL_MS;
    const sig = createHmac("sha256", SECRET).update(`${expiry}.${NONCE}`).digest("hex");
    expect(verifySessionToken(`${expiry}.${NONCE}.${sig}`, KEY, NOW)).toBeNull();
  });
});

describe("adminSession — expiry", () => {
  it("rejects a token at or after its expiry", () => {
    const token = mintSessionToken(KEY, 1, NOW, NONCE);
    const expiry = NOW + SESSION_TTL_MS;
    expect(verifySessionToken(token, KEY, expiry)).toBeNull();
    expect(verifySessionToken(token, KEY, expiry + 1)).toBeNull();
  });

  it("accepts a token one ms before expiry", () => {
    const token = mintSessionToken(KEY, 1, NOW, NONCE);
    expect(verifySessionToken(token, KEY, NOW + SESSION_TTL_MS - 1)).not.toBeNull();
  });
});

describe("adminSession — epoch (single, revocable session)", () => {
  it("accepts a token from the current epoch", async () => {
    const store = memoryStore(4);
    const token = mintSessionToken(KEY, 4, NOW, NONCE);
    const check = await verifyCurrentSession(token, KEY, store, NOW + 1);
    expect(check.status).toBe("valid");
  });

  it("rejects an older session once a newer login advanced the epoch", async () => {
    const store = memoryStore(null);
    const first = mintSessionToken(KEY, await store.bump(), NOW, NONCE);
    const second = mintSessionToken(KEY, await store.bump(), NOW, NONCE);
    expect((await verifyCurrentSession(first, KEY, store, NOW + 1)).status).toBe("invalid");
    expect((await verifyCurrentSession(second, KEY, store, NOW + 1)).status).toBe("valid");
  });

  it("rejects every token when no epoch has ever been set", async () => {
    const token = mintSessionToken(KEY, 1, NOW, NONCE);
    expect((await verifyCurrentSession(token, KEY, memoryStore(null), NOW + 1)).status).toBe(
      "invalid",
    );
  });

  it("fails closed (unavailable) when the store errors", async () => {
    const store = memoryStore(1);
    store.fail = true;
    const token = mintSessionToken(KEY, 1, NOW, NONCE);
    expect((await verifyCurrentSession(token, KEY, store, NOW + 1)).status).toBe("unavailable");
  });

  it("never reads the store for a badly signed token", async () => {
    const store = memoryStore(1);
    store.fail = true; // would surface as "unavailable" if it were read
    expect((await verifyCurrentSession("garbage", KEY, store, NOW)).status).toBe("invalid");
  });

  it("redisEpochStore reads/increments the epoch key and coerces strings", async () => {
    const calls: string[] = [];
    const store = redisEpochStore({
      get: async (key) => {
        calls.push(`get:${key}`);
        return "5";
      },
      incr: async (key) => {
        calls.push(`incr:${key}`);
        return 6;
      },
    });
    expect(await store.current()).toBe(5);
    expect(await store.bump()).toBe(6);
    expect(calls).toEqual([`get:${SESSION_EPOCH_KEY}`, `incr:${SESSION_EPOCH_KEY}`]);
  });

  it("redisEpochStore treats a corrupt stored epoch as an error, not a match", async () => {
    const store = redisEpochStore({ get: async () => "abc", incr: async () => 1 });
    await expect(store.current()).rejects.toThrow();
  });
});

describe("adminSession — cookies", () => {
  it("sets hardened flags on the session cookie", () => {
    const cookie = buildSessionCookie("token123");
    expect(cookie).toContain(`${ADMIN_SESSION_COOKIE}=token123`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain(`Max-Age=${SESSION_TTL_MS / 1000}`);
  });

  it("clear cookie expires immediately", () => {
    const cookie = buildClearCookie();
    expect(cookie).toContain(`${ADMIN_SESSION_COOKIE}=`);
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("HttpOnly");
  });

  // The __Host- prefix is only honoured for Secure + Path=/ + no Domain; any
  // other shape and the browser silently drops the cookie (no admin login).
  it("uses the __Host- prefix with exactly the attributes it requires", () => {
    expect(ADMIN_SESSION_COOKIE).toBe("__Host-admin_session");
    for (const cookie of [buildSessionCookie("t"), buildClearCookie()]) {
      expect(cookie.startsWith("__Host-admin_session=")).toBe(true);
      expect(cookie.split("; ")).toContain("Path=/");
      expect(cookie.split("; ")).toContain("Secure");
      expect(cookie.toLowerCase()).not.toContain("domain=");
    }
  });

  it("the legacy clear cookie expires the pre-rename admin_session name", () => {
    expect(LEGACY_ADMIN_SESSION_COOKIE).toBe("admin_session");
    const cookie = buildLegacyClearCookie();
    expect(cookie.startsWith("admin_session=; ")).toBe(true);
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("Path=/");
  });

  it("reads a named cookie from a header", () => {
    const header = `foo=1; ${ADMIN_SESSION_COOKIE}=abc.def.ghi; bar=2`;
    expect(readCookie(header, ADMIN_SESSION_COOKIE)).toBe("abc.def.ghi");
    expect(readCookie(header, "missing")).toBeNull();
    expect(readCookie(null, ADMIN_SESSION_COOKIE)).toBeNull();
  });
});

describe("adminSession — sessionConfigFromEnv", () => {
  const full = {
    ADMIN_SESSION_SECRET: SECRET,
    ADMIN_PASSPHRASE_SCRYPT: HASH,
    UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "t",
  };

  it("is null when any required var is missing (never a bypass)", () => {
    for (const key of Object.keys(full) as (keyof typeof full)[]) {
      expect(sessionConfigFromEnv({ ...full, [key]: undefined })).toBeNull();
    }
  });

  it("derives the key from the secret AND the passphrase hash", () => {
    const config = sessionConfigFromEnv(full);
    expect(config?.key.equals(KEY)).toBe(true);
  });
});

describe("adminSession — requireAdmin guard", () => {
  function req(cookie?: string): Request {
    return new Request("https://x.test/api/admin/data", {
      headers: cookie ? { cookie } : {},
    });
  }
  const config = (store: SessionEpochStore): SessionConfig => ({ key: KEY, store });

  it("503s ADMIN_NOT_CONFIGURED when the session config is absent", async () => {
    const result = await requireAdmin(req(), null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(503);
      expect(await result.response.json()).toEqual({ error: "ADMIN_NOT_CONFIGURED" });
    }
  });

  it("401s when no/invalid session cookie is present", async () => {
    const store = memoryStore(1);
    const noCookie = await requireAdmin(req(), config(store));
    expect(noCookie.ok).toBe(false);
    if (!noCookie.ok) expect(noCookie.response.status).toBe(401);
    const bad = await requireAdmin(req(`${ADMIN_SESSION_COOKIE}=garbage`), config(store));
    expect(bad.ok).toBe(false);
  });

  it("401s a validly signed token from a superseded epoch", async () => {
    const token = mintSessionToken(KEY, 1);
    const result = await requireAdmin(req(`${ADMIN_SESSION_COOKIE}=${token}`), config(memoryStore(2)));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("503s SYSTEM_BUSY (fail closed) when the epoch store errors", async () => {
    const store = memoryStore(1);
    store.fail = true;
    const token = mintSessionToken(KEY, 1);
    const result = await requireAdmin(req(`${ADMIN_SESSION_COOKIE}=${token}`), config(store));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(503);
      expect(await result.response.json()).toEqual({ error: "SYSTEM_BUSY" });
    }
  });

  it("every guard refusal is private, no-store", async () => {
    const store = memoryStore(1);
    const unauth = await requireAdmin(req(), config(store));
    store.fail = true;
    const busy = await requireAdmin(req(`${ADMIN_SESSION_COOKIE}=${mintSessionToken(KEY, 1)}`), config(store));
    for (const result of [unauth, busy]) {
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.headers.get("cache-control")).toBe("private, no-store");
      }
    }
  });

  it("ignores a valid token presented under the legacy admin_session name", async () => {
    const token = mintSessionToken(KEY, 1);
    const result = await requireAdmin(req(`admin_session=${token}`), config(memoryStore(1)));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("passes with a valid, unexpired, current-epoch token", async () => {
    const token = mintSessionToken(KEY, 1);
    const result = await requireAdmin(req(`${ADMIN_SESSION_COOKIE}=${token}`), config(memoryStore(1)));
    expect(result.ok).toBe(true);
  });
});
