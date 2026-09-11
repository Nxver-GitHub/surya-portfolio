import { describe, expect, it, vi } from "vitest";
import { BGM_GAIN, BgmEngine, type BgmEngineOptions } from "@/lib/bgm";
import { musicCredit, musicPlaylist } from "../content/music";

interface SourceRecord {
  buffer: AudioBuffer | null;
  started: number[];
  stoppedAt: number[];
  ended: (() => void) | null;
  /** Pretend the track ran out: what the browser does at source.stop(). */
  finish(): void;
}

interface GainRecord {
  ramps: { target: number; when: number }[];
  cancelled: number;
}

/** Minimal fake Web Audio graph — records the nodes it hands out. */
function makeFakeContext(state: AudioContextState = "running") {
  const sinks = { connect: () => sinks } as unknown as AudioNode;
  const sources: SourceRecord[] = [];
  const gains: GainRecord[] = [];

  const ctx = {
    state,
    currentTime: 0,
    destination: sinks,
    createBufferSource: () => {
      const record: SourceRecord = {
        buffer: null,
        started: [],
        stoppedAt: [],
        ended: null,
        finish() {
          record.ended?.();
        },
      };
      sources.push(record);
      return {
        get buffer() {
          return record.buffer;
        },
        set buffer(value: AudioBuffer | null) {
          record.buffer = value;
        },
        set onended(handler: (() => void) | null) {
          record.ended = handler;
        },
        get onended() {
          return record.ended;
        },
        connect: () => sinks,
        start: (t: number) => record.started.push(t),
        stop: (t?: number) => record.stoppedAt.push(t ?? -1),
      };
    },
    createGain: () => {
      const record: GainRecord = { ramps: [], cancelled: 0 };
      gains.push(record);
      return {
        gain: {
          value: 0,
          setValueAtTime: vi.fn(),
          cancelScheduledValues: () => {
            record.cancelled += 1;
          },
          linearRampToValueAtTime: (target: number, when: number) => {
            record.ramps.push({ target, when });
          },
        },
        connect: () => sinks,
      };
    },
    decodeAudioData: vi.fn(async () => ({ duration: 120 }) as AudioBuffer),
    resume: vi.fn(async () => {
      ctx.state = "running";
    }),
    suspend: vi.fn(async () => {
      ctx.state = "suspended";
    }),
    close: vi.fn(async () => {
      ctx.state = "closed";
    }),
  };

  return { ctx: ctx as unknown as AudioContext, raw: ctx, sources, gains };
}

function okResponse(): Response {
  return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) } as Response;
}

function missingResponse(): Response {
  return {
    ok: false,
    status: 404,
    arrayBuffer: async () => new ArrayBuffer(0),
  } as unknown as Response;
}

/**
 * Build an engine whose fades resolve immediately and whose rotation starts at
 * a known index, so tests stay deterministic and real-time.
 */
function makeEngine(
  fetcher: (url: string) => Promise<Response>,
  {
    state = "running" as AudioContextState,
    startAt = 0,
  }: { state?: AudioContextState; startAt?: number } = {},
) {
  const fake = makeFakeContext(state);
  const factory = vi.fn(() => fake.ctx);
  const options: BgmEngineOptions = {
    factory,
    fetcher,
    waiter: async () => {},
    chooser: () => startAt,
  };
  return { engine: new BgmEngine(options), fake, factory };
}

