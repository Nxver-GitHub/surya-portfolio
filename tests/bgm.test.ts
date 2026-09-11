import { describe, expect, it, vi } from "vitest";
import {
  BGM_GAIN,
  BGM_SOURCES,
  BgmEngine,
  type BgmEngineOptions,
} from "@/lib/bgm";

/** Minimal fake Web Audio graph — records the source nodes it hands out. */
function makeFakeContext(state: AudioContextState = "running") {
  const sinks = { connect: () => sinks } as unknown as AudioNode;
  const sources: {
    buffer: AudioBuffer | null;
    loop: boolean;
    started: number[];
    stopped: number;
  }[] = [];
  const gains: {
    ramps: { target: number; when: number }[];
    cancelled: number;
  }[] = [];

  const ctx = {
    state,
    currentTime: 0,
    destination: sinks,
    createBufferSource: () => {
      const record = {
        buffer: null as AudioBuffer | null,
        loop: false,
        started: [] as number[],
        stopped: 0,
      };
      sources.push(record);
      return {
        get buffer() {
          return record.buffer;
        },
        set buffer(value: AudioBuffer | null) {
          record.buffer = value;
        },
        get loop() {
          return record.loop;
        },
        set loop(value: boolean) {
          record.loop = value;
        },
        connect: () => sinks,
        start: (t: number) => record.started.push(t),
        stop: () => {
          record.stopped += 1;
        },
      };
    },
    createGain: () => {
      const record = {
        ramps: [] as { target: number; when: number }[],
        cancelled: 0,
      };
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
    decodeAudioData: vi.fn(async () => ({ duration: 60 }) as AudioBuffer),
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
  return {
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(8),
  } as unknown as Response;
}

function missingResponse(): Response {
  return {
    ok: false,
    status: 404,
    arrayBuffer: async () => new ArrayBuffer(0),
  } as unknown as Response;
}

/** Build an engine whose fades resolve immediately, so tests stay real-time. */
function makeEngine(
  fetcher: (url: string) => Promise<Response>,
  state: AudioContextState = "running",
) {
  const fake = makeFakeContext(state);
  const factory = vi.fn(() => fake.ctx);
  const options: BgmEngineOptions = {
    factory,
    fetcher,
    waiter: async () => {},
  };
  return { engine: new BgmEngine(options), fake, factory };
}

describe("BgmEngine gating", () => {
  it("creates no AudioContext until start() is called", () => {
    const fetcher = vi.fn(async () => okResponse());
    const { engine, factory } = makeEngine(fetcher);

    expect(engine.isAlive()).toBe(false);
    expect(engine.isPlaying()).toBe(false);
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
    expect(fake.sources[0].stopped).toBe(1);
  });

  it("resumes a suspended context on start (autoplay policy)", async () => {
    const { engine, fake } = makeEngine(async () => okResponse(), "suspended");
    await engine.start();
    expect(fake.raw.resume).toHaveBeenCalled();
  });
});

describe("BgmEngine looping", () => {
  it("loops the decoded buffer gaplessly through a source node", async () => {
    const { engine, fake } = makeEngine(async () => okResponse());
    await engine.start();

    expect(fake.sources).toHaveLength(1);
    // loop=true on an AudioBufferSourceNode is the whole reason this is not an
    // <audio> element: the seam is sample-accurate.
    expect(fake.sources[0].loop).toBe(true);
    expect(fake.sources[0].buffer).not.toBeNull();
    expect(fake.sources[0].started).toEqual([0]);
    expect(engine.isPlaying()).toBe(true);
  });

  it("fades in to the modest resting gain rather than snapping on", async () => {
    const { engine, fake } = makeEngine(async () => okResponse());
    await engine.start();

    const ramps = fake.gains[0].ramps;
    expect(ramps).toHaveLength(1);
    expect(ramps[0].target).toBe(BGM_GAIN);
    expect(ramps[0].when).toBeCloseTo(0.3);
    // Under the menu tones, which peak at 0.15 per step but stack.
    expect(BGM_GAIN).toBeLessThan(1);
  });

  it("is idempotent — a second start() does not stack a second loop", async () => {
    const { engine, fake, factory } = makeEngine(async () => okResponse());
    await engine.start();
    await engine.start();

    expect(factory).toHaveBeenCalledTimes(1);
    expect(fake.sources).toHaveLength(1);
  });

  it("decodes once and reuses the buffer within a context", async () => {
    const fetcher = vi.fn(async () => okResponse());
    const { engine } = makeEngine(fetcher);
    await engine.start();
    await engine.start();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe("BgmEngine when the track is missing", () => {
  it("fails silently on 404 and still arms the toggle", async () => {
    const fetcher = vi.fn(async () => missingResponse());
    const { engine } = makeEngine(fetcher);

    await expect(engine.start()).resolves.toBeUndefined();
    // Every source tried, none usable — silence, no throw, nothing logged.
    expect(fetcher).toHaveBeenCalledTimes(BGM_SOURCES.length);
    expect(engine.isPlaying()).toBe(false);
    // The context still exists, so switching off still tears it down cleanly.
    expect(engine.isAlive()).toBe(true);
    await expect(engine.stop()).resolves.toBeUndefined();
  });

  it("falls through to the next source when the first is absent", async () => {
    const seen: string[] = [];
    const { engine, fake } = makeEngine(async (url) => {
      seen.push(url);
      return url === BGM_SOURCES[1] ? okResponse() : missingResponse();
    });

    await engine.start();
    expect(seen).toEqual([...BGM_SOURCES]);
    expect(fake.sources).toHaveLength(1);
    expect(engine.isPlaying()).toBe(true);
  });

  it("swallows a network rejection and a decode failure alike", async () => {
    const { engine, fake } = makeEngine(async () => {
      throw new Error("offline");
    });
    await expect(engine.start()).resolves.toBeUndefined();
    expect(engine.isPlaying()).toBe(false);

    const decodeFails = makeEngine(async () => okResponse());
    (
      decodeFails.fake.raw.decodeAudioData as unknown as ReturnType<typeof vi.fn>
    ).mockRejectedValue(new Error("not audio"));
    await expect(decodeFails.engine.start()).resolves.toBeUndefined();
    expect(decodeFails.engine.isPlaying()).toBe(false);
    expect(fake.sources).toHaveLength(0);
  });
});

describe("BgmEngine visibility and suspension", () => {
  it("ducks to silence and suspends a hidden tab, then restores", async () => {
    const { engine, fake } = makeEngine(async () => okResponse());
    await engine.start();

    await engine.setHidden(true);
    const ducked = fake.gains[0].ramps.at(-1);
    expect(ducked?.target).toBeLessThan(BGM_GAIN);
    expect(fake.raw.suspend).toHaveBeenCalled();

    await engine.setHidden(false);
    expect(fake.raw.resume).toHaveBeenCalled();
    expect(fake.gains[0].ramps.at(-1)?.target).toBe(BGM_GAIN);
    // Same source throughout — returning to the tab never restarts the loop.
    expect(fake.sources).toHaveLength(1);
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
