/**
 * adminSession — signed, revocable admin session tokens + the requireAdmin guard.
 *
 * TOKEN: `v2.${epoch}.${expiry}.${nonce}.${sig}` where
 *   sig = HMAC-SHA256( `v2.${epoch}.${expiry}.${nonce}`, sessionKey )   (hex)
 *   sessionKey = HMAC-SHA256( SESSION_KEY_CONTEXT ‖ sha256hex(ADMIN_PASSPHRASE_SCRYPT),
 *                             key = ADMIN_SESSION_SECRET )
 *
 * Two properties come from that shape:
 *   - PASSPHRASE CHANGE REVOKES. The key folds in a hash of the stored
 *     passphrase digest, so re-minting ADMIN_PASSPHRASE_SCRYPT changes the key
 *     and every outstanding token stops verifying. Rotating
 *     ADMIN_SESSION_SECRET still works as a kill switch too.
 *   - ONE LIVE SESSION. A session "epoch" integer lives in Upstash
 *     ({@link SESSION_EPOCH_KEY}). Login INCRs it and signs the new value into
 *     the token, so only the newest token matches; logout from a valid session
 *     INCRs it again, which kills every token. A token is accepted only when its
 *     signature is valid, it has not expired, AND its epoch equals the current
 *     one — a Redis error is a denial, never a pass.
 *
 * Tokens from before this format (`expiry.nonce.sig`) do not parse and are
 * rejected; the owner simply logs in again.
 *
 * The cookie is httpOnly + Secure + SameSite=Strict + Path=/, so it is invisible
 * to JS, never sent cross-site, and only travels over HTTPS.
 *
 * Pure crypto (derive/mint/verify/parse) reads no env and is unit-tested
 * directly; env and Redis are only touched by {@link sessionConfigFromEnv}.
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Redis } from "@upstash/redis";

/** Cookie name carrying the signed admin session token. */
export const ADMIN_SESSION_COOKIE = "admin_session";

/** Session lifetime: 24 hours, in milliseconds and seconds (cookie Max-Age). */
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
export const SESSION_TTL_SECONDS = 24 * 60 * 60;

/** Token format version tag — the first dot-separated field. */
export const TOKEN_VERSION = "v2";
/** Domain-separation label for the session-key derivation. */
export const SESSION_KEY_CONTEXT = "surya-portfolio/admin-session-key/v2\0";
/** Upstash key holding the current session epoch. */
export const SESSION_EPOCH_KEY = "adminsession:epoch";

/** A verified token's decoded payload. */
export interface SessionPayload {
  /** The session epoch this token was minted under. */
  readonly epoch: number;
  /** Absolute expiry, epoch milliseconds. */
  readonly expiry: number;
  /** Random per-token nonce (hex) — makes each token unique + unguessable. */
  readonly nonce: string;
}

/**
 * Derive the HMAC key that signs sessions from the session secret and the
 * stored passphrase digest. Domain-separated so the key can never collide with
 * another derivation from ADMIN_SESSION_SECRET (see lib/transcriptSignature).
 * Pure.
 */
export function deriveSessionKey(sessionSecret: string, passphraseScrypt: string): Buffer {
  const passphraseDigest = createHash("sha256").update(passphraseScrypt).digest("hex");
  return createHmac("sha256", sessionSecret)
    .update(SESSION_KEY_CONTEXT + passphraseDigest)
    .digest();
}

function sign(epoch: number, expiry: number, nonce: string, key: Buffer): string {
  return createHmac("sha256", key)
    .update(`${TOKEN_VERSION}.${epoch}.${expiry}.${nonce}`)
    .digest("hex");
}

/**
 * Mint a signed token for `epoch`, valid for {@link SESSION_TTL_MS} from `now`.
 * The nonce is 16 random bytes (injectable for deterministic tests).
 */
