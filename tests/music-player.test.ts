import { describe, expect, it, vi } from "vitest";
import { BGM_GAIN, BGM_IDLE_STATE, BgmEngine, type BgmEngineOptions } from "@/lib/bgm";
import {
  createVolumeStore,
  DEFAULT_VOLUME_STEP,
  gainForVolumeStep,
  labelForVolumeStep,
  migrateVolumeStep,
  MUSIC_VOLUME_STORAGE_KEY,
  VOLUME_STEPS,
} from "@/lib/music-volume";
import type { PreferenceEnvironment } from "@/lib/sound-preferences";
import { musicPlaylist } from "../content/music";

/**
 * The Sound Select strip's two load-bearing pieces: the deck transport in
 * lib/bgm.ts (pause / next / prev / selectTrack / setVolumeStep plus the
 * external store the readout subscribes to) and the persisted stepped level in
 * lib/music-volume.ts.
 *
 * Both run in vitest's node environment against a fake Web Audio graph and an
 * injected storage environment — no DOM, no real audio, no timers.
 */

// ── Fakes ───────────────────────────────────────────────────────────────────

interface SourceRecord {
  started: number[];
  stoppedAt: number[];
  ended: (() => void) | null;
  /** Pretend the track ran out: what the browser does at source.stop(). */
  finish(): void;
}

interface GainRecord {
  ramps: { target: number; when: number }[];
}

