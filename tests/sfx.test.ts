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
  const kinds: SfxKind[] = ["move", "confirm", "back", "locked", "enter"];

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

  it("keeps the menu family on one waveform, separated by contour", () => {
    // The five menu tones are told apart by shape, not timbre — that is what
    // makes the menus navigable by ear. The teaser cues are deliberately not
    // in this family and are excluded.
    for (const kind of kinds) {
      for (const step of SFX_SPECS[kind]) {
        expect(step.type).toBe("square");
      }
    }
  });

  it("gives `locked` a falling contour — the inverse of confirm", () => {
    const locked = SFX_SPECS.locked;
    expect(locked).toHaveLength(2);
    expect(locked[1].freq).toBeLessThan(locked[0].freq);
    // A refusal must not be the loudest thing on the page.
    for (const step of locked) {
      expect(step.peak).toBeLessThan(SFX_SPECS.confirm[0].peak + 0.001);
    }
  });

  it("gives `enter` more weight than `confirm` without breaking the step cap", () => {
    const enter = SFX_SPECS.enter;
    expect(enter).toHaveLength(3);
    // Rises all the way through, and lands above where confirm stops.
    expect(enter[0].freq).toBeLessThan(enter[1].freq);
    expect(enter[1].freq).toBeLessThan(enter[2].freq);
    expect(enter[2].freq).toBeGreaterThan(SFX_SPECS.confirm[1].freq);

    const total = (steps: readonly { delayMs: number; durationMs: number }[]) =>
      steps[steps.length - 1].delayMs + steps[steps.length - 1].durationMs;
    expect(total(enter)).toBeGreaterThan(total(SFX_SPECS.confirm));
  });

  it("leaves the steps contiguous so a multi-step tone reads as one gesture", () => {
    for (const kind of kinds) {
      const steps = SFX_SPECS[kind];
      for (let i = 1; i < steps.length; i += 1) {
        expect(steps[i].delayMs).toBe(
          steps[i - 1].delayMs + steps[i - 1].durationMs,
        );
      }
    }
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

  it("schedules the new locked and enter tones once armed", async () => {
    const fake = makeFakeContext();
    const engine = new SfxEngine(() => fake.ctx);
    await engine.arm();

    engine.play("locked");
    expect(fake.started).toHaveLength(SFX_SPECS.locked.length);

    engine.play("enter");
    expect(fake.started).toHaveLength(
      SFX_SPECS.locked.length + SFX_SPECS.enter.length,
    );
  });

  it("stays silent for the new kinds while sound is off", () => {
    const factory = vi.fn(() => makeFakeContext().ctx);
    const engine = new SfxEngine(factory);
    engine.play("locked");
    engine.play("enter");
    expect(factory).not.toHaveBeenCalled();
  });
});
