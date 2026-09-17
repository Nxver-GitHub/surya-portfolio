import { scryptSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  LEGACY_SCRYPT_PARAMS,
  MAX_CONCURRENT_VERIFIES,
  SCRYPT_KEYLEN,
  SCRYPT_PARAMS,
  formatStoredHash,
  getInFlightVerifyCount,
  parseStoredHash,
  verifyPassphrase,
  verifyPassphraseGuarded,
} from "../src/lib/adminAuth";

// Partial mock of node:crypto — `scrypt` is wrapped in a spy that still
// forwards to the real implementation (so every other test in this file keeps
// getting real derived keys), while letting one test assert exactly how the
// dummy-cost path calls it.
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return { ...actual, scrypt: vi.fn(actual.scrypt) };
});

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

  it("rejects a hash whose hex length isn't exactly SCRYPT_KEYLEN*2 (legacy shape)", () => {
    const salt = "aabbccdd";
    const tooShort = "cd".repeat(SCRYPT_KEYLEN - 1); // one byte short
    const tooLong = "cd".repeat(SCRYPT_KEYLEN + 1); // one byte long
    const justRight = "cd".repeat(SCRYPT_KEYLEN);
    expect(parseStoredHash(`${salt}:${tooShort}`)).toBeNull();
    expect(parseStoredHash(`${salt}:${tooLong}`)).toBeNull();
    expect(parseStoredHash(`${salt}:${justRight}`)).not.toBeNull();
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

  it("still burns the dummy-cost scrypt path, at SCRYPT_PARAMS cost, exactly once", async () => {
    const { scrypt } = await import("node:crypto");
    const scryptSpy = vi.mocked(scrypt);
    scryptSpy.mockClear();

    expect(await verifyPassphrase(KNOWN_PASSPHRASE, "not:valid:at:all")).toBe(
      false,
    );

    expect(scryptSpy).toHaveBeenCalledTimes(1);
    const [, , keylen, options] = scryptSpy.mock.calls[0];
    expect(keylen).toBe(SCRYPT_KEYLEN);
    expect(options).toMatchObject({
      N: SCRYPT_PARAMS.N,
      r: SCRYPT_PARAMS.r,
      p: SCRYPT_PARAMS.p,
      maxmem: SCRYPT_PARAMS.maxmem,
    });
  });

  it("fails closed (never throws) when in-range N/r still exceeds the fixed maxmem ceiling", async () => {
    // N=2^16, r=16 are each within isValidCostParams' range, but
    // 128*65536*16 = 128 MiB > SCRYPT_PARAMS.maxmem (64 MiB fixed) — Node's
    // own scrypt throws for this combination; verifyPassphrase must still
    // resolve false, not reject/throw.
    const salt = "aabbccdd";
    const hash = "cd".repeat(SCRYPT_KEYLEN);
    const stored = `65536:16:1:${salt}:${hash}`;
    expect(parseStoredHash(stored)).not.toBeNull(); // in-range per isValidCostParams
    await expect(verifyPassphrase("anything", stored)).resolves.toBe(false);
  });
});