export function mintSessionToken(
  key: Buffer,
  epoch: number,
  now: number = Date.now(),
  nonce: string = randomBytes(16).toString("hex"),
): string {
  const expiry = now + SESSION_TTL_MS;
  return `${TOKEN_VERSION}.${epoch}.${expiry}.${nonce}.${sign(epoch, expiry, nonce, key)}`;
}

/** Constant-time string compare that never throws on length mismatch. */
function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

const POSITIVE_INT_RE = /^[1-9][0-9]*$/;

/**
 * Verify a token's signature and expiry (NOT its epoch — see
 * {@link verifyCurrentSession}). Returns the payload or null on any failure.
 * Never throws. The signature is checked in constant time BEFORE the expiry, so
 * a forged token and an expired one are indistinguishable by timing.
 */
export function verifySessionToken(
  token: string | undefined | null,
  key: Buffer,
  now: number = Date.now(),
): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 5) return null;
  const [version, epochStr, expiryStr, nonce, sig] = parts;
  if (version !== TOKEN_VERSION || !nonce || !sig) return null;
  if (!POSITIVE_INT_RE.test(epochStr) || !POSITIVE_INT_RE.test(expiryStr)) return null;
  const epoch = Number(epochStr);
  const expiry = Number(expiryStr);
  if (!Number.isSafeInteger(epoch) || !Number.isSafeInteger(expiry)) return null;

  if (!safeEqualHex(sig, sign(epoch, expiry, nonce, key))) return null;
  if (expiry <= now) return null;
  return { epoch, expiry, nonce };
}

/* ────────────────────────────── epoch store ────────────────────────────── */

/** Where the current session epoch lives. Both methods may throw. */
export interface SessionEpochStore {
  /** The current epoch, or null if no session has ever been minted. */
  current(): Promise<number | null>;
  /** Atomically advance the epoch and return the new value. */
  bump(): Promise<number>;
}

/** The two Redis commands the epoch store needs — structural, so tests can fake it. */
export interface EpochRedis {
  get(key: string): Promise<unknown>;
  incr(key: string): Promise<number>;
}

/** Coerce a stored epoch (Upstash may return a number or a string). */
function toEpoch(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isSafeInteger(n) || n < 1) throw new Error("session epoch is corrupt");
  return n;
}

export function redisEpochStore(redis: EpochRedis): SessionEpochStore {
  return {
    current: async () => toEpoch(await redis.get(SESSION_EPOCH_KEY)),
    bump: async () => {
      const next = await redis.incr(SESSION_EPOCH_KEY);
      if (!Number.isSafeInteger(next) || next < 1) throw new Error("session epoch is corrupt");
      return next;
    },
  };
}

/** Outcome of a full session check. `unavailable` = the epoch could not be read. */
export type SessionCheck =
  | { readonly status: "valid"; readonly session: SessionPayload }
  | { readonly status: "invalid" }
  | { readonly status: "unavailable" };

/**
 * Full check: signature + expiry, then epoch === current epoch. Redis is only
 * read for a correctly signed token, so junk cookies cost no round trip. Never
 * throws; a store error is `unavailable`, which every caller treats as a denial.
 */
export async function verifyCurrentSession(
  token: string | null | undefined,
  key: Buffer,
  store: SessionEpochStore,
  now: number = Date.now(),
): Promise<SessionCheck> {
  const session = verifySessionToken(token, key, now);
  if (!session) return { status: "invalid" };
  let current: number | null;
  try {
    current = await store.current();
  } catch {
    return { status: "unavailable" };
  }
  if (current === null || current !== session.epoch) return { status: "invalid" };
  return { status: "valid", session };
}

/* ───────────────────────────────── config ──────────────────────────────── */

/** Everything needed to mint or check a session. */
export interface SessionConfig {
  readonly key: Buffer;
  readonly store: SessionEpochStore;
}

export interface SessionEnv {
  ADMIN_SESSION_SECRET?: string;
  ADMIN_PASSPHRASE_SCRYPT?: string;
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
}

export function readSessionEnv(): SessionEnv {
  return {
    ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
    ADMIN_PASSPHRASE_SCRYPT: process.env.ADMIN_PASSPHRASE_SCRYPT,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  };
}

