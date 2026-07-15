import { afterEach, describe, expect, it } from "vitest";
import {
  ADMIN_SESSION_COOKIE,
  SESSION_TTL_MS,
  buildClearCookie,
  buildSessionCookie,
  mintSessionToken,
  readCookie,
  requireAdmin,
  verifySessionToken,
} from "../src/lib/adminSession";

const SECRET = "test-secret-key-do-not-use-in-prod";
const NOW = 1_700_000_000_000;
const NONCE = "deadbeefdeadbeefdeadbeefdeadbeef";

describe("adminSession — mint/verify round-trip", () => {
  it("mints a token that verifies with the same secret", () => {
    const token = mintSessionToken(SECRET, NOW, NONCE);
    const payload = verifySessionToken(token, SECRET, NOW + 1000);
    expect(payload).not.toBeNull();
    expect(payload?.expiry).toBe(NOW + SESSION_TTL_MS);
    expect(payload?.nonce).toBe(NONCE);
  });

  it("produces a three-part expiry.nonce.sig token", () => {
    const token = mintSessionToken(SECRET, NOW, NONCE);
    expect(token.split(".")).toHaveLength(3);
    expect(token.startsWith(`${NOW + SESSION_TTL_MS}.${NONCE}.`)).toBe(true);
  });
});

describe("adminSession — tampered token rejection", () => {
  it("rejects a token signed with a different secret", () => {
    const token = mintSessionToken(SECRET, NOW, NONCE);
    expect(verifySessionToken(token, "other-secret", NOW + 1000)).toBeNull();
  });

  it("rejects a token whose signature was altered", () => {
    const token = mintSessionToken(SECRET, NOW, NONCE);
    const [exp, nonce, sig] = token.split(".");
    const flipped = sig[0] === "0" ? "1" : "0";
    const bad = `${exp}.${nonce}.${flipped}${sig.slice(1)}`;
    expect(verifySessionToken(bad, SECRET, NOW + 1000)).toBeNull();
  });

  it("rejects a token whose expiry was extended (breaks the signature)", () => {
    const token = mintSessionToken(SECRET, NOW, NONCE);
    const [, nonce, sig] = token.split(".");
    const forged = `${NOW + SESSION_TTL_MS * 10}.${nonce}.${sig}`;
    expect(verifySessionToken(forged, SECRET, NOW + 1000)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifySessionToken("", SECRET, NOW)).toBeNull();
    expect(verifySessionToken(null, SECRET, NOW)).toBeNull();
    expect(verifySessionToken("a.b", SECRET, NOW)).toBeNull();
    expect(verifySessionToken("a.b.c.d", SECRET, NOW)).toBeNull();
    expect(verifySessionToken("notanumber.nonce.sig", SECRET, NOW)).toBeNull();
  });
});

describe("adminSession — expiry", () => {
  it("rejects a token at or after its expiry", () => {
    const token = mintSessionToken(SECRET, NOW, NONCE);
    const expiry = NOW + SESSION_TTL_MS;
    expect(verifySessionToken(token, SECRET, expiry)).toBeNull();
    expect(verifySessionToken(token, SECRET, expiry + 1)).toBeNull();
  });

  it("accepts a token one ms before expiry", () => {
    const token = mintSessionToken(SECRET, NOW, NONCE);
    const expiry = NOW + SESSION_TTL_MS;
    expect(verifySessionToken(token, SECRET, expiry - 1)).not.toBeNull();
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

  it("reads a named cookie from a header", () => {
    const header = `foo=1; ${ADMIN_SESSION_COOKIE}=abc.def.ghi; bar=2`;
    expect(readCookie(header, ADMIN_SESSION_COOKIE)).toBe("abc.def.ghi");
    expect(readCookie(header, "missing")).toBeNull();
    expect(readCookie(null, ADMIN_SESSION_COOKIE)).toBeNull();
  });
});

describe("adminSession — requireAdmin guard", () => {
  const original = process.env.ADMIN_SESSION_SECRET;
  afterEach(() => {
    if (original === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = original;
  });

  function req(cookie?: string): Request {
    return new Request("https://x.test/api/admin/data", {
      headers: cookie ? { cookie } : {},
    });
  }

  it("503s when the secret is not configured (never a bypass)", () => {
    delete process.env.ADMIN_SESSION_SECRET;
    const result = requireAdmin(req());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(503);
  });

  it("401s when no/invalid session cookie is present", () => {
    process.env.ADMIN_SESSION_SECRET = SECRET;
    const noCookie = requireAdmin(req());
    expect(noCookie.ok).toBe(false);
    if (!noCookie.ok) expect(noCookie.response.status).toBe(401);

    const bad = requireAdmin(req(`${ADMIN_SESSION_COOKIE}=garbage`));
    expect(bad.ok).toBe(false);
  });

  it("passes with a valid, unexpired token", () => {
    process.env.ADMIN_SESSION_SECRET = SECRET;
    const token = mintSessionToken(SECRET);
    const result = requireAdmin(req(`${ADMIN_SESSION_COOKIE}=${token}`));
    expect(result.ok).toBe(true);
  });
});