describe("adminAuth — new-format hash length", () => {
  it("rejects a hash whose hex length isn't exactly SCRYPT_KEYLEN*2", () => {
    const salt = "aabbccdd";
    const tooShort = "cd".repeat(SCRYPT_KEYLEN - 1);
    expect(parseStoredHash(`32768:8:3:${salt}:${tooShort}`)).toBeNull();
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

describe("adminAuth — new-format cost parameter bounds", () => {
  const VALID_HASH = "cd".repeat(SCRYPT_KEYLEN);

  /** A syntactically valid `<N>:<r>:<p>:<salt>:<hash>` string for given costs. */
  function storedWith(N: number, r: number, p: number): string {
    return `${N}:${r}:${p}:aabb:${VALID_HASH}`;
  }

  it("accepts N at both ends of the valid range (power of two)", () => {
    expect(parseStoredHash(storedWith(2 ** 12, 1, 1))).not.toBeNull(); // MIN_N
    expect(parseStoredHash(storedWith(2 ** 16, 1, 1))).not.toBeNull(); // MAX_N
  });

  it("rejects N that isn't a power of two", () => {
    expect(parseStoredHash(storedWith(20000, 8, 1))).toBeNull();
  });

  it("rejects N below 2^12", () => {
    expect(parseStoredHash(storedWith(2 ** 11, 8, 1))).toBeNull();
  });

  it("rejects N above 2^16", () => {
    expect(parseStoredHash(storedWith(2 ** 17, 8, 1))).toBeNull();
  });

  it("rejects r above 16", () => {
    expect(parseStoredHash(storedWith(2 ** 14, 32, 1))).toBeNull();
  });

  it("accepts r at its upper bound", () => {
    expect(parseStoredHash(storedWith(2 ** 12, 16, 1))).not.toBeNull();
  });

  it("rejects p above 8", () => {
    expect(parseStoredHash(storedWith(2 ** 14, 8, 16))).toBeNull();
  });

  it("accepts p at its upper bound", () => {
    expect(parseStoredHash(storedWith(2 ** 12, 1, 8))).not.toBeNull();
  });

  it("verifyPassphrase fails closed (never throws) for an out-of-bounds N", async () => {
    const oversized = `${2 ** 17}:8:1:aabb:${VALID_HASH}`;
    await expect(
      verifyPassphrase("anything", oversized),
    ).resolves.toBe(false);
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

describe("adminAuth — verifyPassphraseGuarded (concurrency gate)", () => {
  it("refuses a call at MAX_CONCURRENT_VERIFIES capacity without invoking scrypt, then drains back to 0", async () => {
    expect(MAX_CONCURRENT_VERIFIES).toBe(2);
    expect(getInFlightVerifyCount()).toBe(0);

    const { scrypt } = await import("node:crypto");
    const scryptSpy = vi.mocked(scrypt);
    scryptSpy.mockClear();

    // Start two — each runs synchronously up to its first await, incrementing
    // the counter before suspending on the (real, async) scrypt call.
    const p1 = verifyPassphraseGuarded(KNOWN_PASSPHRASE, KNOWN_STORED);
    const p2 = verifyPassphraseGuarded(KNOWN_PASSPHRASE, KNOWN_STORED);
    expect(getInFlightVerifyCount()).toBe(2);

    // A third, while at capacity, must be refused BEFORE running any scrypt.
    const callsBeforeThird = scryptSpy.mock.calls.length;
    const third = await verifyPassphraseGuarded(KNOWN_PASSPHRASE, KNOWN_STORED);
    expect(third).toBe("busy");
    expect(scryptSpy.mock.calls.length).toBe(callsBeforeThird);

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe("match");
    expect(r2).toBe("match");
    expect(getInFlightVerifyCount()).toBe(0);
  });

  it("returns 'no_match' (not busy) for a wrong passphrase, without leaking the slot", async () => {
    const result = await verifyPassphraseGuarded("wrong", KNOWN_STORED);
    expect(result).toBe("no_match");
    expect(getInFlightVerifyCount()).toBe(0);
  });

  it("drains the in-flight counter back to 0 even if the guarded call throws", async () => {
    // Defense-in-depth: verifyPassphrase is documented to never throw, but the
    // gate's `finally` must still restore the counter if it somehow does. A
    // non-string `stored` (only reachable by bypassing the type system, as a
    // hostile caller or a bug elsewhere might) makes the internal `.split`
    // throw synchronously.
    expect(getInFlightVerifyCount()).toBe(0);
    const brokenStored = { split: () => { throw new Error("boom"); } } as unknown as string;
    await expect(
      verifyPassphraseGuarded(KNOWN_PASSPHRASE, brokenStored),
    ).rejects.toThrow("boom");
    expect(getInFlightVerifyCount()).toBe(0);
  });
});