let cachedStore: { url: string; token: string; store: SessionEpochStore } | null = null;

/**
 * Build the session config, or null when any required var is absent (callers
 * answer 503 / treat the visitor as a guest — never a bypass). Throws only if
 * the Redis client itself cannot be constructed (a malformed URL); callers
 * that must not throw wrap it.
 */
export function sessionConfigFromEnv(env: SessionEnv = readSessionEnv()): SessionConfig | null {
  const { ADMIN_SESSION_SECRET, ADMIN_PASSPHRASE_SCRYPT, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = env;
  if (!ADMIN_SESSION_SECRET || !ADMIN_PASSPHRASE_SCRYPT) return null;
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) return null;
  if (
    !cachedStore ||
    cachedStore.url !== UPSTASH_REDIS_REST_URL ||
    cachedStore.token !== UPSTASH_REDIS_REST_TOKEN
  ) {
    const redis = new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN });
    cachedStore = {
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
      store: redisEpochStore(redis as unknown as EpochRedis),
    };
  }
  return {
    key: deriveSessionKey(ADMIN_SESSION_SECRET, ADMIN_PASSPHRASE_SCRYPT),
    store: cachedStore.store,
  };
}

/* ─────────────────────────────── cookies ───────────────────────────────── */

/** Serialize the Set-Cookie header for a freshly minted session token. */
export function buildSessionCookie(token: string): string {
  return [
    `${ADMIN_SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ].join("; ");
}

/** Serialize a Set-Cookie header that immediately clears the session cookie. */
export function buildClearCookie(): string {
  return [
    `${ADMIN_SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Max-Age=0",
  ].join("; ");
}

/**
 * Read one cookie value from a raw Cookie header. Pure. Returns null when the
 * header is absent or the named cookie is not present.
 */
export function readCookie(
  cookieHeader: string | null,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) return part.slice(eq + 1).trim();
  }
  return null;
}

/** The session token a request carries, if any. */
export function sessionTokenFrom(request: Request): string | null {
  return readCookie(request.headers.get("cookie"), ADMIN_SESSION_COOKIE);
}

/* ────────────────────────────── the guard ──────────────────────────────── */

type DenyCode = "ADMIN_NOT_CONFIGURED" | "UNAUTHORIZED" | "SYSTEM_BUSY";

/** Opaque JSON response used for every admin-guard rejection. */
function deny(status: number, code: DenyCode): Response {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Result of the admin guard: proceed, or a ready-to-return rejection Response. */
export type AdminGuardResult =
  | { readonly ok: true; readonly session: SessionPayload }
  | { readonly ok: false; readonly response: Response };

/**
 * Guard an admin API route on its session cookie. Returns `{ ok: true }` or a
 * rejection Response the route should return verbatim:
 *   - session config absent            → 503 ADMIN_NOT_CONFIGURED (never a bypass)
 *   - epoch store unreachable          → 503 SYSTEM_BUSY (fail closed)
 *   - missing/invalid/expired/old-epoch → 401 UNAUTHORIZED (opaque)
 * `config` is injectable for tests; routes pass nothing.
 */
export async function requireAdmin(
  request: Request,
  config?: SessionConfig | null,
): Promise<AdminGuardResult> {
  let resolved: SessionConfig | null;
  try {
    resolved = config === undefined ? sessionConfigFromEnv() : config;
  } catch {
    return { ok: false, response: deny(503, "SYSTEM_BUSY") };
  }
  if (!resolved) return { ok: false, response: deny(503, "ADMIN_NOT_CONFIGURED") };

  const check = await verifyCurrentSession(sessionTokenFrom(request), resolved.key, resolved.store);
  if (check.status === "unavailable") return { ok: false, response: deny(503, "SYSTEM_BUSY") };
  if (check.status === "invalid") return { ok: false, response: deny(401, "UNAUTHORIZED") };
  return { ok: true, session: check.session };
}
