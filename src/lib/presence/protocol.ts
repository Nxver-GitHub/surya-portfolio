/**
 * presence/protocol — the wire contract between the browser and the presence
 * Durable Object (workers/presence). This is the ONLY file both sides import,
 * so the schema lives here once and is validated with zod on both ends: the
 * DO rejects anything that fails `clientMessageSchema`, the browser ignores
 * anything that fails `serverMessageSchema`. Pure module: no React, no
 * Workers APIs, importable from node tests.
 *
 * Design record: Docs/story-lobby-presence.md (local-only).
 */

import { z } from "zod";
import { pavilions } from "../../../content/pavilions";
import type { LiveryId } from "../../../content/liveries";

/** Where a player is. Every pavilion slug plus "map" for the world map. */
export const LOCATION_MAP = "map" as const;
export const locationSlugs = [
  LOCATION_MAP,
  ...pavilions.map((p) => p.slug),
] as const;
export type Location = (typeof locationSlugs)[number];
export const locationSchema = z.enum(locationSlugs);

/** Liveries the room hands out, round-robin. Subset of content/liveries.ts
 *  chosen for contrast against the lobby's own Red Bull chrome. */
export const roomLiveries = [
  "gulf",
  "marlboro",
  "jps",
  "martini",
  "rothmans",
  "calsonic",
  "west",
  "jager",
] as const satisfies readonly LiveryId[];
export type RoomLivery = (typeof roomLiveries)[number];
export const roomLiverySchema = z.enum(roomLiveries);

/** Callsign shape: RACER-#### (four digits, leading zeros allowed). */
export const CALLSIGN_PREFIX = "RACER-";
export const callsignSchema = z
  .string()
  .regex(/^RACER-\d{4}$/, "callsign must be RACER-####");

export const playerSchema = z.object({
  /** Opaque random id — never derived from IP or user agent. */
  id: z.string().min(8).max(64),
  callsign: callsignSchema,
  livery: roomLiverySchema,
  location: locationSchema,
});
export type Player = z.infer<typeof playerSchema>;

/* ── Client → server ─────────────────────────────────────────────────── */

export const clientMessageSchema = z.discriminatedUnion("t", [
  z.object({ t: z.literal("loc"), p: locationSchema }),
  /** Heartbeat. No reply; it only proves the tab is still open so the room's
   *  idle sweep leaves the socket alone. Sent every HEARTBEAT_MS. */
  z.object({ t: z.literal("ping") }),
]);
export type ClientMessage = z.infer<typeof clientMessageSchema>;

/* ── Server → client ─────────────────────────────────────────────────── */

const idSchema = playerSchema.shape.id;

export const serverMessageSchema = z.discriminatedUnion("t", [
  z.object({
    t: z.literal("hello"),
    you: playerSchema,
    roster: z.array(playerSchema).max(64),
  }),
  z.object({ t: z.literal("join"), p: playerSchema }),
  z.object({ t: z.literal("leave"), id: idSchema }),
  z.object({ t: z.literal("loc"), id: idSchema, p: locationSchema }),
  z.object({ t: z.literal("full") }),
]);
export type ServerMessage = z.infer<typeof serverMessageSchema>;

/* ── Limits (enforced by the DO; mirrored here so the client never sends
      something the room would close on) ─────────────────────────────── */

export const PRESENCE_LIMITS = {
  /** Sockets per room; the 65th gets `full` and close 1013. */
  roomCap: 64,
  /** Concurrent sockets per IP, checked at upgrade → 429. */
  perIpCap: 3,
  /** Max inbound frame size in bytes; larger → close 1008. */
  maxFrameBytes: 4096,
  /** `loc` messages per socket per second; excess silently dropped. */
  locPerSecond: 1,
  /** Any frames (valid or not) a socket may send per `frameWindowMs` before
   *  the room closes it 1008. Generous for a real browser (≤ 1 loc/s plus a
   *  heartbeat every few minutes), fatal for a flood. */
  frameBurst: 20,
  frameWindowMs: 10_000,
  /** A socket silent for this long is swept on the next upgrade. Must exceed
   *  HEARTBEAT_MS by a comfortable margin. */
  idleMs: 10 * 60_000,
  /** Hard ceiling on one socket's life; the client reconnects transparently. */
  maxSessionMs: 8 * 60 * 60_000,
} as const;

/** Client heartbeat cadence — well inside `idleMs`. */
export const HEARTBEAT_MS = 4 * 60_000;

/** WebSocket close codes the room uses. */
export const CLOSE_CODES = {
  /** Room at cap — client must NOT reconnect. */
  full: 1013,
  /** Protocol violation (bad JSON, unknown type, oversize frame). */
  policy: 1008,
} as const;

/** Path the upgrade request must hit on the presence Worker. */
export const PRESENCE_PATH = "/room";
