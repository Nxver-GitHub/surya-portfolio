/**
 * Opt-in synthesized menu tones — the era's tiny UI feedback blips.
 *
 * Hard policy (see the SoundProvider + the PR): the site is silent by default,
 * forever. Nothing here ever autoplays; no AudioContext exists until the user
 * has opted in via the toggle (a persisted opt-in re-arms on the next
 * session's first gesture, inside that gesture). Tones are synthesized only
 * (OscillatorNode + GainNode) — no audio files, no samples, no melodies. Every
 * tone is tiny (30–80ms) and quiet (peak gain ≤ 0.15).
 *
 * The tone table is a pure data structure so it can be unit-tested in node
 * without a DOM, and the engine takes an injectable context factory so its
 * arm/disarm/play lifecycle can be tested with a fake AudioContext.
 */

export type SfxKind =
  | "move"
  | "confirm"
  | "back"
  | "teaserDrop"
  | "teaserSlam";

/** One oscillator step within a tone. */
export interface ToneStep {
  readonly freq: number;
  readonly type: OscillatorType;
  /** Offset from the start of the tone, in milliseconds. */
  readonly delayMs: number;
  /** How long this step sounds, in milliseconds (30–80ms window). */
  readonly durationMs: number;
  /** Peak linear gain for this step — capped at 0.15 by policy. */
  readonly peak: number;
}

/**
 * The tone table: three era menu-feedback blips, plus two cinematic cues for
 * the Proximize teaser takeover.
 *
 * The teaser cues are LONGER GESTURES BUILT FROM SHORT STEPS. The per-step
 * 30–80ms window is policy (and asserted over this whole table in
 * tests/sfx.test.ts), so a ~450ms descending collapse is expressed as six
 * chained steps rather than one long note — the same trick `confirm` already
 * uses for its two-step rise. They also drop the menu blips' square wave for
 * sawtooth/triangle/sine: a square sub-bass buzzes, and these need to read as
 * weight, not as UI.
 *
 * Both are still bound by the mute gate — no AudioContext exists unless the
 * visitor has opted into sound, so the takeover is silent for most people.
 */
export const SFX_SPECS: Record<SfxKind, readonly ToneStep[]> = {
  // list / tab selection change — short square blip ~660Hz, ~35ms
  move: [{ freq: 660, type: "square", delayMs: 0, durationMs: 35, peak: 0.12 }],
  // navigating into a pavilion / card — two-step blip up ~520→780Hz, ~70ms
  confirm: [
    { freq: 520, type: "square", delayMs: 0, durationMs: 34, peak: 0.12 },
    { freq: 780, type: "square", delayMs: 34, durationMs: 36, peak: 0.12 },
  ],
  // lozenge back button — single lower blip ~330Hz, ~50ms
  back: [{ freq: 330, type: "square", delayMs: 0, durationMs: 50, peak: 0.11 }],

  // Teaser beat 1 — the terminal's signal collapsing: a six-step fall from
  // 392Hz to a 73Hz sub, thinning as it drops (~445ms, inside the 600ms beat).
  teaserDrop: [
    { freq: 392, type: "sawtooth", delayMs: 0, durationMs: 70, peak: 0.1 },
    { freq: 294, type: "sawtooth", delayMs: 70, durationMs: 70, peak: 0.09 },
    { freq: 220, type: "sawtooth", delayMs: 140, durationMs: 70, peak: 0.08 },
    { freq: 165, type: "triangle", delayMs: 210, durationMs: 75, peak: 0.07 },
    { freq: 110, type: "triangle", delayMs: 285, durationMs: 80, peak: 0.06 },
    { freq: 73, type: "sine", delayMs: 365, durationMs: 80, peak: 0.05 },
  ],
  // Teaser beat 8 — the lockup landing: three overlapping low hits that decay
  // into a sub, so the slam has body rather than a click (~170ms).
  teaserSlam: [
    { freq: 147, type: "triangle", delayMs: 0, durationMs: 60, peak: 0.14 },
    { freq: 73, type: "sine", delayMs: 40, durationMs: 80, peak: 0.13 },
    { freq: 49, type: "sine", delayMs: 90, durationMs: 80, peak: 0.1 },
  ],
};

/** Peak gain ceiling enforced by policy. */
export const SFX_PEAK_CEILING = 0.15;

type AudioContextFactory = () => AudioContext;

function defaultFactory(): AudioContext {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) {
    throw new Error("Web Audio API is not available in this browser");
  }
  return new Ctor();
}

/**
 * Owns the single AudioContext. The context only exists between `arm()` and
 * `disarm()` — while sound is off, `context` is null and no AudioContext has
 * been created. `play()` is a hard no-op unless the engine is armed and the
 * context is actually running, so no interaction can ever create audio state.
 */
export class SfxEngine {
  private context: AudioContext | null = null;
  private readonly factory: AudioContextFactory;

  constructor(factory: AudioContextFactory = defaultFactory) {
    this.factory = factory;
  }

  /** True once a context exists (i.e. the user has enabled sound). */
  isAlive(): boolean {
    return this.context !== null;
  }

  /**
   * Create (or resume) the AudioContext. MUST be called from within a user
   * gesture — callers are the sound toggle's click handler and the
   * SoundProvider's first-gesture re-arm listener (persisted opt-in only).
   */
  async arm(): Promise<void> {
    if (!this.context) {
      this.context = this.factory();
    }
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  /** Tear the context down completely so no AudioContext exists while off. */
  async disarm(): Promise<void> {
    const ctx = this.context;
    this.context = null;
    if (ctx) {
      try {
        await ctx.close();
      } catch {
        // context may already be closing; nothing actionable to do
      }
    }
  }

  /** Play a tone. No-op unless armed and running. */
  play(kind: SfxKind): void {
    const ctx = this.context;
    if (!ctx || ctx.state !== "running") return;

    const now = ctx.currentTime;
    for (const step of SFX_SPECS[kind]) {
      const peak = Math.min(step.peak, SFX_PEAK_CEILING);
      const start = now + step.delayMs / 1000;
      const end = start + step.durationMs / 1000;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = step.type;
      osc.frequency.setValueAtTime(step.freq, start);

      // Fast attack, exponential decay — a crisp mechanical blip, no click.
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  }
}

/** App-wide singleton used by the SoundProvider. */
export const sfx = new SfxEngine();