/** Let the engine's chained promises settle. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

describe("the playlist itself", () => {
  it("lists real files under /audio and no duplicates", () => {
    expect(musicPlaylist.length).toBeGreaterThan(1);
    const paths = musicPlaylist.map((t) => t.src);
    expect(new Set(paths).size).toBe(paths.length);
    for (const track of musicPlaylist) {
      // Self-hosted only: the CSP is default-src 'self' with no hosts.
      expect(track.src.startsWith("/audio/")).toBe(true);
      expect(track.src.endsWith(".m4a")).toBe(true);
      expect(track.title.length).toBeGreaterThan(0);
    }
  });

  it("carries every field CC BY 4.0 requires us to show", () => {
    // Dropping any of these from the credit breaches the licence, so they are
    // asserted rather than trusted.
    expect(musicCredit.author).toBe("elevchyt");
    expect(musicCredit.packTitle.length).toBeGreaterThan(0);
    expect(musicCredit.shortTitle.length).toBeGreaterThan(0);
    expect(musicCredit.sourceUrl).toMatch(/^https:\/\/elevchyt\.itch\.io\//);
    expect(musicCredit.licenseName).toBe("CC BY 4.0");
    expect(musicCredit.licenseUrl).toBe(
      "https://creativecommons.org/licenses/by/4.0/",
    );
    // The licence also requires that changes be stated.
    expect(musicCredit.changes).toBe("re-encoded");
  });
});

describe("BgmEngine gating", () => {
  it("creates no AudioContext until start() is called", () => {
    const fetcher = vi.fn(async () => okResponse());
    const { engine, factory } = makeEngine(fetcher);

    expect(engine.isAlive()).toBe(false);
    expect(engine.isPlaying()).toBe(false);
    expect(engine.currentIndex()).toBe(-1);
    expect(factory).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("tears the context down completely on stop()", async () => {
    const { engine, fake } = makeEngine(async () => okResponse());

    await engine.start();
    expect(engine.isAlive()).toBe(true);

    await engine.stop();
    expect(fake.raw.close).toHaveBeenCalled();
    expect(engine.isAlive()).toBe(false);
    expect(engine.isPlaying()).toBe(false);
    expect(fake.sources[0].stoppedAt.length).toBeGreaterThan(0);
    // Stopping deliberately must not be mistaken for a track running out.
    expect(fake.sources[0].ended).toBeNull();
  });

  it("resumes a suspended context on start (autoplay policy)", async () => {
    const { engine, fake } = makeEngine(async () => okResponse(), {
      state: "suspended",
    });
    await engine.start();
    expect(fake.raw.resume).toHaveBeenCalled();
  });
});

describe("BgmEngine playback", () => {
  it("starts the rotation at the chosen index and fades in", async () => {
    const seen: string[] = [];
    const { engine, fake } = makeEngine(async (url) => {
      seen.push(url);
      return okResponse();
    }, { startAt: 2 });

    await engine.start();
    expect(engine.isPlaying()).toBe(true);
    expect(engine.currentIndex()).toBe(2);
    expect(seen[0]).toBe(musicPlaylist[2].src);
    expect(fake.sources[0].started).toEqual([0]);

    // Master fades to the modest resting gain; the track's own gain rides
    // 0 → 1 → 0 so the change between tracks has a soft edge.
    const trackGain = fake.gains[1];
    expect(trackGain.ramps[0].target).toBe(1);
    expect(trackGain.ramps[0].when).toBeCloseTo(0.3);
    expect(trackGain.ramps.at(-1)?.when).toBeCloseTo(120);
    expect(BGM_GAIN).toBeLessThan(1);
  });

  it("advances to the next track when one runs out", async () => {
    const seen: string[] = [];
    const { engine, fake } = makeEngine(async (url) => {
      seen.push(url);
      return okResponse();
    }, { startAt: 0 });

    await engine.start();
    expect(engine.currentIndex()).toBe(0);

    fake.sources[0].finish();
    await settle();

    expect(engine.currentIndex()).toBe(1);
    expect(fake.sources).toHaveLength(2);
    expect(fake.sources[1].started).toHaveLength(1);
  });

  it("wraps past the end of the playlist back to the first track", async () => {
    const last = musicPlaylist.length - 1;
    const { engine, fake } = makeEngine(async () => okResponse(), {
      startAt: last,
    });

    await engine.start();
    expect(engine.currentIndex()).toBe(last);

    fake.sources[0].finish();
    await settle();
    expect(engine.currentIndex()).toBe(0);
  });

  it("prefetches the next track's bytes while the current one plays", async () => {
    const seen: string[] = [];
    const { engine } = makeEngine(async (url) => {
      seen.push(url);
      return okResponse();
    }, { startAt: 0 });

    await engine.start();
    await settle();
    // Exactly one track ahead — not the whole playlist, which would mean
    // holding fifteen minutes of audio in memory.
    expect(seen).toEqual([musicPlaylist[0].src, musicPlaylist[1].src]);
  });

  it("is idempotent — a second start() does not stack a second track", async () => {
    const { engine, fake, factory } = makeEngine(async () => okResponse());
    await engine.start();
    await engine.start();

    expect(factory).toHaveBeenCalledTimes(1);
    expect(fake.sources).toHaveLength(1);
  });

  it("does not start two tracks when start() is clicked twice mid-decode", async () => {
    const { engine, fake } = makeEngine(async () => okResponse());
    // Both calls are in flight before either finishes decoding — the exact
    // shape of an impatient double click on the toggle.
    await Promise.all([engine.start(), engine.start()]);
    await settle();
    expect(fake.sources).toHaveLength(1);
  });
});

describe("BgmEngine when files are missing", () => {
  it("skips a 404 track and plays the next one that resolves", async () => {
    const { engine } = makeEngine(
      async (url) => (url === musicPlaylist[0].src ? missingResponse() : okResponse()),
      { startAt: 0 },
    );

    await engine.start();
    expect(engine.isPlaying()).toBe(true);
    expect(engine.currentIndex()).toBe(1);
  });

  it("falls silent without throwing when every track is missing", async () => {
    const fetcher = vi.fn(async () => missingResponse());
    const { engine } = makeEngine(fetcher, { startAt: 0 });

    await expect(engine.start()).resolves.toBeUndefined();
    expect(engine.isPlaying()).toBe(false);
    // Each track tried exactly once — no spin through the rotation forever.
    expect(fetcher).toHaveBeenCalledTimes(musicPlaylist.length);
    // The context still exists, so switching off still tears it down cleanly.
    expect(engine.isAlive()).toBe(true);
    await expect(engine.stop()).resolves.toBeUndefined();
  });

  it("swallows a network rejection and an undecodable file alike", async () => {
    const offline = makeEngine(async () => {
      throw new Error("offline");
    });
    await expect(offline.engine.start()).resolves.toBeUndefined();
    expect(offline.engine.isPlaying()).toBe(false);

    const garbage = makeEngine(async () => okResponse());
    (
      garbage.fake.raw.decodeAudioData as unknown as ReturnType<typeof vi.fn>
    ).mockRejectedValue(new Error("not audio"));
    await expect(garbage.engine.start()).resolves.toBeUndefined();
    expect(garbage.engine.isPlaying()).toBe(false);
  });
});

describe("BgmEngine visibility and suspension", () => {
  it("ducks to silence and suspends a hidden tab, then restores", async () => {
    const { engine, fake } = makeEngine(async () => okResponse());
    await engine.start();

    await engine.setHidden(true);
    const master = fake.gains[0];
    expect(master.ramps.at(-1)?.target).toBeLessThan(BGM_GAIN);
    expect(fake.raw.suspend).toHaveBeenCalled();

    await engine.setHidden(false);
    expect(fake.raw.resume).toHaveBeenCalled();
    expect(master.ramps.at(-1)?.target).toBe(BGM_GAIN);
    // Same source throughout — returning to the tab never restarts the track.
    expect(fake.sources).toHaveLength(1);
    expect(engine.isPlaying()).toBe(true);
  });

  it("resume() wakes an iOS-suspended context only while music is wanted", async () => {
    const { engine, fake } = makeEngine(async () => okResponse());
    await engine.start();

    fake.raw.state = "suspended";
    await engine.resume();
    expect(fake.raw.resume).toHaveBeenCalledTimes(1);

    await engine.stop();
    await engine.resume(); // no context, nothing to wake
    expect(fake.raw.resume).toHaveBeenCalledTimes(1);
  });

  it("does nothing on visibility changes while music was never started", async () => {
    const { engine, factory } = makeEngine(async () => okResponse());
    await engine.setHidden(true);
    await engine.setHidden(false);
    expect(factory).not.toHaveBeenCalled();
    expect(engine.isAlive()).toBe(false);
  });
});
