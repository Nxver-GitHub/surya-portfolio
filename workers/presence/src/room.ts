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
  chargeFrame,
  countForIp,
  frameTooLarge,
  ipBucket,
  isStale,
  locAllowed,
  newAttachment,
  readFrame,
  toHex,
  toPlayer,
  withLocation,
  type PresenceAttachment,
} from "./logic";

export interface Env {
  readonly ROOM: DurableObjectNamespace<PresenceRoom>;
  /** "1" only under `wrangler dev`; never defined in production. */
  readonly PRESENCE_DEV?: string;
  /**
   * Optional `wrangler secret`. When set, the per-IP cap hashes under this key
   * instead of a per-boot random one, so the cap also holds across hibernation
   * wakes. Without it the room still works; the idle sweep is the backstop.
   */
  readonly PRESENCE_IP_KEY?: string;
}

export class PresenceRoom extends DurableObject<Env> {
  /**
   * HMAC key for the per-IP cap. `PRESENCE_IP_KEY` when the owner has set it;
   * otherwise generated in memory on wake and never persisted, in which case
   * sockets attached before a hibernation wake stop counting toward their
   * address — the idle sweep in `fetch` bounds how long that can matter.
   * Either way no address, raw or derived, is ever logged or stored (spec §5).
   */
  readonly #ipKeyBytes = this.env.PRESENCE_IP_KEY
    ? new TextEncoder().encode(this.env.PRESENCE_IP_KEY)
    : crypto.getRandomValues(new Uint8Array(32));
  #ipKey: Promise<CryptoKey> | null = null;

  /** Upgrade entry point. The Worker has already checked Origin and path. */
  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("expected a websocket upgrade", { status: 426 });
    }

    const ipHash = await this.#hashIp(request.headers.get("cf-connecting-ip"));
    // Everything from here to acceptWebSocket is synchronous. A Durable Object
    // runs one event at a time, so two concurrent upgrades cannot both read
    // the roster before either is admitted — the caps are exact.
    this.#sweepStale(Date.now());
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
    const attachment = this.#charge(ws);
    if (attachment === null) return;

    if (typeof message !== "string" || frameTooLarge(message)) {
      this.#departAndClose(ws, "frame");
      return;
    }

    const verdict = readFrame(message);
    if (verdict.kind === "close") {
      this.#departAndClose(ws, "protocol");
      return;
    }
    if (verdict.kind === "drop" || verdict.message.t === "ping") return;
    this.#applyLocation(ws, attachment, verdict.message.p);
  }

  /**
   * Charge the frame against the socket's flood budget and record activity,
   * BEFORE the frame is looked at. Returns the updated attachment, or null when
   * the socket was closed (flooding, or no attachment to charge).
   */
  #charge(ws: WebSocket): PresenceAttachment | null {
    const attachment = this.#attachmentOf(ws);
    if (attachment === null) {
      this.#departAndClose(ws, "state");
      return null;
    }
    const budget = chargeFrame(attachment, Date.now());
    if (budget.kind === "flood") {
      this.#departAndClose(ws, "flood");
      return null;
    }
    ws.serializeAttachment(budget.attachment);
    return budget.attachment;
  }

  /**
   * Close sockets that stopped heartbeating or outlived the session ceiling.
   * Runs on every upgrade, so a room filled by idle sockets frees itself the
   * moment a real visitor arrives — no alarm, no storage.
   */
  #sweepStale(now: number): void {
    let swept = 0;
    for (const ws of this.ctx.getWebSockets()) {
      const attachment = this.#attachmentOf(ws);
      if (attachment === null || !isStale(attachment, now)) continue;
      this.#depart(ws);
      this.#close(ws, 1000, "idle");
      swept += 1;
    }
    if (swept > 0) console.info(`presence: swept ${swept} idle socket(s)`);
  }

  override async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
  ): Promise<void> {
    this.#depart(ws);
    // Complete the closing handshake so the socket leaves getWebSockets()
    // promptly instead of lingering as a phantom in the next hello roster.
    this.#close(ws, code === 1005 ? 1000 : code, reason);
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
      new TextEncoder().encode(ipBucket(ip)),
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
