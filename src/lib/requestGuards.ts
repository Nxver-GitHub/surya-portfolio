/**
 * requestGuards — the two checks every POST route runs BEFORE it spends work on
 * a request body: same-origin (CSRF) and a hard byte cap on the body itself.
 *
 * Both exist because the site's API routes are unauthenticated by design (the
 * café terminal serves guests) and run on Workers, where every buffered byte and
 * every invocation is billable. Everything here is pure or takes its inputs
 * explicitly, so the routes and the unit tests share one code path.
 */

import { SITE_HOST } from "@/lib/site";

/* ───────────────────────────── origin (CSRF) ───────────────────────────── */

/**
 * Whether a POST may proceed, given its `Origin` and `Host` headers.
 *
 * POLICY — a MISSING `Origin` is allowed. Browsers always send `Origin` on
 * POST (including `<form enctype="text/plain">`, the one cross-site POST that
 * needs no preflight), so the CSRF vector is fully covered by rejecting a
 * present-but-foreign origin. Non-browser clients — curl, uptime checks, a
 * `sendBeacon` retry through a stripping proxy — routinely omit it, and failing
 * closed there would break legitimate traffic for no security gain. The routes'
 * own auth and rate limits still apply either way.
 *
 * The allowed origin is the request's OWN host first (so localhost dev, Worker
 * preview URLs and the apex domain all work without per-environment config),
 * with the canonical {@link SITE_HOST} accepted as well. A cross-site attacker
 * cannot influence the victim's `Host` header, so host matching is a complete
 * check; `SITE_HOST` is belt-and-braces for the case where a proxy rewrites it.
 *
 * A literal `"null"` origin (sandboxed iframe, some redirect chains) fails to
 * parse and is rejected — that is the intent.
 *
 * SCHEME — production accepts `https:` only. Host matching alone trusted
 * `http://suryapugaz.com` as readily as the real one; HSTS and the apex 308s
 * make that unreachable through a browser, but the guard should not depend on
 * another layer for a check it can make itself. Two documented exceptions keep
 * real work possible:
 *   - a loopback origin (`localhost`, `127.0.0.0/8`, `[::1]`) is always allowed
 *     over http — that is `next dev` and `opennextjs-cloudflare preview`.
 *   - outside a production build, any http origin is allowed, so `next dev`
 *     reached from a phone on the LAN (`http://192.168.x.x:3000`) still works.
 *     `allowInsecure` is a parameter rather than a read of NODE_ENV inside the
 *     branch so the production posture is directly testable.
 */
export function isTrustedOrigin(
  originHeader: string | null,
  hostHeader: string | null,
  allowInsecure: boolean = process.env.NODE_ENV !== "production",
): boolean {
  if (!originHeader || !originHeader.trim()) return true;
  let origin: URL;
  try {
    origin = new URL(originHeader.trim());
  } catch {
    return false;
  }
  const originHost = origin.host.toLowerCase();
  if (!originHost) return false;
  const protocol = origin.protocol.toLowerCase();
  if (protocol !== "https:") {
    if (protocol !== "http:") return false;
    if (!allowInsecure && !isLoopbackHostname(origin.hostname)) return false;
  }
  if (hostHeader && originHost === hostHeader.trim().toLowerCase()) return true;
  return originHost === SITE_HOST;
}

/** Whether a URL hostname names this machine. `URL.hostname` keeps IPv6 in its
 * bracketed form, hence both spellings of the loopback address. */
function isLoopbackHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "[::1]" || host === "::1") return true;
  return /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
}

/** {@link isTrustedOrigin} applied to a real Request. */
export function hasTrustedOrigin(request: Request): boolean {
  return isTrustedOrigin(
    request.headers.get("origin"),
    request.headers.get("host"),
  );
}

/* ────────────────────────────── body size cap ──────────────────────────── */

/**
 * Body caps, in bytes. Sized from what each route legitimately accepts, with
 * headroom for JSON escaping (a `\uXXXX` escape costs 6 bytes per character):
 *
 *   - tiny — `{ passphrase }` (≤256 chars) and `{ route }` (a known-route enum).
 *     8 KB is already ~30× the largest honest body.
 *   - chat — the café conversation, bounded by MAX_TOTAL_CONTENT_CHARS (30k
 *     chars) plus per-message JSON overhead. 128 KB clears a heavily-escaped
 *     worst case without admitting anything the schema would accept.
 */
export const MAX_TINY_BODY_BYTES = 8 * 1024;
export const MAX_CHAT_BODY_BYTES = 128 * 1024;

export type CappedBody =
  | { ok: true; value: unknown }
  | { ok: false; reason: "too-large" | "invalid" };

/**
 * Whether a declared `content-length` already busts the cap. A malformed or
 * absent header returns false — it is only the cheap early-out; the stream read
 * below is what actually enforces the cap, so an absent header never becomes a
 * licence to buffer without limit.
 */
export function declaredLengthExceeds(
  contentLength: string | null,
  maxBytes: number,
): boolean {
  if (contentLength === null) return false;
  const declared = Number(contentLength.trim());
  if (!Number.isFinite(declared) || declared < 0) return false;
  return declared > maxBytes;
}

/**
 * Drain a body stream, aborting the moment it passes `maxBytes`. The cap is
 * checked per chunk, so an unbounded (or chunked, length-less) upload is
 * cancelled after at most one chunk of overshoot rather than buffered whole.
 */
export async function readCappedStream(
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<{ ok: true; text: string } | { ok: false; reason: "too-large" }> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      void reader.cancel();
      return { ok: false, reason: "too-large" };
    }
    chunks.push(value);
  }
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, text: new TextDecoder().decode(joined) };
}

/**
 * Read + JSON-parse a request body under a hard byte cap. Replaces a bare
 * `await request.json()` at the top of a handler: that buffers and parses
 * whatever the caller sends, before any rate limit can apply.
 */
export async function readCappedJson(
  request: Request,
  maxBytes: number,
): Promise<CappedBody> {
  if (declaredLengthExceeds(request.headers.get("content-length"), maxBytes)) {
    return { ok: false, reason: "too-large" };
  }
  let text: string;
  try {
    const body = request.body;
    if (body) {
      const read = await readCappedStream(body, maxBytes);
      if (!read.ok) return read;
      text = read.text;
    } else {
      // No stream exposed (older shims). Fall back to text(), then re-check —
      // the content-length gate above has already screened the declared size.
      text = await request.text();
      if (new TextEncoder().encode(text).byteLength > maxBytes) {
        return { ok: false, reason: "too-large" };
      }
    }
  } catch {
    return { ok: false, reason: "invalid" };
  }
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}
