import { createHmac } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  ACCESS_JWT_HEADER,
  CLOCK_SKEW_SECONDS,
  JWKS_MIN_REFETCH_MS,
  JWKS_TTL_MS,
  accessConfigFromEnv,
  accessDeniedResponse,
  checkCfAccess,
  createAccessVerifier,
  type AccessConfig,
} from "../src/lib/cfAccess";
import {
  AUD,
  CERTS_URL,
  ISSUER,
  OWNER_EMAIL,
  TEAM_DOMAIN,
  b64url,
  claims,
  jwksBody,
  makeKey,
  signJwt,
  type TestKey,
} from "./helpers/accessJwt";

const CONFIG: AccessConfig = { teamDomain: TEAM_DOMAIN, aud: AUD, email: OWNER_EMAIL };
const NOW = 1_800_000_000_000;

let keyA: TestKey;
let keyB: TestKey;
let rogue: TestKey;

beforeAll(async () => {
  [keyA, keyB, rogue] = await Promise.all([makeKey("kid-a"), makeKey("kid-b"), makeKey("kid-a")]);
});

/** A verifier over a controllable clock and JWKS endpoint. */
function harness(initialKeys: () => TestKey[] = () => [keyA]) {
  const state = { now: NOW, keys: initialKeys(), fail: false, fetches: 0, urls: [] as string[] };
  const verifier = createAccessVerifier({
    now: () => state.now,
    fetchJson: async (url) => {
      state.fetches += 1;
      state.urls.push(url);
      if (state.fail) throw new Error("network down");
      return jwksBody(...state.keys);
    },
  });
  return { state, verifier };
}

describe("cfAccess — config from env", () => {
  const env = { CF_ACCESS_TEAM_DOMAIN: TEAM_DOMAIN, CF_ACCESS_AUD: AUD, ADMIN_ACCESS_EMAIL: OWNER_EMAIL };

  it("builds a config when every var is set", () => {
    expect(accessConfigFromEnv(env)).toEqual(CONFIG);
  });

  it("is null when any var is missing or blank", () => {
    expect(accessConfigFromEnv({})).toBeNull();
    expect(accessConfigFromEnv({ ...env, CF_ACCESS_AUD: "" })).toBeNull();
    expect(accessConfigFromEnv({ ...env, ADMIN_ACCESS_EMAIL: undefined })).toBeNull();
    expect(accessConfigFromEnv({ ...env, CF_ACCESS_TEAM_DOMAIN: "  " })).toBeNull();
  });

  it("refuses a team domain that is not a *.cloudflareaccess.com host", () => {
    for (const bad of [
      "evil.example.com",
      "https://testteam.cloudflareaccess.com",
      "testteam.cloudflareaccess.com/path",
      "testteam.cloudflareaccess.com.evil.test",
      "a.b.cloudflareaccess.com",
    ]) {
      expect(accessConfigFromEnv({ ...env, CF_ACCESS_TEAM_DOMAIN: bad })).toBeNull();
    }
  });
});

describe("cfAccess — valid tokens", () => {
  it("accepts a correctly signed token and fetches the team's certs URL", async () => {
    const { state, verifier } = harness();
    const result = await verifier.verify(await signJwt(keyA, claims(NOW)), CONFIG);
    expect(result).toEqual({ ok: true, email: OWNER_EMAIL });
    expect(state.urls).toEqual([CERTS_URL]);
  });

  it("matches the email case-insensitively and accepts a string aud", async () => {
    const { verifier } = harness();
    const token = await signJwt(keyA, claims(NOW, { email: OWNER_EMAIL.toUpperCase(), aud: AUD }));
    expect((await verifier.verify(token, CONFIG)).ok).toBe(true);
  });

  it("accepts a token with no nbf claim", async () => {
    const { verifier } = harness();
    const token = await signJwt(keyA, claims(NOW, { nbf: undefined }));
    expect((await verifier.verify(token, CONFIG)).ok).toBe(true);
  });

  it("caches the JWKS: a second verify does not refetch within the TTL", async () => {
    const { state, verifier } = harness();
    const token = await signJwt(keyA, claims(NOW));
    await verifier.verify(token, CONFIG);
    state.now += JWKS_TTL_MS - 1000;
    await verifier.verify(await signJwt(keyA, claims(state.now)), CONFIG);
    expect(state.fetches).toBe(1);
  });

  it("refetches once the TTL has passed", async () => {
    const { state, verifier } = harness();
    await verifier.verify(await signJwt(keyA, claims(NOW)), CONFIG);
    state.now += JWKS_TTL_MS + 1;
    await verifier.verify(await signJwt(keyA, claims(state.now)), CONFIG);
    expect(state.fetches).toBe(2);
  });
});

