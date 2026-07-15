import { describe, expect, it } from "vitest";
import { parseStoredHash, verifyPassphrase } from "../src/lib/adminAuth";

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
});
