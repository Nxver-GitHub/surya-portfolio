/**
 * presence/logic — the pure half of the presence room.
 *
 * Everything here is a plain function over plain data: no Durable Object, no
 * WebSocket, no clock of its own. `room.ts` owns the side effects and calls
 * into this file for every decision it makes, which keeps the DO handlers short
 * and lets the rules be tested without a socket.
 *
 * The wire contract itself is NOT defined here — it lives once in
 * `src/lib/presence/protocol.ts` at the repo root and is imported by both the
 * browser and this Worker. Design record: Docs/story-lobby-presence.md §3, §5.
 */

import {
  CALLSIGN_PREFIX,
  clientMessageSchema,
  LOCATION_MAP,
  PRESENCE_LIMITS,
  roomLiveries,
  type ClientMessage,
  type Location,
  type Player,
  type RoomLivery,
} from "../../../src/lib/presence/protocol";

/** The only origin allowed to open a socket in production. */
export const ALLOWED_ORIGIN = "https://suryapugaz.com";

/** Bucket used when the edge did not supply a client IP. Fail closed: an
 *  unidentifiable caller shares one cap rather than escaping it. */
export const UNKNOWN_IP = "unknown";

/** Milliseconds a socket must wait between accepted `loc` messages. */
export const LOC_WINDOW_MS = 1000 / PRESENCE_LIMITS.locPerSecond;

/**
 * What a socket carries across hibernation. Everything the roster needs plus
 * the abuse counters, and deliberately nothing that identifies a person: the IP
 * appears only as `ipHash`, an HMAC under a key that exists in memory for one
 * Durable Object lifetime and is never written anywhere.
 */
export interface PresenceAttachment {
  readonly id: string;
  readonly callsign: string;
  readonly livery: RoomLivery;
  readonly location: Location;
  readonly ipHash: string;
  readonly joinedAt: number;
  /** Timestamp of the last accepted `loc`; 0 means "none yet". */
  readonly lastLocAt: number;
  /** Timestamp of the last frame of any kind (the idle sweep reads this). */
  readonly lastSeenAt: number;
  /** Flood window: frames counted since `frameWindowAt`. */
  readonly frameWindowAt: number;
  readonly frameCount: number;
}

/** Verdict of the per-socket flood budget for one inbound frame. */
export type FrameBudget =
  | { readonly kind: "ok"; readonly attachment: PresenceAttachment }
  /** Sustained excess — close 1008 regardless of frame content. */
  | { readonly kind: "flood" };

/** Outcome of validating one inbound text frame. */
export type FrameVerdict =
  | { readonly kind: "ok"; readonly message: ClientMessage }
  /** Well-formed envelope this build cannot use — tolerate a stale client. */
  | { readonly kind: "drop" }
  /** Protocol violation — close 1008. */
  | { readonly kind: "close" };

const encoder = new TextEncoder();

/** Origin gate. `dev` is true only when the PRESENCE_DEV var is set locally. */
export function isAllowedOrigin(origin: string | null, dev: boolean): boolean {
  if (origin === ALLOWED_ORIGIN) return true;
  if (dev && origin !== null && /^http:\/\/localhost(:\d{1,5})?$/.test(origin)) {
    return true;
  }
  return false;
}

/** True when a frame exceeds the byte cap. Length is checked first so an
 *  oversized frame is rejected without encoding megabytes of it. */
export function frameTooLarge(message: string): boolean {
  if (message.length > PRESENCE_LIMITS.maxFrameBytes) return true;
  return encoder.encode(message).byteLength > PRESENCE_LIMITS.maxFrameBytes;
}

/**
 * Validate one text frame against the shared contract.
 *
 * An unknown `t` or unparseable JSON is a protocol violation. An unknown
 * pavilion slug is not: a visitor may still have an older bundle open when the
 * site ships a new pavilion, so that frame is dropped and the socket lives on
 * (spec §3).
 */
export function readFrame(raw: string): FrameVerdict {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { kind: "close" };
  }

  const parsed = clientMessageSchema.safeParse(value);
  if (parsed.success) return { kind: "ok", message: parsed.data };
  return isStaleLocation(value) ? { kind: "drop" } : { kind: "close" };
}

function isStaleLocation(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const frame = value as { t?: unknown; p?: unknown };
  return frame.t === "loc" && typeof frame.p === "string";
}

/**
 * Charge one inbound frame against the socket's flood window. Counted before
 * the frame is parsed, so a flood of garbage costs the room one comparison
 * per frame and then the socket. Valid frames are charged too: the room is one
 * single-threaded object for the whole site, and its CPU is the resource.
 */