describe("cfAccess — rejections", () => {
  async function reason(token: string | null, config: AccessConfig = CONFIG): Promise<string> {
    const { verifier } = harness();
    const result = await verifier.verify(token, config);
    return result.ok ? "ok" : result.reason;
  }

  it("missing token", async () => {
    expect(await reason(null)).toBe("missing_token");
    expect(await reason("")).toBe("missing_token");
  });

  it("malformed tokens", async () => {
    expect(await reason("a.b")).toBe("malformed");
    expect(await reason("a.b.c.d")).toBe("malformed");
    expect(await reason("!!!.???.***")).toBe("malformed");
    expect(await reason(`${b64url("[]")}.${b64url("{}")}.${b64url("x")}`)).toBe("malformed");
    expect(await reason("x".repeat(9000))).toBe("malformed");
    // No kid.
    expect(await reason(await signJwt(keyA, claims(NOW), { kid: undefined }))).toBe("malformed");
  });

  it("bad signature (payload swapped after signing)", async () => {
    const good = await signJwt(keyA, claims(NOW));
    const [h, , s] = good.split(".");
    const forged = `${h}.${b64url(JSON.stringify(claims(NOW, { email: "attacker@x.test" })))}.${s}`;
    expect(await reason(forged)).toBe("bad_signature");
  });

  it("bad signature (signed by a different key claiming the same kid)", async () => {
    expect(await reason(await signJwt(rogue, claims(NOW)))).toBe("bad_signature");
  });

  it("wrong aud", async () => {
    expect(await reason(await signJwt(keyA, claims(NOW, { aud: ["other-app"] })))).toBe("bad_aud");
    expect(await reason(await signJwt(keyA, claims(NOW, { aud: undefined })))).toBe("bad_aud");
  });

  it("wrong iss", async () => {
    const token = await signJwt(keyA, claims(NOW, { iss: "https://evil.cloudflareaccess.com" }));
    expect(await reason(token)).toBe("bad_iss");
    expect(await reason(await signJwt(keyA, claims(NOW, { iss: `${ISSUER}/` })))).toBe("bad_iss");
  });

  it("expired (beyond the skew) — but tolerated within the skew", async () => {
    const nowS = Math.floor(NOW / 1000);
    const expired = await signJwt(keyA, claims(NOW, { exp: nowS - CLOCK_SKEW_SECONDS - 1 }));
    expect(await reason(expired)).toBe("expired");
    const justExpired = await signJwt(keyA, claims(NOW, { exp: nowS - 5 }));
    expect(await reason(justExpired)).toBe("ok");
    expect(await reason(await signJwt(keyA, claims(NOW, { exp: undefined })))).toBe("malformed");
    expect(await reason(await signJwt(keyA, claims(NOW, { exp: "never" })))).toBe("malformed");
  });

  it("nbf in the future (beyond the skew)", async () => {
    const nowS = Math.floor(NOW / 1000);
    const future = await signJwt(keyA, claims(NOW, { nbf: nowS + CLOCK_SKEW_SECONDS + 60 }));
    expect(await reason(future)).toBe("not_yet_valid");
    const slightlyAhead = await signJwt(keyA, claims(NOW, { nbf: nowS + 5 }));
    expect(await reason(slightlyAhead)).toBe("ok");
  });

  it("wrong or missing email", async () => {
    expect(await reason(await signJwt(keyA, claims(NOW, { email: "someone@else.test" })))).toBe(
      "wrong_email",
    );
    expect(await reason(await signJwt(keyA, claims(NOW, { email: undefined })))).toBe("wrong_email");
  });

  it("alg confusion: alg none with an empty signature", async () => {
    const h = b64url(JSON.stringify({ alg: "none", kid: "kid-a" }));
    const p = b64url(JSON.stringify(claims(NOW)));
    expect(await reason(`${h}.${p}.`)).toBe("malformed");
    expect(await reason(`${h}.${p}.${b64url("x")}`)).toBe("bad_alg");
  });

  it("alg confusion: HS256 keyed with the public modulus", async () => {
    const h = b64url(JSON.stringify({ alg: "HS256", kid: "kid-a" }));
    const p = b64url(JSON.stringify(claims(NOW)));
    const sig = createHmac("sha256", String(keyA.jwk.n)).update(`${h}.${p}`).digest("base64url");
    expect(await reason(`${h}.${p}.${sig}`)).toBe("bad_alg");
  });

  it("alg confusion: other RSA/EC algs are refused", async () => {
    for (const alg of ["RS512", "PS256", "ES256", "rs256"]) {
      expect(await reason(await signJwt(keyA, claims(NOW), { alg }))).toBe("bad_alg");
    }
  });
});