function makeFakeContext() {
  const sinks = { connect: () => sinks } as unknown as AudioNode;
  const sources: SourceRecord[] = [];
  const gains: GainRecord[] = [];

  const ctx = {
    state: "running" as AudioContextState,
    currentTime: 0,
    destination: sinks,
    createBufferSource: () => {
      const record: SourceRecord = {
        started: [],
        stoppedAt: [],
        ended: null,
        finish() {
          record.ended?.();
        },
      };
      sources.push(record);
      return {
        buffer: null as AudioBuffer | null,
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
      const record: GainRecord = { ramps: [] };
      gains.push(record);
      return {
        gain: {
          value: 0,
          setValueAtTime: vi.fn(),
          cancelScheduledValues: vi.fn(),
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

const okResponse = () =>
  ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }) as Response;

function makeEngine(startAt = 0) {
  const fake = makeFakeContext();
  const options: BgmEngineOptions = {
    factory: () => fake.ctx,
    fetcher: async () => okResponse(),
    waiter: async () => {},
    chooser: () => startAt,
  };
  return { engine: new BgmEngine(options), fake };
}

/** In-memory storage with the same shape as the browser environment. */
function makeStorage(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  const external = new Set<() => void>();
  const environment: PreferenceEnvironment = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    addChangeListener: (callback) => {
      external.add(callback);
      return () => external.delete(callback);
    },
  };
  return { environment, values, external };
}

// ── Volume step ─────────────────────────────────────────────────────────────

describe("migrateVolumeStep", () => {
  it("defaults a missing value to mid", () => {
    expect(migrateVolumeStep(null)).toBe("mid");
    expect(DEFAULT_VOLUME_STEP).toBe("mid");
  });

  it("passes the three canonical steps through unchanged", () => {
    for (const step of VOLUME_STEPS) {
      expect(migrateVolumeStep(step)).toBe(step);
    }
  });

  it("understands spelled-out and mixed-case levels", () => {
    expect(migrateVolumeStep("low")).toBe("lo");
    expect(migrateVolumeStep("HIGH")).toBe("hi");
    expect(migrateVolumeStep(" Medium ")).toBe("mid");
    expect(migrateVolumeStep("Med")).toBe("mid");
  });

  it("degrades junk from another tab to the default, never to silence", () => {
    expect(migrateVolumeStep("")).toBe("mid");
    expect(migrateVolumeStep("0.5")).toBe("mid");
    expect(migrateVolumeStep("bogus")).toBe("mid");
  });
});

describe("gainForVolumeStep", () => {
  it("is the source of the engine's default resting gain", () => {
    // BGM_GAIN is derived from this table, so the default notch and the
    // engine's resting level cannot drift apart.
    expect(gainForVolumeStep("mid")).toBe(BGM_GAIN);
  });

  it("rises monotonically and stays well under the menu tones", () => {
    expect(gainForVolumeStep("lo")).toBeLessThan(gainForVolumeStep("mid"));
    expect(gainForVolumeStep("mid")).toBeLessThan(gainForVolumeStep("hi"));
    expect(gainForVolumeStep("lo")).toBeGreaterThan(0);
    // Menu music behind a portfolio: even the top notch is background.
    expect(gainForVolumeStep("hi")).toBeLessThanOrEqual(0.5);
  });

  it("spaces the notches by ear, not by splitting the range evenly", () => {
    // Loudness is not linear in amplitude, so equal thirds would read as three
    // shades of "too loud". Each notch is roughly half or double the one
    // beside it — a ratio between steps, never a constant difference.
    const [lo, mid, hi] = VOLUME_STEPS.map(gainForVolumeStep);
    expect(mid / lo).toBeGreaterThan(1.8);
    expect(hi / mid).toBeGreaterThan(1.8);
  });

  it("labels every step for the popup", () => {
    expect(VOLUME_STEPS.map(labelForVolumeStep)).toEqual(["Lo", "Mid", "Hi"]);
  });
});

describe("the persisted level store", () => {
  it("reads the default when nothing has been written", () => {
    const { environment } = makeStorage();
    expect(createVolumeStore(environment).read()).toBe("mid");
  });

  it("round-trips a written step under its own key", () => {
    const { environment, values } = makeStorage();
    const store = createVolumeStore(environment);

    store.write("hi");
    expect(values.get(MUSIC_VOLUME_STORAGE_KEY)).toBe("hi");
    expect(store.read()).toBe("hi");
    // Its own key: flipping the level must not disturb the on/off opt-in.
    expect(values.has("surya-music-enabled")).toBe(false);
  });

  it("notifies same-tab subscribers on write and stops after unsubscribe", () => {
    const { environment } = makeStorage();
    const store = createVolumeStore(environment);
    const seen = vi.fn();

    const unsubscribe = store.subscribe(seen);
    store.write("lo");
    expect(seen).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.write("hi");
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("republishes an external (other-tab) change", () => {
    const { environment, external, values } = makeStorage();
    const store = createVolumeStore(environment);
    const seen = vi.fn();
    store.subscribe(seen);

    values.set(MUSIC_VOLUME_STORAGE_KEY, "lo");
    for (const notify of external) notify();

    expect(seen).toHaveBeenCalledTimes(1);
    expect(store.read()).toBe("lo");
  });
});

// ── Transport ───────────────────────────────────────────────────────────────

describe("the deck's external store", () => {
  it("starts idle, so the server and a silent page agree", () => {
    const { engine } = makeEngine();
    expect(engine.getState()).toEqual(BGM_IDLE_STATE);
    expect(engine.getState()).toBe(engine.getState());
  });

  it("publishes the sounding track and notifies subscribers", async () => {
    const { engine } = makeEngine(1);
    const seen = vi.fn();
    engine.subscribe(seen);

    await engine.start();

    expect(engine.getState()).toEqual({ playing: true, index: 1 });
    expect(seen).toHaveBeenCalled();
  });

  it("follows the rotation when a track runs out, without being asked", async () => {
    const { engine, fake } = makeEngine(0);
    const seen = vi.fn();
    engine.subscribe(seen);
    await engine.start();
    const before = seen.mock.calls.length;

    fake.sources[0].finish();
    await new Promise((resolve) => setImmediate(resolve));

    expect(engine.getState()).toEqual({ playing: true, index: 1 });
    expect(seen.mock.calls.length).toBeGreaterThan(before);
  });

  it("stops notifying an unsubscribed listener", async () => {
    const { engine } = makeEngine();
    const seen = vi.fn();
    engine.subscribe(seen)();

    await engine.start();
    expect(seen).not.toHaveBeenCalled();
  });
});

describe("deck transport", () => {
  it("pause tears the context down, and play resumes the cued track", async () => {
    const { engine, fake } = makeEngine(2);

    await engine.start();
    expect(engine.getState()).toEqual({ playing: true, index: 2 });

    await engine.pause();
    // Pausing IS opting out: no context may survive it.
    expect(fake.raw.close).toHaveBeenCalled();
    expect(engine.isAlive()).toBe(false);
    // The cue survives, so the readout comes back on the same track.
    expect(engine.getState()).toEqual({ playing: false, index: 2 });

    await engine.start();
    expect(engine.getState()).toEqual({ playing: true, index: 2 });
  });

  it("next and prev step the rotation and wrap in both directions", async () => {
    const last = musicPlaylist.length - 1;
    const { engine } = makeEngine(0);
    await engine.start();

    await engine.next();
    expect(engine.getState()).toEqual({ playing: true, index: 1 });

    await engine.prev();
    expect(engine.getState()).toEqual({ playing: true, index: 0 });

    // Prev from the first entry wraps to the last, not to a dead control.
    await engine.prev();
    expect(engine.getState()).toEqual({ playing: true, index: last });

    await engine.next();
    expect(engine.getState()).toEqual({ playing: true, index: 0 });
  });

  it("keeps exactly one source sounding across a skip", async () => {
    const { engine, fake } = makeEngine(0);
    await engine.start();

    await engine.next();

    // Two sources have existed, but the outgoing one was stopped before the
    // incoming one started — one decoded buffer resident, never two.
    expect(fake.sources).toHaveLength(2);
    expect(fake.sources[0].stoppedAt.length).toBeGreaterThan(0);
    expect(fake.sources[0].ended).toBeNull();
    expect(fake.sources[1].started).toHaveLength(1);
    expect(engine.isPlaying()).toBe(true);
  });

  it("fades the outgoing track out rather than cutting it dead", async () => {
    const { engine, fake } = makeEngine(0);
    await engine.start();
    const outgoing = fake.gains[1];

    await engine.next();

    // Last thing scheduled on the outgoing track's gain is a ramp to silence.
    expect(outgoing.ramps.at(-1)?.target).toBeLessThan(0.01);
  });

  it("selectTrack jumps straight to a picked row", async () => {
    const last = musicPlaylist.length - 1;
    const { engine } = makeEngine(0);
    await engine.start();

    await engine.selectTrack(last);
    expect(engine.getState()).toEqual({ playing: true, index: last });
  });

  it("ignores a non-integer selection instead of cueing NaN", async () => {
    const { engine } = makeEngine(0);
    await engine.start();

    await engine.selectTrack(Number.NaN);
    expect(engine.getState()).toEqual({ playing: true, index: 0 });
  });

  it("only cues while the deck is off — no context is created", async () => {
    const { engine } = makeEngine(0);

    await engine.selectTrack(1);

    // A transport press on a silent page must not conjure an AudioContext on
    // its own; arming stays the caller's explicit start().
    expect(engine.isAlive()).toBe(false);
    expect(engine.getState()).toEqual({ playing: false, index: 1 });

    await engine.start();
    expect(engine.getState()).toEqual({ playing: true, index: 1 });
  });

  it("lands on the last press when skips are hammered", async () => {
    const { engine } = makeEngine(0);
    await engine.start();

    await Promise.all([engine.next(), engine.next(), engine.selectTrack(0)]);

    expect(engine.getState()).toEqual({ playing: true, index: 0 });
    expect(engine.isPlaying()).toBe(true);
  });
});

describe("deck level", () => {
  it("rides the master gain to the chosen notch", async () => {
    const { engine, fake } = makeEngine(0);
    await engine.start();
    const master = fake.gains[0];

    engine.setVolumeStep("hi");
    expect(master.ramps.at(-1)?.target).toBe(gainForVolumeStep("hi"));

    engine.setVolumeStep("lo");
    expect(master.ramps.at(-1)?.target).toBe(gainForVolumeStep("lo"));
  });

  it("remembers a level set while the deck is off and arms at it", async () => {
    const { engine, fake } = makeEngine(0);

    engine.setVolumeStep("lo");
    expect(engine.isAlive()).toBe(false);

    await engine.start();
    const master = fake.gains[0];
    expect(master.ramps.at(-1)?.target ?? gainForVolumeStep("lo")).toBe(
      gainForVolumeStep("lo"),
    );
    // Restoring from a backgrounded tab returns to the chosen notch, not 0.5.
    await engine.setHidden(true);
    await engine.setHidden(false);
    expect(master.ramps.at(-1)?.target).toBe(gainForVolumeStep("lo"));
  });

  it("does not un-duck a hidden tab", async () => {
    const { engine, fake } = makeEngine(0);
    await engine.start();
    await engine.setHidden(true);
    const master = fake.gains[0];
    const ducked = master.ramps.length;

    engine.setVolumeStep("hi");

    expect(master.ramps).toHaveLength(ducked);
  });
});
