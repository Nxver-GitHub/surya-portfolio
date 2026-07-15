/**
 * adminAuth — passphrase verification for the admin terminal (server-only).
 *
 * The owner's passphrase is NEVER stored in the repo or env in plaintext. Only a
 * scrypt digest lives in the `ADMIN_PASSPHRASE_SCRYPT` env var, formatted as
 * `salt:hash` (both lowercase hex). Verification derives the key from the
 * candidate passphrase with Node's memory-hard `scrypt` and compares it to the
 * stored hash in constant time (`timingSafeEqual`).
 *
 * Design notes:
 *   - `verifyPassphrase` is async (scrypt is CPU-bound; the async form keeps the
 *     event loop free) and NEVER throws for a bad candidate — it resolves false.
 *   - A malformed stored value still runs a dummy scrypt of equivalent cost, so
 *     the failure timing does not reveal "not configured" vs "wrong passphrase".
 *   - keylen is taken from the stored hash length, so the same code verifies any
 *     digest the bundled `scripts/hash-admin-passphrase.mjs` produced.
 *
 * No env is read here — the caller passes the stored value. That keeps this
 * module pure and unit-testable against a known vector (see tests/adminAuth.test.ts).
 */

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/** Default derived-key length (bytes) — matches the hashing script's output. */
export const SCRYPT_KEYLEN = 64;

/** Promise wrapper around Node's callback-style scrypt. */
function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, (err, derived) => {
      if (err) reject(err);
      else resolve(derived as Buffer);
    });
  });
}

/** Parsed `salt:hash` record, both as raw bytes. */
interface StoredHash {
  readonly salt: Buffer;
  readonly hash: Buffer;
}

/**
 * Parse a `salt:hash` stored value (both lowercase hex). Returns null when the
 * shape is wrong or the hex is invalid — the caller treats null as "deny", never
 * as "allow". Pure.
 */
export function parseStoredHash(stored: string | undefined): StoredHash | null {
  if (!stored) return null;
  const parts = stored.split(":");
  if (parts.length !== 2) return null;
  const [saltHex, hashHex] = parts;
  if (!/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(hashHex)) return null;
  if (saltHex.length % 2 !== 0 || hashHex.length % 2 !== 0) return null;
  const salt = Buffer.from(saltHex, "hex");
  const hash = Buffer.from(hashHex, "hex");
  if (salt.length === 0 || hash.length === 0) return null;
  return { salt, hash };
}

/**
 * Verify a candidate passphrase against a stored `salt:hash` value.
 *
 * Resolves true only on an exact, constant-time match. For a malformed stored
 * value we still burn an equivalent scrypt before resolving false, so an
 * attacker cannot distinguish "misconfigured" from "wrong passphrase" by timing.
 */
export async function verifyPassphrase(
  candidate: string,
  stored: string | undefined,
): Promise<boolean> {
  const parsed = parseStoredHash(stored);
  if (!parsed) {
    // Dummy work to equalize timing with the real path, then deny.
    await scryptAsync(candidate, randomBytes(16), SCRYPT_KEYLEN);
    return false;
  }
  const derived = await scryptAsync(candidate, parsed.salt, parsed.hash.length);
  if (derived.length !== parsed.hash.length) return false;
  return timingSafeEqual(derived, parsed.hash);
}