export function chargeFrame(
  attachment: PresenceAttachment,
  now: number,
): FrameBudget {
  const fresh = now - attachment.frameWindowAt >= PRESENCE_LIMITS.frameWindowMs;
  const frameCount = fresh ? 1 : attachment.frameCount + 1;
  if (frameCount > PRESENCE_LIMITS.frameBurst) return { kind: "flood" };
  return {
    kind: "ok",
    attachment: {
      ...attachment,
      lastSeenAt: now,
      frameWindowAt: fresh ? now : attachment.frameWindowAt,
      frameCount,
    },
  };
}

/** True when the idle sweep should close this socket: silent past `idleMs`
 *  (the browser heartbeats every HEARTBEAT_MS) or older than `maxSessionMs`. */
export function isStale(attachment: PresenceAttachment, now: number): boolean {
  return (
    now - attachment.lastSeenAt > PRESENCE_LIMITS.idleMs ||
    now - attachment.joinedAt > PRESENCE_LIMITS.maxSessionMs
  );
}

/**
 * The string the per-IP cap hashes. IPv4 is used whole. IPv6 is truncated to
 * its /64 — a single host routinely holds a whole /64 and could otherwise
 * source thousands of "different" addresses and fill the room under the cap.
 * Anything unparseable falls into the shared UNKNOWN_IP bucket (fail closed).
 */
export function ipBucket(ip: string | null): string {
  if (ip === null || ip.length === 0 || ip.length > 45) return UNKNOWN_IP;
  if (!ip.includes(":")) return ip;
  const hextets = expandIpv6(ip);
  return hextets === null ? UNKNOWN_IP : hextets.slice(0, 4).join(":") + "::/64";
}

/** Expand `::` so the first four hextets are always addressable. */
function expandIpv6(ip: string): readonly string[] | null {
  const halves = ip.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] === "" ? [] : halves[0].split(":");
  const tail = halves.length === 2 && halves[1] !== "" ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return null;
  const all = [...head, ...Array<string>(missing).fill("0"), ...tail];
  if (!all.every((h) => /^[0-9a-fA-F]{1,4}$/.test(h))) return null;
  return all.map((h) => h.toLowerCase().padStart(4, "0"));
}

/** Token bucket: one accepted `loc` per window per socket. */
export function locAllowed(lastLocAt: number, now: number): boolean {
  return now - lastLocAt >= LOC_WINDOW_MS;
}

/** Random lowercase hex, `bytes` bytes wide. */
export function randomHex(bytes: number): string {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  return toHex(raw);
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * `RACER-####`, re-rolled while it collides with the current roster. The room
 * caps at 64 sockets against a 10,000-wide space, so a handful of attempts is
 * always enough; the bound exists so a bug can never spin here.
 */
export function newCallsign(taken: ReadonlySet<string>): string {
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const [n] = crypto.getRandomValues(new Uint32Array(1));
    const candidate = CALLSIGN_PREFIX + String(n % 10_000).padStart(4, "0");
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error("presence: could not allocate a free callsign");
}

/** Liveries hand out round-robin by roster size, so a small room is colourful. */
export function pickLivery(rosterSize: number): RoomLivery {
  return roomLiveries[rosterSize % roomLiveries.length];
}

/** Build the attachment for a socket joining a room that already holds
 *  `roster`. Pure: the caller supplies the id source and the clock. */
export function newAttachment(
  roster: readonly Player[],
  ipHash: string,
  now: number,
): PresenceAttachment {
  return {
    id: randomHex(16),
    callsign: newCallsign(new Set(roster.map((p) => p.callsign))),
    livery: pickLivery(roster.length),
    location: LOCATION_MAP,
    ipHash,
    joinedAt: now,
    lastLocAt: 0,
    lastSeenAt: now,
    frameWindowAt: now,
    frameCount: 0,
  };
}

/** The public view of an attachment. Nothing else ever leaves the room. */
export function toPlayer(attachment: PresenceAttachment): Player {
  return {
    id: attachment.id,
    callsign: attachment.callsign,
    livery: attachment.livery,
    location: attachment.location,
  };
}

/** Immutable update applied when a `loc` is accepted. */
export function withLocation(
  attachment: PresenceAttachment,
  location: Location,
  now: number,
): PresenceAttachment {
  return { ...attachment, location, lastLocAt: now };
}

/** How many of these attachments came from the same (hashed) address. */
export function countForIp(
  attachments: readonly PresenceAttachment[],
  ipHash: string,
): number {
  return attachments.filter((a) => a.ipHash === ipHash).length;
}
