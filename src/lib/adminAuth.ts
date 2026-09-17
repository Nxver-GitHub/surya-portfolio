/**
 * adminAuth — passphrase verification for the admin terminal (server-only).
 *
 * The owner's passphrase is NEVER stored in the repo or env in plaintext. Only a
 * scrypt digest lives in the `ADMIN_PASSPHRASE_SCRYPT` env var. Verification
 * derives the key from the candidate passphrase with Node's memory-hard
 * `scrypt` and compares it to the stored hash in constant time
 * (`timingSafeEqual`).
 *
 * STORED VALUE FORMAT — two shapes are accepted, both lowercase hex:
 *
 *   legacy: `<saltHex>:<hashHex>`
 *     Verified with {@link LEGACY_SCRYPT_PARAMS} (N=2^14, r=8, p=1 — Node's
 *     scrypt defaults). This is what `scryptSync(pw, salt, 64)` with no options
 *     produced before params became explicit; old env values keep verifying
 *     with no migration required.
 *
 *   new:    `<N>:<r>:<p>:<saltHex>:<hashHex>`
 *     Carries its own cost parameters, so a stored hash always verifies with
 *     the params it was created under even after {@link SCRYPT_PARAMS}'
 *     defaults change. Produced by `scripts/hash-passphrase.mjs`.
 *
 * Design notes:
 *   - `verifyPassphrase` is async (scrypt is CPU-bound; the async form keeps the
 *     event loop free) and NEVER throws for a bad candidate — it resolves false.
 *   - A malformed stored value still runs a dummy scrypt at {@link SCRYPT_PARAMS}
 *     cost, so the failure timing does not reveal "not configured" vs "wrong
 *     passphrase".
 *   - keylen is taken from the stored hash length, so the same code verifies any
 *     digest either hashing script produced.
 *   - `SCRYPT_PARAMS` is deliberately conservative for a Cloudflare Workers
 *     isolate (128 MiB memory cap, shared with the rest of the Next runtime) —
 *     the OWASP-recommended N=2^17 (128 MiB) is not viable here. See the
 *     `security-residue` PR description for the measured timing/memory
 *     trade-offs behind the current default.
 *
 * No env is read here — the caller passes the stored value. That keeps this
 * module pure and unit-testable against known vectors (see
 * tests/adminAuth.test.ts).
 */

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/** Default derived-key length (bytes) — matches the hashing scripts' output. */
export const SCRYPT_KEYLEN = 64;

/** scrypt cost parameters: CPU/memory hardness knobs plus the memory ceiling
 * Node's scrypt is allowed to use (must be >= 128*N*r bytes). */
export interface ScryptParams {
  readonly N: number;
  readonly r: number;
  readonly p: number;
  readonly maxmem: number;
}

/**
 * Current default params for newly-minted hashes and for the dummy-cost path.
 * N=2^15, r=8, p=3 — chosen over the OWASP N=2^17 target because a Worker
 * isolate caps total memory at 128 MiB shared with the rest of the runtime;
 * 128*N*r = 32 MiB leaves headroom. This is a one-line change if the owner
 * wants a different point on the cost/latency curve after reviewing the
 * measured timings.
 */
export const SCRYPT_PARAMS: ScryptParams = {
  N: 2 ** 15,
  r: 8,
  p: 3,
  maxmem: 64 * 1024 * 1024,
};

/** Params implied by a legacy `salt:hash` record — Node's scrypt defaults,
 * which is what produced every hash before params became explicit. */
export const LEGACY_SCRYPT_PARAMS: ScryptParams = {
  N: 2 ** 14,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024,
};

/** Promise wrapper around Node's callback-style scrypt. */
function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  params: ScryptParams,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      keylen,
      { N: params.N, r: params.r, p: params.p, maxmem: params.maxmem },
      (err, derived) => {
        if (err) reject(err);
        else resolve(derived as Buffer);
      },
    );
  });
}

/** Parsed stored-hash record: raw salt/hash bytes plus the params it was
 * derived with (legacy or explicit). */
interface StoredHash {
  readonly salt: Buffer;
  readonly hash: Buffer;
  readonly params: ScryptParams;
}

const HEX_RE = /^[0-9a-f]+$/i;

/** Decode a hex pair into raw bytes, or null if either is malformed/empty. */
function decodeHexPair(
  saltHex: string,
  hashHex: string,
): { salt: Buffer; hash: Buffer } | null {
  if (!HEX_RE.test(saltHex) || !HEX_RE.test(hashHex)) return null;
  if (saltHex.length % 2 !== 0 || hashHex.length % 2 !== 0) return null;
  const salt = Buffer.from(saltHex, "hex");
  const hash = Buffer.from(hashHex, "hex");
  if (salt.length === 0 || hash.length === 0) return null;
  return { salt, hash };
}

/** Parse a positive integer cost parameter (N/r/p) from a path segment. */
function parseCostParam(value: string): number | null {
  if (!/^[1-9][0-9]*$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}

/**
 * Parse either stored-value shape (see the file header for the two formats).
 * Returns null when the shape is wrong or any field is invalid — the caller
 * treats null as "deny", never as "allow". Pure.
 */
export function parseStoredHash(stored: string | undefined): StoredHash | null {
  if (!stored) return null;
  const parts = stored.split(":");

  if (parts.length === 2) {
    const decoded = decodeHexPair(parts[0], parts[1]);
    if (!decoded) return null;
    return { ...decoded, params: LEGACY_SCRYPT_PARAMS };
  }

  if (parts.length === 5) {
    const [nStr, rStr, pStr, saltHex, hashHex] = parts;
    const N = parseCostParam(nStr);
    const r = parseCostParam(rStr);
    const p = parseCostParam(pStr);
    if (N === null || r === null || p === null) return null;
    const decoded = decodeHexPair(saltHex, hashHex);
    if (!decoded) return null;
    const maxmem = Math.max(128 * N * r * 2, 32 * 1024 * 1024);
    return { ...decoded, params: { N, r, p, maxmem } };
  }

  return null;
}

/**
 * Format a stored value in the new `<N>:<r>:<p>:<saltHex>:<hashHex>` shape.
 * Used by `scripts/hash-passphrase.mjs`; exported so the script and the parser
 * share one round-trippable format instead of two hand-maintained ones.
 */
export function formatStoredHash(
  params: Pick<ScryptParams, "N" | "r" | "p">,
  salt: Buffer,
  hash: Buffer,
): string {
  return `${params.N}:${params.r}:${params.p}:${salt.toString("hex")}:${hash.toString("hex")}`;
}

/**
 * Verify a candidate passphrase against a stored value (either format — see
 * the file header).
 *
 * Resolves true only on an exact, constant-time match. For a malformed stored
 * value we still burn an equivalent scrypt (at {@link SCRYPT_PARAMS} cost)
 * before resolving false, so an attacker cannot distinguish "misconfigured"
 * from "wrong passphrase" by timing.
 */
export async function verifyPassphrase(
  candidate: string,
  stored: string | undefined,
): Promise<boolean> {
  const parsed = parseStoredHash(stored);
  if (!parsed) {
    // Dummy work to equalize timing with the real path, then deny.
    await scryptAsync(candidate, randomBytes(16), SCRYPT_KEYLEN, SCRYPT_PARAMS);
    return false;
  }
  const derived = await scryptAsync(
    candidate,
    parsed.salt,
    parsed.hash.length,
    parsed.params,
  );
  if (derived.length !== parsed.hash.length) return false;
  return timingSafeEqual(derived, parsed.hash);
}
