import { SELF } from "cloudflare:test";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  CLOSE_CODES,
  PRESENCE_LIMITS,
  roomLiveries,
  type Player,
} from "../../../src/lib/presence/protocol";
import { LOC_WINDOW_MS } from "../src/logic";
import {
  ConnectOptions,
  Peer,
  PRESENCE_URL,
  nextIp,
  sleep,
  upgrade,
  waitFor,
} from "./helpers";

/**
 * The room is a singleton (`idFromName("global")`), so these tests share one
 * object. `watcher` is a socket that stays connected for the whole file and
 * replays join/leave frames; `afterEach` waits until it can see that every
 * socket a test opened has really left, which is what makes the next test's
 * roster assertions deterministic.
 */
let watcher: Peer;
let watcherPlayer: Player;
const opened: Peer[] = [];

beforeAll(async () => {
  watcher = await Peer.open();
  watcherPlayer = await watcher.me();
});

afterEach(async () => {
  for (const peer of opened) peer.close();
  opened.length = 0;
  await waitFor(() => watcher.peers().size === 0, "the room to drain");
});

async function join(options: ConnectOptions = {}): Promise<Peer> {
  const peer = await Peer.open(options);
  opened.push(peer);
  return peer;
}

describe("front door", () => {
  it("serves health and refuses everything that is not the room upgrade", async () => {
    const health = await SELF.fetch("https://live.suryapugaz.com/health");
    expect(health.status).toBe(200);
    expect(await health.text()).toBe("ok");

    const wrongPath = await SELF.fetch("https://live.suryapugaz.com/", {
      headers: { Upgrade: "websocket", Origin: "https://suryapugaz.com" },
    });
    expect(wrongPath.status).toBe(404);

    const plainGet = await SELF.fetch(PRESENCE_URL);
    expect(plainGet.status).toBe(404);
  });

  it("rejects a foreign or missing Origin with 403", async () => {
    const foreign = await upgrade({ origin: "https://not-suryapugaz.com" });
    expect(foreign.status).toBe(403);
    expect(foreign.webSocket).toBeNull();

    const lookalike = await upgrade({ origin: "https://suryapugaz.com.evil.test" });
    expect(lookalike.status).toBe(403);

    const anonymous = await SELF.fetch(PRESENCE_URL, {
      headers: { Upgrade: "websocket", "cf-connecting-ip": nextIp() },
    });
    expect(anonymous.status).toBe(403);
  });
});

describe("roster", () => {
  it("greets a new socket with its own player and the current roster", async () => {
    const first = await join();
    const firstHello = await first.expect("hello");

    expect(firstHello.roster.map((p) => p.id)).toEqual([watcherPlayer.id]);
    expect(firstHello.you.callsign).toMatch(/^RACER-\d{4}$/);
    expect(firstHello.you.location).toBe("map");
    expect(roomLiveries).toContain(firstHello.you.livery);

    const second = await join();
    const secondHello = await second.expect("hello");
    expect(new Set(secondHello.roster.map((p) => p.id))).toEqual(
      new Set([watcherPlayer.id, firstHello.you.id]),
    );
  });

  it("broadcasts a join to the rest of the room and a leave on disconnect", async () => {
    const observer = await join();
    await observer.me();

    const newcomer = await join();
    const newcomerPlayer = await newcomer.me();

    const joined = await observer.expect("join");
    expect(joined.p).toEqual(newcomerPlayer);

    newcomer.close();
    const left = await observer.expect("leave");
    expect(left.id).toBe(newcomerPlayer.id);
  });

  it("hands every live socket a distinct callsign and id", async () => {
    const peers = await Promise.all(
      Array.from({ length: 12 }, () => join()),
    );
    const players = await Promise.all(peers.map((p) => p.me()));

    expect(new Set(players.map((p) => p.callsign)).size).toBe(players.length);
    expect(new Set(players.map((p) => p.id)).size).toBe(players.length);
    for (const player of players) {
      expect(player.callsign).toMatch(/^RACER-\d{4}$/);
      expect(roomLiveries).toContain(player.livery);
    }
  });
});

describe("location updates", () => {
  it("broadcasts an accepted loc and drops the excess inside one second", async () => {
    const observer = await join();
    await observer.me();
    const mover = await join();
    const moverPlayer = await mover.me();
    await observer.expect("join");

    mover.send({ t: "loc", p: "garage" });
    const first = await observer.expect("loc");
    expect(first).toEqual({ t: "loc", id: moverPlayer.id, p: "garage" });

    // Second update inside the same window: silently dropped, socket unharmed.
    mover.send({ t: "loc", p: "scapes" });
    await sleep(250);
    expect(observer.of("loc")).toHaveLength(1);
    expect(mover.closed).toBeNull();

    await sleep(LOC_WINDOW_MS);
    mover.send({ t: "loc", p: "lobby" });
    const second = await observer.expect("loc", 2);
    expect(second.p).toBe("lobby");
  }, 20_000);

  it("drops an unknown location without closing the socket", async () => {
    const observer = await join();
    await observer.me();
    const mover = await join();
    const moverPlayer = await mover.me();
    await observer.expect("join");

    mover.send({ t: "loc", p: "teleporter" });
    await sleep(250);
    expect(mover.closed).toBeNull();
    expect(observer.of("loc")).toHaveLength(0);

    // A stale frame must not spend the socket's budget either.
    mover.send({ t: "loc", p: "missions" });
    const accepted = await observer.expect("loc");
    expect(accepted).toEqual({ t: "loc", id: moverPlayer.id, p: "missions" });
  });
});

describe("protocol violations", () => {
  it("closes 1008 on an oversized frame", async () => {
    const peer = await join();
    await peer.me();

    peer.send(
      JSON.stringify({ t: "loc", p: "garage", pad: "x".repeat(5000) }),
    );
    const closed = await peer.expectClosed();
    expect(closed.code).toBe(CLOSE_CODES.policy);
  });

  it("closes 1008 on unparseable JSON and on an unknown message type", async () => {
    const garbage = await join();
    await garbage.me();
    garbage.send("}{ not json");
    expect((await garbage.expectClosed()).code).toBe(CLOSE_CODES.policy);

    const stranger = await join();
    await stranger.me();
    stranger.send({ t: "chat", m: "hello?" });
    expect((await stranger.expectClosed()).code).toBe(CLOSE_CODES.policy);
  });
});

describe("caps", () => {
  it("refuses a fourth concurrent socket from one address with 429", async () => {
    const ip = "198.51.100.7";
    const held = await Promise.all([
      join({ ip }),
      join({ ip }),
      join({ ip }),
    ]);
    await Promise.all(held.map((p) => p.me()));

    const refused = await upgrade({ ip });
    expect(refused.status).toBe(429);
    expect(refused.webSocket).toBeNull();

    // A different address is unaffected.
    const other = await upgrade({ ip: "198.51.100.8" });
    expect(other.status).toBe(101);
    other.webSocket?.accept();
    other.webSocket?.close(1000, "done");
  });

  it("sends full and closes 1013 once the room is at cap", async () => {
    // `watcher` already holds one slot, so fill the remaining cap - 1.
    for (let i = 0; i < PRESENCE_LIMITS.roomCap - 1; i += 1) {
      const peer = await join();
      await peer.me();
    }

    const turnedAway = await Peer.open();
    expect((await turnedAway.expect("full")).t).toBe("full");
    expect((await turnedAway.expectClosed()).code).toBe(CLOSE_CODES.full);
  }, 60_000);
});