describe("cfAccess — JWKS failures and key rotation", () => {
  it("refetches ONCE on an unknown kid and accepts the rotated key", async () => {
    const { state, verifier } = harness();
    await verifier.verify(await signJwt(keyA, claims(NOW)), CONFIG);
    state.keys = [keyA, keyB]; // Access rotated in a new key
    state.now += JWKS_MIN_REFETCH_MS + 1;
    const result = await verifier.verify(await signJwt(keyB, claims(state.now)), CONFIG);
    expect(result.ok).toBe(true);
    expect(state.fetches).toBe(2);
  });

  it("rejects an unknown kid that is still unknown after the refetch", async () => {
    const { state, verifier } = harness();
    const result = await verifier.verify(await signJwt(keyB, claims(NOW)), CONFIG);
    expect(result).toEqual({ ok: false, reason: "unknown_kid" });
    expect(state.fetches).toBe(1);
  });

  it("throttles unknown-kid refetches (no fetch amplification)", async () => {
    const { state, verifier } = harness();
    await verifier.verify(await signJwt(keyA, claims(NOW)), CONFIG);
    for (let i = 0; i < 5; i += 1) {
      const r = await verifier.verify(await signJwt(keyB, claims(NOW)), CONFIG);
      expect(r).toEqual({ ok: false, reason: "unknown_kid" });
    }
    expect(state.fetches).toBe(1);
  });

  it("rejects when the JWKS fetch fails, and does not hammer the endpoint", async () => {
    const { state, verifier } = harness();
    state.fail = true;
    const token = await signJwt(keyA, claims(NOW));
    expect(await verifier.verify(token, CONFIG)).toEqual({ ok: false, reason: "jwks_unavailable" });
    expect(await verifier.verify(token, CONFIG)).toEqual({ ok: false, reason: "jwks_unavailable" });
    expect(state.fetches).toBe(1);
    // Recovers once the endpoint is back and the throttle window has passed.
    state.fail = false;
    state.now += JWKS_MIN_REFETCH_MS + 1;
    expect((await verifier.verify(await signJwt(keyA, claims(state.now)), CONFIG)).ok).toBe(true);
  });

  it("rejects a JWKS body with no usable RS256 keys", async () => {
    for (const body of [{}, { keys: [] }, { keys: [{ kty: "EC", kid: "kid-a" }] }, "nope"]) {
      const verifier = createAccessVerifier({ now: () => NOW, fetchJson: async () => body });
      const result = await verifier.verify(await signJwt(keyA, claims(NOW)), CONFIG);
      expect(result).toEqual({ ok: false, reason: "jwks_unavailable" });
    }
  });

  it("skips a JWKS key advertising a non-RS256 alg", async () => {
    const verifier = createAccessVerifier({
      now: () => NOW,
      fetchJson: async () => ({ keys: [{ ...keyA.jwk, alg: "RS512" }, keyB.jwk] }),
    });
    const result = await verifier.verify(await signJwt(keyA, claims(NOW)), CONFIG);
    expect(result).toEqual({ ok: false, reason: "unknown_kid" });
  });
});

describe("cfAccess — checkCfAccess route glue", () => {
  it("returns null for a valid header and an opaque 403 + log line otherwise", async () => {
    const { verifier } = harness();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const token = await signJwt(keyA, claims(Date.now()));
      const ok = new Request("https://x.test/api/admin/data", {
        headers: { [ACCESS_JWT_HEADER]: token },
      });
      // The harness clock is fixed at NOW; build a verifier on the real clock.
      const live = createAccessVerifier({ fetchJson: async () => jwksBody(keyA) });
      expect(await checkCfAccess(ok, CONFIG, "198.51.100.9", live)).toBeNull();
      expect(warn).not.toHaveBeenCalled();

      const denied = await checkCfAccess(
        new Request("https://x.test/api/admin/data"),
        CONFIG,
        "198.51.100.9",
        verifier,
      );
      expect(denied?.status).toBe(403);
      expect(await denied?.json()).toEqual({ error: "FORBIDDEN" });
      expect(warn).toHaveBeenCalledTimes(1);
      const [prefix, payload] = warn.mock.calls[0];
      expect(prefix).toBe("[admin-access] denied");
      expect(JSON.parse(payload as string)).toEqual({ ip: "198.51.100.9", reason: "missing_token" });
    } finally {
      warn.mockRestore();
    }
  });

  it("never logs the token or the configured email", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const live = createAccessVerifier({ fetchJson: async () => jwksBody(keyA) });
      const token = await signJwt(keyA, claims(Date.now(), { email: "intruder@x.test" }));
      const res = await checkCfAccess(
        new Request("https://x.test/", { headers: { [ACCESS_JWT_HEADER]: token } }),
        CONFIG,
        "203.0.113.1",
        live,
      );
      expect(res?.status).toBe(403);
      const logged = warn.mock.calls.flat().map(String).join(" ");
      expect(logged).toContain("wrong_email");
      expect(logged).not.toContain(token);
      expect(logged).not.toContain(OWNER_EMAIL);
      expect(logged).not.toContain("intruder@x.test");
    } finally {
      warn.mockRestore();
    }
  });
});

describe("cfAccess — denial response", () => {
  it("is an opaque 403 that no cache may keep", async () => {
    const res = accessDeniedResponse();
    expect(res.status).toBe(403);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("content-type")).toBe("application/json");
    expect(await res.json()).toEqual({ error: "FORBIDDEN" });
  });
});
