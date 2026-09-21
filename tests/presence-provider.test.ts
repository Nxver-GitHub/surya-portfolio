// @vitest-environment jsdom
/**
 * presence-provider — exercises PresenceProvider's socket lifecycle against a
 * fake global WebSocket. Covers: hello → online roster, join/leave/loc
 * applied immutably, invalid frames ignored, full-close gives up forever,
 * backoff gives up after 5 attempts, no socket without a URL, no socket
 * before the boot gate is set.
 */
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import {
  CLOSE_CODES,
  type Player,
  type ServerMessage,
  HEARTBEAT_MS,
} from "@/lib/presence/protocol";
import { usePresence } from "@/lib/presence/usePresence";
import { PresenceProvider } from "@/components/presence/PresenceProvider";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

let mockPathname = "/";

const BOOT_SEEN_KEY = "sr-boot-seen";

/** A fake WebSocket that records every instance created so tests can drive
 * open/message/close from outside, mirroring the browser's event surface. */
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSED = 3;

  url: string;
  readyState = FakeWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    if (this.readyState !== FakeWebSocket.OPEN) {
      throw new Error("socket not open");
    }
    this.sent.push(data);
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
  }

  /** Test helper: simulate the server opening the connection and sending hello. */
  simulateOpen() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  simulateMessage(msg: unknown) {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }

  simulateRawMessage(data: string) {
    this.onmessage?.({ data });
  }

  simulateClose(code: number) {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code });
  }

  static reset() {
    FakeWebSocket.instances = [];
  }
}

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: "player-you",
    callsign: "RACER-0001",
    livery: "gulf",
    location: "map",
    ...overrides,
  };
}

function Probe({ onState }: { onState: (s: ReturnType<typeof usePresence>) => void }) {
  const state = usePresence();
  onState(state);
  return null;
}

async function renderProvider(): Promise<{
  states: ReturnType<typeof usePresence>[];
  unmount: () => void;
}> {
  const states: ReturnType<typeof usePresence>[] = [];
  const { unmount } = render(
    createElement(
      PresenceProvider,
      null,
      createElement(Probe, { onState: (s) => states.push(s) }),
    ),
  );
  return { states, unmount };
}

function latest<T>(arr: T[]): T {
  return arr[arr.length - 1];
}

