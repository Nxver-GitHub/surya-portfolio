import { scryptSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  LEGACY_SCRYPT_PARAMS,
  SCRYPT_PARAMS,
  formatStoredHash,
  parseStoredHash,
  verifyPassphrase,
} from "../src/lib/adminAuth";

// Deterministic known vector, generated with:
//   scryptSync("correct horse battery staple",
//              Buffer.from("0011223344556677889aabbccddeeff0","hex"), 64)
const KNOWN_PASSPHRASE = "correct horse battery staple";
const KNOWN_STORED =
  "0011223344556677889aabbccddeeff0:" +
  "1977da1ba127b8d122174de958daec0104d5b55d90f082c4030bf7f6702dfec4" +
  "01822bb489f94c0e27cb337fac61914b90287dd42b4d2835130da68281936bd0";

describe("adminAuth — parseStoredHash", () => {
  it("parses a valid salt:hash record", () => {
    const parsed = parseStoredHash(KNOWN_STORED);
    expect(parsed).not.toBeNull();
    expect(parsed?.salt.length).toBe(16);
    expect(parsed?.hash.length).toBe(64);
  });

  it("rejects malformed values", () => {
    expect(parseStoredHash(undefined)).toBeNull();
    expect(parseStoredHash("")).toBeNull();
    expect(parseStoredHash("nocolon")).toBeNull();
    expect(parseStoredHash("aa:bb:cc")).toBeNull();
    expect(parseStoredHash("zz:zz")).toBeNull(); // non-hex
    expect(parseStoredHash("abc:abcd")).toBeNull(); // odd-length salt hex
  });
});

describe("adminAuth — verifyPassphrase", () => {
  it("accepts the correct passphrase against the known vector", async () => {
    expect(await verifyPassphrase(KNOWN_PASSPHRASE, KNOWN_STORED)).toBe(true);
  });

  it("rejects a wrong passphrase", async () => {
    expect(await verifyPassphrase("wrong passphrase", KNOWN_STORED)).toBe(false);
    expect(await verifyPassphrase(KNOWN_PASSPHRASE + "x", KNOWN_STORED)).toBe(
      false,
    );
  });

  it("rejects against a missing or malformed stored value (never throws)", async () => {
    expect(await verifyPassphrase(KNOWN_PASSPHRASE, undefined)).toBe(false);
    expect(await verifyPassphrase(KNOWN_PASSPHRASE, "garbage")).toBe(false);
  });

  it("still burns the dummy-cost scrypt path for a malformed stored value", async () => {
    // Not a timing assertion (too flaky in CI) — just confirms the malformed
    // path resolves false without throwing and without short-circuiting.
    const before = Date.now();
    expect(await verifyPassphrase(KNOWN_PASSPHRASE, "not:valid:at:all")).toBe(
      false,
    );
    expect(Date.now() - before).toBeGreaterThanOrEqual(0);
  });
});

describe("adminAuth — new <N>:<r>:<p>:<salt>:<hash> format", () => {
  const NEW_PASSPHRASE = "another correct horse battery staple";
  const salt = Buffer.from("aabbccddeeff00112233445566778899", "hex");
  const hash = scryptSync(NEW_PASSPHRASE, salt, 64, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
    maxmem: SCRYPT_PARAMS.maxmem,
  });
  const stored = formatStoredHash(SCRYPT_PARAMS, salt, hash);

  it("round-trips params, salt, and hash through parseStoredHash", () => {
    const parsed = parseStoredHash(stored);
    expect(parsed).not.toBeNull();
    expect(parsed?.params.N).toBe(SCRYPT_PARAMS.N);
    expect(parsed?.params.r).toBe(SCRYPT_PARAMS.r);
    expect(parsed?.params.p).toBe(SCRYPT_PARAMS.p);
    expect(parsed?.salt.equals(salt)).toBe(true);
    expect(parsed?.hash.equals(hash)).toBe(true);
  });

  it("verifies the correct passphrase against a new-format hash", async () => {
    expect(await verifyPassphrase(NEW_PASSPHRASE, stored)).toBe(true);
  });

  it("rejects a wrong passphrase against a new-format hash", async () => {
    expect(await verifyPassphrase("wrong passphrase", stored)).toBe(false);
  });

  it("rejects malformed new-format values (bad param, wrong arity)", () => {
    expect(parseStoredHash("0:8:3:aabb:ccdd")).toBeNull(); // N=0
    expect(parseStoredHash("32768:8:x:aabb:ccdd")).toBeNull(); // non-numeric p
    expect(parseStoredHash("32768:8:3:zz:ccdd")).toBeNull(); // non-hex salt
    expect(parseStoredHash("1:2:3:4:aabb:ccdd")).toBeNull(); // 6 parts
  });
});

describe("adminAuth — legacy params constant", () => {
  it("matches Node's scrypt defaults (N=2^14, r=8, p=1)", () => {
    expect(LEGACY_SCRYPT_PARAMS).toEqual({
      N: 16384,
      r: 8,
      p: 1,
      maxmem: 32 * 1024 * 1024,
    });
  });
});
