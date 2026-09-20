/**
 * PresenceRoom — the Durable Object behind `wss://live.suryapugaz.com/room`.
 *
 * One global room. The roster is derived entirely from `ctx.getWebSockets()`
 * and each socket's hibernation attachment, so it costs nothing to rebuild when
 * the object wakes and there is no persisted state at all: **no `ctx.storage`
 * call appears in this package**, which `test/no-storage.test.ts` asserts at the
 * source level.
 *
 * Logging is counts only — never an IP, a user agent, or a callsign paired with
 * either. Design record: Docs/story-lobby-presence.md §3 and §5.
 */

import { DurableObject } from "cloudflare:workers";
import {
  CLOSE_CODES,
  PRESENCE_LIMITS,
  type Player,
  type ServerMessage,
} from "../../../src/lib/presence/protocol";
import {
  countForIp,
  frameTooLarge,
  locAllowed,
  newAttachment,
  readFrame,
  toHex,
  toPlayer,
  UNKNOWN_IP,
  withLocation,
  type PresenceAttachment,
} from "./logic";

export interface Env {
  readonly ROOM: DurableObjectNamespace<PresenceRoom>;
  /** "1" only under `wrangler dev`; never defined in production. */
  readonly PRESENCE_DEV?: string;
}

export class PresenceRoom extends DurableObject<Env> {
  /**
   * HMAC key for the per-IP cap. Generated in memory when the object wakes and
   * never persisted, so the cap holds for one lifetime and no address — raw or
   * derived — outlives the process. After a hibernation wake the key is new, so
   * sockets attached before the wake stop counting toward their address's cap;
   * that is the deliberate trade for storing nothing (spec §5).
   */
  readonly #ipKeyBytes = crypto.getRandomValues(new Uint8Array(32));
  #ipKey: Promise<CryptoKey> | null = null;

  /** Upgrade entry point. The Worker has already checked Origin and path. */
  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("expected a websocket upgrade", { status: 426 });
    }

    const ipHash = await this.#hashIp(request.headers.get("cf-connecting-ip"));
    const sockets = this.ctx.getWebSockets();
    if (countForIp(this.#attachments(sockets), ipHash) >= PRESENCE_LIMITS.perIpCap) {
      return new Response("too many connections", { status: 429 });
    }

    const { 0: client, 1: server } = new WebSocketPair();
    if (sockets.length >= PRESENCE_LIMITS.roomCap) {
      this.#rejectFull(server);
    } else {
      this.#admit(server, ipHash);
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  /* ── Hibernation handlers ──────────────────────────────────────────── */

  override async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    if (typeof message !== "string" || frameTooLarge(message)) {
      this.#departAndClose(ws, "frame");
      return;
    }

    const verdict = readFrame(message);
    if (verdict.kind === "close") {
      this.#departAndClose(ws, "protocol");
      return;
    }
    if (verdict.kind === "drop") return;

    const attachment = this.#attachmentOf(ws);
    if (attachment === null) {
      this.#departAndClose(ws, "state");
      return;
    }
    this.#applyLocation(ws, attachment, verdict.message.p);
  }

  override async webSocketClose(ws: WebSocket): Promise<void> {
    this.#depart(ws);
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    // The error object can carry request detail; only the count is logged.
    console.warn(`presence: socket error, roster=${this.ctx.getWebSockets().length}`);
    this.#depart(ws);
  }

  /* ── Join / leave ──────────────────────────────────────────────────── */

  #admit(server: WebSocket, ipHash: string): void {
    const roster = this.#roster();
    const attachment = newAttachment(roster, ipHash, Date.now());

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(attachment);

    const you = toPlayer(attachment);
    this.#send(server, { t: "hello", you, roster });
    this.#broadcast({ t: "join", p: you }, server);
  }

  /** Room at cap: accept outside the hibernation set so the socket never joins
   *  the roster, say `full`, and close 1013 so the client does not retry. */
  #rejectFull(server: WebSocket): void {
    server.accept();
    this.#send(server, { t: "full" });
    this.#close(server, CLOSE_CODES.full, "room full");
    console.warn(`presence: room full, roster=${this.ctx.getWebSockets().length}`);
  }

  /** Client-initiated close or socket error: tell everyone else. */
  #depart(ws: WebSocket): void {
    const attachment = this.#attachmentOf(ws);
    if (attachment === null) return;
    this.#broadcast({ t: "leave", id: attachment.id }, ws);
  }

  /**
   * Server-initiated close. `webSocketClose` only fires for closes the client
   * started, so the leave has to be broadcast here before hanging up.
   */
  #departAndClose(ws: WebSocket, reason: string): void {
    this.#depart(ws);
    this.#close(ws, CLOSE_CODES.policy, reason);
  }

  #applyLocation(
    ws: WebSocket,
    attachment: PresenceAttachment,
    location: Player["location"],
  ): void {
    const now = Date.now();
    if (!locAllowed(attachment.lastLocAt, now)) return; // over budget, dropped
    const next = withLocation(attachment, location, now);
    ws.serializeAttachment(next);
    this.#broadcast({ t: "loc", id: next.id, p: next.location }, ws);
  }

  /* ── Roster + transport helpers ────────────────────────────────────── */

  #roster(): Player[] {
    return this.#attachments(this.ctx.getWebSockets()).map(toPlayer);
  }

  #attachments(sockets: readonly WebSocket[]): PresenceAttachment[] {
    return sockets
      .map((ws) => this.#attachmentOf(ws))
      .filter((a): a is PresenceAttachment => a !== null);
  }

  #attachmentOf(ws: WebSocket): PresenceAttachment | null {
    try {
      return (ws.deserializeAttachment() as PresenceAttachment | null) ?? null;
    } catch {
      // A socket accepted but not yet attached, or attached by an older build.
      return null;
    }
  }

  #send(ws: WebSocket, message: ServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      // Peer vanished between the roster read and this send; its close handler
      // will broadcast the leave. Nothing to report.
    }
  }

  #broadcast(message: ServerMessage, except: WebSocket): void {
    for (const peer of this.ctx.getWebSockets()) {
      if (peer === except) continue;
      this.#send(peer, message);
    }
  }

  #close(ws: WebSocket, code: number, reason: string): void {
    try {
      ws.close(code, reason);
    } catch {
      // Already closing. Harmless.
    }
  }

  /* ── Per-IP hashing ────────────────────────────────────────────────── */

  async #hashIp(ip: string | null): Promise<string> {
    const key = await this.#hmacKey();
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(ip ?? UNKNOWN_IP),
    );
    return toHex(new Uint8Array(signature));
  }

  #hmacKey(): Promise<CryptoKey> {
    this.#ipKey ??= crypto.subtle.importKey(
      "raw",
      this.#ipKeyBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    return this.#ipKey;
  }
}
