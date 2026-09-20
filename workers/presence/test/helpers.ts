import { SELF } from "cloudflare:test";
import { ALLOWED_ORIGIN } from "../src/logic";
import type { Player, ServerMessage } from "../../../src/lib/presence/protocol";

export const PRESENCE_URL = "https://live.suryapugaz.com/room";

export interface ConnectOptions {
  /** Distinct per socket unless a test is exercising the per-IP cap. */
  readonly ip?: string;
  readonly origin?: string;
}

/** Raw upgrade request, so a test can assert on 403/429 without a socket. */
export function upgrade(options: ConnectOptions = {}): Promise<Response> {
  return SELF.fetch(PRESENCE_URL, {
    headers: {
      Upgrade: "websocket",
      Origin: options.origin ?? ALLOWED_ORIGIN,
      "cf-connecting-ip": options.ip ?? nextIp(),
    },
  });
}

let ipCounter = 0;

/** A fresh private-range address for every socket, so the per-IP cap only
 *  fires in the test that asks for it. */
export function nextIp(): string {
  ipCounter += 1;
  return `10.${(ipCounter >> 8) & 0xff}.${ipCounter & 0xff}.1`;
}

/**
 * A connected test client that records every frame it is sent, so assertions
 * wait for the n-th message instead of racing the room.
 */
export class Peer {
  readonly received: ServerMessage[] = [];
  closed: { code: number; reason: string } | null = null;

  private constructor(private readonly socket: WebSocket) {}

  static async open(options: ConnectOptions = {}): Promise<Peer> {
    const response = await upgrade(options);
    if (response.status !== 101 || response.webSocket === null) {
      throw new Error(`expected a 101 upgrade, got ${response.status}`);
    }
    const peer = new Peer(response.webSocket);
    peer.listen();
    return peer;
  }

  private listen(): void {
    this.socket.accept();
    this.socket.addEventListener("message", (event) => {
      this.received.push(JSON.parse(event.data as string) as ServerMessage);
    });
    this.socket.addEventListener("close", (event) => {
      this.closed = { code: event.code, reason: event.reason };
    });
  }

  send(frame: unknown): void {
    this.socket.send(typeof frame === "string" ? frame : JSON.stringify(frame));
  }

  close(): void {
    try {
      this.socket.close(1000, "test over");
    } catch {
      // Already gone.
    }
  }

  /** Every frame of one type received so far. */
  of<T extends ServerMessage["t"]>(type: T): Extract<ServerMessage, { t: T }>[] {
    return this.received.filter(
      (m): m is Extract<ServerMessage, { t: T }> => m.t === type,
    );
  }

  /** Resolve once at least `count` frames of `type` have arrived. */
  async expect<T extends ServerMessage["t"]>(
    type: T,
    count = 1,
  ): Promise<Extract<ServerMessage, { t: T }>> {
    await waitFor(
      () => this.of(type).length >= count,
      `${count} "${type}" frame(s)`,
    );
    return this.of(type)[count - 1];
  }

  /** Resolve once the room has hung up on this socket. */
  async expectClosed(): Promise<{ code: number; reason: string }> {
    await waitFor(() => this.closed !== null, "close");
    return this.closed as { code: number; reason: string };
  }

  /** This peer's own player record, from its `hello`. */
  async me(): Promise<Player> {
    return (await this.expect("hello")).you;
  }

  /**
   * The room as this peer currently understands it, replayed from the frames
   * it was sent — everyone except itself. Used to observe that a test's sockets
   * have really left before the next test starts.
   */
  peers(): Set<string> {
    const ids = new Set<string>();
    for (const message of this.received) {
      if (message.t === "hello") for (const p of message.roster) ids.add(p.id);
      else if (message.t === "join") ids.add(message.p.id);
      else if (message.t === "leave") ids.delete(message.id);
    }
    return ids;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitFor(
  predicate: () => boolean,
  label: string,
  timeoutMs = 10_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`);
    await sleep(10);
  }
}
