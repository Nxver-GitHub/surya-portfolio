import { describe, expect, it, vi } from "vitest";
import {
  SFX_PEAK_CEILING,
  SFX_SPECS,
  SfxEngine,
  type SfxKind,
} from "@/lib/sfx";

/** Minimal fake Web Audio graph — records scheduled oscillators. */
function makeFakeContext(state: AudioContextState = "running") {
  const started: number[] = [];
  const nodes = { connect: () => nodes } as unknown as AudioNode;
  const ctx = {
    state,
    currentTime: 0,
    destination: nodes,
    createOscillator: () => ({
      type: "sine" as OscillatorType,
      frequency: { setValueAtTime: vi.fn() },
      connect: () => nodes,
      start: (t: number) => started.push(t),
      stop: vi.fn(),
    }),
    createGain: () => ({
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: () => nodes,
    }),
    resume: vi.fn(async () => {
      (ctx as { state: AudioContextState }).state = "running";
    }),
    close: vi.fn(async () => {
      (ctx as { state: AudioContextState }).state = "closed";
    }),
  };
  return { ctx: ctx as unknown as AudioContext, started };
}

describe("SFX_SPECS tone table", () => {
  const kinds: SfxKind[] = ["move", "confirm", "back"];

  it("keeps every step tiny (30–80ms) and quiet (≤0.15)", () => {
    for (const kind of kinds) {
      for (const step of SFX_SPECS[kind]) {
        expect(step.durationMs).toBeGreaterThanOrEqual(30);
        expect(step.durationMs).toBeLessThanOrEqual(80);
        expect(step.peak).toBeLessThanOrEqual(SFX_PEAK_CEILING);
      }
    }
  });

  it("matches the era menu-feedback spec", () => {
    expect(SFX_SPECS.move).toEqual([
      { freq: 660, type: "square", delayMs: 0, durationMs: 35, peak: 0.12 },
    ]);
    // confirm is a two-step up-blip totalling ~70ms
    expect(SFX_SPECS.confirm).toHaveLength(2);
    expect(SFX_SPECS.confirm[0].freq).toBe(520);
    expect(SFX_SPECS.confirm[1].freq).toBe(780);
    const confirmTotal =
      SFX_SPECS.confirm[1].delayMs + SFX_SPECS.confirm[1].durationMs;
    expect(confirmTotal).toBe(70);
    expect(SFX_SPECS.back[0].freq).toBe(330);
  });
});

describe("SfxEngine lifecycle", () => {
  it("creates no context and stays silent until armed", () => {
    const factory = vi.fn(() => makeFakeContext().ctx);
    const engine = new SfxEngine(factory);

    expect(engine.isAlive()).toBe(false);
    engine.play("confirm");
    expect(factory).not.toHaveBeenCalled();
    expect(engine.isAlive()).toBe(false);
  });

  it("arms once, plays scheduled tones, and disarms fully", async () => {
    const fake = makeFakeContext();
    const factory = vi.fn(() => fake.ctx);
    const engine = new SfxEngine(factory);

    await engine.arm();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(engine.isAlive()).toBe(true);

    engine.play("confirm");
    expect(fake.started).toHaveLength(2); // two oscillators for confirm

    await engine.arm(); // re-arm does not create a second context
    expect(factory).toHaveBeenCalledTimes(1);

    await engine.disarm();
    expect(fake.ctx.close).toHaveBeenCalled();
    expect(engine.isAlive()).toBe(false);
  });

  it("resumes a suspended context on arm", async () => {
    const fake = makeFakeContext("suspended");
    const engine = new SfxEngine(() => fake.ctx);
    await engine.arm();
    expect(fake.ctx.resume).toHaveBeenCalled();
  });
});
