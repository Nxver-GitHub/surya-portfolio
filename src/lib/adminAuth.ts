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
 *     defaults change. Produced by `scripts/hash-passphrase.mjs`. `maxmem` is
 *     NOT part of this format — it is always the fixed {@link SCRYPT_PARAMS}.maxmem
 *     ceiling, never derived from N/r/p (see {@link isValidCostParams}).
 *
 *   Either shape's hash field must be exactly {@link SCRYPT_KEYLEN}*2 hex
 *   characters — a shorter (truncated) hash is rejected rather than verified
 *   at reduced strength.
 *
 * Design notes:
 *   - `verifyPassphrase` is async (scrypt is CPU-bound; the async form keeps the
 *     event loop free) and NEVER throws for a bad candidate — it resolves false.
 *   - A malformed stored value still runs a dummy scrypt at {@link SCRYPT_PARAMS}
 *     cost, so the failure timing does not reveal "not configured" vs "wrong
 *     passphrase".
 *   - keylen is taken from the stored hash length, so the same code verifies any
 *     digest either hashing script produced.
 *   - `SCRYPT_PARAMS` picks a point on the cost/latency curve that fits a
 *     Cloudflare Workers isolate: 128 MiB memory cap shared with the rest of
 *     the Next runtime, so the OWASP-recommended N=2^17 (128 MiB just for
 *     scrypt) is not viable here. Measured on the dev machine (median of 5
 *     runs, memory = 128*N*r bytes, independent of p):
 *
 *       N=2^14, r=8, p=1 (Node's old defaults)   22.7 ms   16 MiB
 *       N=2^15, r=8, p=3 (current SCRYPT_PARAMS) 132.7 ms  32 MiB
 *       N=2^16, r=8, p=2                         179.2 ms  64 MiB
 *
 *     N=2^15/r=8/p=3 was chosen because the Worker runs on Cloudflare's Paid
 *     CPU-time limit, whose observed p99 wall-clock latency for this route is
 *     ~321 ms — so ~130 ms of scrypt is affordable headroom, not the whole
 *     budget. This is a one-line change (see `SCRYPT_PARAMS` below) if the
 *     owner wants a different point on that curve.
 *   - CONCURRENCY: each verify allocates ~32 MiB (128*N*r at the current
 *     params) inside a 128 MiB isolate shared with the rest of the Next
 *     runtime. The login route's rate limits are hourly windows with no
 *     concurrency bound, so a handful of simultaneous attempts could OOM the
 *     isolate and drop every in-flight request, not just the attacker's own.
 *     {@link verifyPassphraseGuarded} caps concurrent scrypt calls at
 *     {@link MAX_CONCURRENT_VERIFIES} and reports "busy" instead of running
 *     scrypt when at capacity, so the route can fail closed with 503 rather
 *     than risk the isolate.
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
 * See the file header for the measured timing/memory table behind this
 * choice — 128*N*r = 32 MiB leaves headroom under the Worker's 128 MiB cap.
 * `maxmem` here is also the one and only ceiling ever passed to scrypt — see
 * {@link isValidCostParams}, which never derives a per-hash maxmem.
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

/**
 * Promise wrapper around Node's callback-style scrypt. NEVER rejects with a
 * synchronous throw escaping uncaught — a bad `options` combination (e.g. one
 * that fails Node's own maxmem check) throws synchronously from `scrypt()`
 * itself rather than via the callback, but that throw happens inside the
 * executor passed to `new Promise`, so the Promise constructor converts it
 * into a normal rejection. Callers still see one rejection path either way.
 */
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

/**
 * Decode a hex pair into raw bytes. Returns null if either is malformed, or
 * if the hash isn't exactly {@link SCRYPT_KEYLEN} bytes — a truncated hash
 * would otherwise still decode and verify, just at reduced effective
 * strength, which is worse than rejecting it outright.
 */
function decodeHexPair(
  saltHex: string,
  hashHex: string,
): { salt: Buffer; hash: Buffer } | null {
  if (!HEX_RE.test(saltHex) || !HEX_RE.test(hashHex)) return null;
  if (saltHex.length % 2 !== 0 || hashHex.length % 2 !== 0) return null;
  const salt = Buffer.from(saltHex, "hex");
  const hash = Buffer.from(hashHex, "hex");
  if (salt.length === 0) return null;
  if (hash.length !== SCRYPT_KEYLEN) return null;
  return { salt, hash };
}

/** Parse a positive integer cost parameter (N/r/p) from a path segment. */
function parseCostParam(value: string): number | null {
  if (!/^[1-9][0-9]*$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}

/** N's allowed range (inclusive): 2^12 .. 2^16. r and p ranges (inclusive)
 * below. `maxmem` is deliberately NOT part of this validation — it is always
 * the fixed {@link SCRYPT_PARAMS}.maxmem ceiling (see `parseStoredHash`),
 * never derived from N/r/p. A combination that's in-range here but still
 * exceeds that fixed ceiling (e.g. N=2^16, r=16) makes Node's own `scrypt`
 * throw; `verifyPassphrase`'s try/catch turns that into a plain `false`
 * rather than a crash. */
const MIN_N = 2 ** 12;
const MAX_N = 2 ** 16;
const MAX_R = 16;
const MAX_P = 8;

/**
 * Whether N/r/p are sane cost parameters to actually run scrypt with: N a
 * power of two in [2^12, 2^16], r in [1, 16], p in [1, 8]. A hostile or
 * corrupted env value fails this and is treated as malformed (parseStoredHash
 * returns null, verifyPassphrase takes the dummy-cost path) rather than
 * handed to Node's scrypt. Pure.
 */
function isValidCostParams(N: number, r: number, p: number): boolean {
  const isPowerOfTwo = N > 0 && (N & (N - 1)) === 0;
  if (!isPowerOfTwo) return false;
  if (N < MIN_N || N > MAX_N) return false;
  if (r < 1 || r > MAX_R) return false;
  if (p < 1 || p > MAX_P) return false;
  return true;
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
    if (!isValidCostParams(N, r, p)) return null;
    const decoded = decodeHexPair(saltHex, hashHex);
    if (!decoded) return null;
    // maxmem is always the fixed SCRYPT_PARAMS ceiling — never derived from
    // the stored N/r/p (see the file header and isValidCostParams).
    return { ...decoded, params: { N, r, p, maxmem: SCRYPT_PARAMS.maxmem } };
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
 *
 * NEVER throws: `isValidCostParams` rejects out-of-range params before they
 * ever reach scrypt, but an in-range combination can still exceed the fixed
 * maxmem ceiling and make Node's scrypt throw — that (and any other scrypt
 * error) is caught here and resolves false. Fail closed, no unhandled
 * rejection reaching the route, no crash loop.
 *
 * This is the single-attempt primitive; the login route calls it through
 * {@link verifyPassphraseGuarded}, which additionally caps concurrent scrypt
 * calls. Tests exercise this function directly for its pass/fail behavior.
 */
export async function verifyPassphrase(
  candidate: string,
  stored: string | undefined,
): Promise<boolean> {
  const parsed = parseStoredHash(stored);
  try {
    if (!parsed) {
      // Dummy work to equalize timing with the real path, then deny.
      await scryptAsync(
        candidate,
        randomBytes(16),
        SCRYPT_KEYLEN,
        SCRYPT_PARAMS,
      );
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
  } catch {
    return false;
  }
}

/* ─────────────────────── concurrency-gated verification ────────────────── */

/**
 * Max scrypt derivations allowed to run at once across the isolate. At
 * SCRYPT_PARAMS (128*N*r = 32 MiB per call) this caps admin-login scrypt
 * memory at ~64 MiB, leaving headroom under the Worker's 128 MiB cap for the
 * rest of the Next runtime. Two, not one, because a legitimate retry
 * shouldn't itself trigger "busy" the instant the owner's own prior attempt
 * is still resolving.
 */
export const MAX_CONCURRENT_VERIFIES = 2;

/** Number of `verifyPassphraseGuarded` calls currently running scrypt.
 * Module-level by design — this gate is per-isolate, matching the memory
 * budget it protects. */
let inFlight = 0;

/** Test-only accessor for the in-flight counter (never used by app code). */
export function getInFlightVerifyCount(): number {
  return inFlight;
}

/** Outcome of a concurrency-gated verify: a real match/no-match result, or
 * "busy" when the isolate is already at {@link MAX_CONCURRENT_VERIFIES} and
 * this attempt was refused BEFORE running any scrypt. */
export type PassphraseVerifyOutcome = "match" | "no_match" | "busy";

/**
 * {@link verifyPassphrase}, gated so at most {@link MAX_CONCURRENT_VERIFIES}
 * scrypt derivations run at once (real or dummy-cost — the gate wraps the
 * whole call, so both paths count and both are refused identically when
 * busy, keeping response timing uniform). The counter is decremented in a
 * `finally`, so it returns to 0 whether verification resolves or throws.
 */
export async function verifyPassphraseGuarded(
  candidate: string,
  stored: string | undefined,
): Promise<PassphraseVerifyOutcome> {
  if (inFlight >= MAX_CONCURRENT_VERIFIES) return "busy";
  inFlight++;
  try {
    const ok = await verifyPassphrase(candidate, stored);
    return ok ? "match" : "no_match";
  } finally {
    inFlight--;
  }
}