describe("PresenceProvider", () => {
  const originalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    vi.useFakeTimers();
    // Backoff is jittered ±30%; pin Math.random at the midpoint so the delay
    // assertions below are exact (spread factor = 1.0).
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    mockPathname = "/";
    FakeWebSocket.reset();
    // @ts-expect-error - test double, not a full WebSocket implementation
    globalThis.WebSocket = FakeWebSocket;
    sessionStorage.clear();
    vi.stubEnv("NEXT_PUBLIC_PRESENCE_URL", "wss://live.example.test/room");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.WebSocket = originalWebSocket;
    vi.unstubAllEnvs();
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  it("stays offline with no socket when the URL is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRESENCE_URL", "");
    sessionStorage.setItem(BOOT_SEEN_KEY, "1");
    const { states } = await renderProvider();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(FakeWebSocket.instances).toHaveLength(0);
    expect(latest(states).status).toBe("offline");
  });

  it("does not open a socket until the boot gate is set", async () => {
    const { states } = await renderProvider();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(FakeWebSocket.instances).toHaveLength(0);
    expect(latest(states).status).toBe("offline");

    await act(async () => {
      sessionStorage.setItem(BOOT_SEEN_KEY, "1");
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("applies hello, join, leave, and loc immutably", async () => {
    sessionStorage.setItem(BOOT_SEEN_KEY, "1");
    const { states } = await renderProvider();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(FakeWebSocket.instances).toHaveLength(1);
    const ws = FakeWebSocket.instances[0];

    const you = makePlayer({ id: "player-you", callsign: "RACER-0002" });
    const other = makePlayer({ id: "player-other", callsign: "RACER-0001" });
    const hello: ServerMessage = { t: "hello", you, roster: [you, other] };

    await act(async () => {
      ws.simulateOpen();
      ws.simulateMessage(hello);
    });

    const afterHello = latest(states);
    expect(afterHello.status).toBe("online");
    expect(afterHello.you).toEqual(you);
    // sorted by callsign
    expect(afterHello.roster.map((p) => p.id)).toEqual(["player-other", "player-you"]);

    const rosterAfterHello = afterHello.roster;

    const joiner = makePlayer({ id: "player-new", callsign: "RACER-0000" });
    await act(async () => {
      ws.simulateMessage({ t: "join", p: joiner } satisfies ServerMessage);
    });
    const afterJoin = latest(states);
    expect(afterJoin.roster.map((p) => p.id)).toEqual([
      "player-new",
      "player-other",
      "player-you",
    ]);
    // previous roster array must not have been mutated in place
    expect(rosterAfterHello.map((p) => p.id)).toEqual(["player-other", "player-you"]);

    await act(async () => {
      ws.simulateMessage({
        t: "loc",
        id: "player-other",
        p: "garage",
      } satisfies ServerMessage);
    });
    const afterLoc = latest(states);
    const movedPlayer = afterLoc.roster.find((p) => p.id === "player-other");
    expect(movedPlayer?.location).toBe("garage");
    // untouched entries keep their identity semantics but not the same object
    expect(afterJoin.roster.find((p) => p.id === "player-other")?.location).toBe(
      "map",
    );

    await act(async () => {
      ws.simulateMessage({ t: "leave", id: "player-new" } satisfies ServerMessage);
    });
    const afterLeave = latest(states);
    expect(afterLeave.roster.map((p) => p.id)).toEqual(["player-other", "player-you"]);
  });

  it("drops invalid frames silently and keeps prior state", async () => {
    sessionStorage.setItem(BOOT_SEEN_KEY, "1");
    const { states } = await renderProvider();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const ws = FakeWebSocket.instances[0];
    const you = makePlayer();
    await act(async () => {
      ws.simulateOpen();
      ws.simulateMessage({ t: "hello", you, roster: [you] } satisfies ServerMessage);
    });
    const before = latest(states);

    await act(async () => {
      ws.simulateRawMessage("not json{{{");
      ws.simulateMessage({ t: "loc", id: "player-you", p: "not-a-real-place" });
      ws.simulateMessage({ t: "unknown-type", whatever: true });
    });

    const after = latest(states);
    expect(after).toEqual(before);
  });

  it("never reconnects after a full-room close (1013)", async () => {
    sessionStorage.setItem(BOOT_SEEN_KEY, "1");
    const { states } = await renderProvider();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const ws = FakeWebSocket.instances[0];
    await act(async () => {
      ws.simulateOpen();
      ws.simulateMessage({ t: "full" } satisfies ServerMessage);
      ws.simulateClose(CLOSE_CODES.full);
    });
    expect(latest(states).status).toBe("offline");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("gives up after 5 reconnect attempts and goes offline for the session", async () => {
    sessionStorage.setItem(BOOT_SEEN_KEY, "1");
    const { states } = await renderProvider();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Fail the initial connection plus 5 reconnect attempts (delays 1,2,4,8,16s).
    for (let i = 0; i < 6; i++) {
      const ws = latest(FakeWebSocket.instances);
      await act(async () => {
        ws.simulateClose(1006);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(32000);
      });
    }

    expect(latest(states).status).toBe("offline");
    const countAfterGivingUp = FakeWebSocket.instances.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });
    expect(FakeWebSocket.instances).toHaveLength(countAfterGivingUp);
  });

  it("resets the reconnect attempt counter only after a connection stays up", async () => {
    sessionStorage.setItem(BOOT_SEEN_KEY, "1");
    const { states } = await renderProvider();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // First connection fails, triggering one reconnect attempt (1s).
    const firstWs = FakeWebSocket.instances[0];
    await act(async () => {
      firstWs.simulateClose(1006);
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(FakeWebSocket.instances).toHaveLength(2);

    // Second connection says hello, then drops right away: a flap. The
    // counter must NOT have reset, so the next delay is 2s, not 1s.
    const secondWs = latest(FakeWebSocket.instances);
    const you = makePlayer();
    await act(async () => {
      secondWs.simulateOpen();
      secondWs.simulateMessage({ t: "hello", you, roster: [you] } satisfies ServerMessage);
    });
    expect(latest(states).status).toBe("online");
    await act(async () => {
      secondWs.simulateClose(1006);
      await vi.advanceTimersByTimeAsync(1999);
    });
    expect(FakeWebSocket.instances).toHaveLength(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(FakeWebSocket.instances).toHaveLength(3);

    // Third connection stays up past the stability window; the counter
    // resets and the next drop backs off from 1s again.
    const thirdWs = latest(FakeWebSocket.instances);
    await act(async () => {
      thirdWs.simulateOpen();
      thirdWs.simulateMessage({ t: "hello", you, roster: [you] } satisfies ServerMessage);
      await vi.advanceTimersByTimeAsync(60000);
    });
    await act(async () => {
      thirdWs.simulateClose(1006);
      await vi.advanceTimersByTimeAsync(999);
    });
    expect(FakeWebSocket.instances).toHaveLength(3);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(FakeWebSocket.instances).toHaveLength(4);
  });

  it("includes you in the roster even when the hello roster omits you (production shape)", async () => {
    sessionStorage.setItem(BOOT_SEEN_KEY, "1");
    const { states } = await renderProvider();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const ws = FakeWebSocket.instances[0];
    const you = makePlayer({ id: "player-you", callsign: "RACER-0002" });
    const other = makePlayer({ id: "player-other", callsign: "RACER-0001" });
    await act(async () => {
      ws.simulateOpen();
      // The room computes the roster before admitting the new socket.
      ws.simulateMessage({ t: "hello", you, roster: [other] } satisfies ServerMessage);
    });
    expect(latest(states).roster.map((p) => p.id)).toEqual(["player-other", "player-you"]);

    // A lone visitor: empty roster from the room still yields ONLINE 1.
    await act(async () => {
      ws.simulateMessage({ t: "hello", you, roster: [] } satisfies ServerMessage);
    });
    expect(latest(states).roster.map((p) => p.id)).toEqual(["player-you"]);
  });

  it("applies its own location locally, since the room never echoes it back", async () => {
    sessionStorage.setItem(BOOT_SEEN_KEY, "1");
    mockPathname = "/lobby";
    const { states } = await renderProvider();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const ws = FakeWebSocket.instances[0];
    const you = makePlayer({ location: "map" });
    await act(async () => {
      ws.simulateOpen();
      ws.simulateMessage({ t: "hello", you, roster: [] } satisfies ServerMessage);
    });
    // hello triggers a loc send for the current pathname; no server echo.
    expect(ws.sent.map((f) => JSON.parse(f))).toContainEqual({ t: "loc", p: "lobby" });
    const s = latest(states);
    expect(s.you?.location).toBe("lobby");
    expect(s.roster.find((p) => p.id === you.id)?.location).toBe("lobby");
  });

  it("heartbeats with a ping every HEARTBEAT_MS while online, and stops on close", async () => {
    sessionStorage.setItem(BOOT_SEEN_KEY, "1");
    await renderProvider();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const ws = FakeWebSocket.instances[0];
    const you = makePlayer();
    await act(async () => {
      ws.simulateOpen();
      ws.simulateMessage({ t: "hello", you, roster: [you] } satisfies ServerMessage);
    });
    const pings = () => ws.sent.filter((f) => JSON.parse(f).t === "ping").length;
    expect(pings()).toBe(0);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(HEARTBEAT_MS);
    });
    expect(pings()).toBe(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(HEARTBEAT_MS);
    });
    expect(pings()).toBe(2);
    await act(async () => {
      ws.simulateClose(1006);
      await vi.advanceTimersByTimeAsync(HEARTBEAT_MS);
    });
    expect(pings()).toBe(2);
  });
});
