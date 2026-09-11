/**
 * Opt-in looping menu theme — the era's other half of the sound design.
 *
 * Same hard policy as the menu tones (see sfx.ts + the SoundProvider): the
 * site is silent by default, forever. No AudioContext exists until the visitor
 * has opted into MUSIC specifically, and switching it off tears the context
 * down. Music and tones are independent opt-ins with independent contexts, so
 * turning one on never creates audio state for the other.
 *
 * Why WebAudio and not an <audio loop> element: an `<audio>` element gaps
 * audibly at the loop point — it re-buffers, and the gap is exactly where a
 * menu theme must not have one. Decoding once into an AudioBuffer and looping
 * an AudioBufferSourceNode is sample-accurate, so the loop is seamless.
 *
 * The track is NOT in the repository yet. It is auditioned separately and
 * dropped into public/audio/ in a follow-up commit. Until then every source
 * 404s, the loader returns null, and the toggle simply produces silence — no
 * throw, no console noise, no broken control. That is the designed state, not
 * a failure path.
 */

/**
 * Sources, tried in order. AAC in an MP4 container is the one format every
 * target browser decodes; Opus is the smaller file where it is supported, and
 * is listed second so it is only reached if the .m4a is absent.
 *
 * Both are served from our own origin — the CSP is `default-src 'self'` with
 * no external hosts, so a CDN-hosted track would simply be blocked.
 */
export const BGM_SOURCES = [
  "/audio/menu-theme.m4a",
  "/audio/menu-theme.opus",
] as const;

/** Resting gain. Modest on purpose: the theme sits UNDER the menu tones. */
export const BGM_GAIN = 0.5;
/** Fade on start/stop, in milliseconds. Mechanical linear ramp, no bounce. */
export const BGM_FADE_MS = 300;
/** Faster ramp for ducking a backgrounded tab. */
export const BGM_DUCK_MS = 150;

/** Floor for the ramps — a true zero is not a legal exponential target and
 * reads as a click on a linear one. */
const SILENT = 0.0001;

type AudioContextFactory = () => AudioContext;
type Fetcher = (url: string) => Promise<Response>;
type Waiter = (ms: number) => Promise<void>;

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

const defaultFetcher: Fetcher = (url) => fetch(url);

const defaultWaiter: Waiter = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export interface BgmEngineOptions {
  readonly factory?: AudioContextFactory;
  readonly fetcher?: Fetcher;
  readonly waiter?: Waiter;
}

/**
 * Owns the music AudioContext and the single looping source node.
 *
 * `start()` and `stop()` carry intent; every async step re-checks it, so a
 * visitor who flips the toggle twice while the track is still decoding ends up
 * silent rather than with an orphaned loop. `start()` must be called from a
 * user gesture — creating a context outside one leaves it suspended under
 * every browser's autoplay policy.
 */
export class BgmEngine {
  private readonly factory: AudioContextFactory;
  private readonly fetcher: Fetcher;
  private readonly waiter: Waiter;

  private context: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private buffer: AudioBuffer | null = null;
  private loading: Promise<AudioBuffer | null> | null = null;
  private wanted = false;
  private hidden = false;

  constructor(options: BgmEngineOptions = {}) {
    this.factory = options.factory ?? defaultFactory;
    this.fetcher = options.fetcher ?? defaultFetcher;
    this.waiter = options.waiter ?? defaultWaiter;
  }

  /** True once a context exists (i.e. the visitor has enabled music). */
  isAlive(): boolean {
    return this.context !== null;
  }

  /** True while a looping source is actually scheduled. */
  isPlaying(): boolean {
    return this.source !== null;
  }

  /**
   * Arm the context, load the track and start the loop with a fade-in.
   * MUST be called from within a user gesture. Idempotent: calling it while
   * the loop already runs does nothing.
   */
  async start(): Promise<void> {
    this.wanted = true;

    if (!this.context) {
      this.context = this.factory();
    }
    const ctx = this.context;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const buffer = await this.load(ctx);
    // The visitor may have switched music off, or a second start() may have
    // won the race, while the track was decoding.
    if (!buffer || !this.wanted || this.context !== ctx || this.source) return;

    const gain = ctx.createGain();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    // The whole point: sample-accurate looping, no re-buffer at the seam.
    source.loop = true;
    source.connect(gain).connect(ctx.destination);

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(SILENT, now);
    gain.gain.linearRampToValueAtTime(
      this.hidden ? SILENT : BGM_GAIN,
      now + BGM_FADE_MS / 1000,
    );

    source.start(now);
    this.gain = gain;
    this.source = source;
  }

  /** Fade out, stop the loop and tear the context down completely. */
  async stop(): Promise<void> {
    this.wanted = false;

    const ctx = this.context;
    const source = this.source;
    const gain = this.gain;
    this.context = null;
    this.source = null;
    this.gain = null;
    // A closed context cannot decode into a new one, so the cached buffer goes
    // with it; the fetch result is kept only for the life of one context.
    this.buffer = null;
    this.loading = null;

    if (!ctx) return;

    if (gain) {
      ramp(gain, ctx.currentTime, SILENT, BGM_FADE_MS);
      await this.waiter(BGM_FADE_MS);
    }

    try {
      source?.stop();
    } catch {
      // Already stopped; nothing actionable.
    }
    try {
      await ctx.close();
    } catch {
      // Context may already be closing; nothing actionable.
    }
  }

  /**
   * Tab visibility. A backgrounded tab ducks to silence and suspends, so a
   * forgotten tab is neither audible nor burning battery; returning resumes
   * and fades back to the resting gain.
   */
  async setHidden(hidden: boolean): Promise<void> {
    this.hidden = hidden;
    const ctx = this.context;
    if (!ctx) return;

    if (hidden) {
      if (this.gain) {
        ramp(this.gain, ctx.currentTime, SILENT, BGM_DUCK_MS);
        await this.waiter(BGM_DUCK_MS);
      }
      // Re-check: the visitor may have come straight back.
      if (this.hidden && this.context === ctx && ctx.state === "running") {
        await ctx.suspend();
      }
      return;
    }

    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    if (this.gain) {
      ramp(this.gain, ctx.currentTime, BGM_GAIN, BGM_DUCK_MS);
    }
  }

  /**
   * iOS Safari drops an AudioContext back to "suspended" on its own — after a
   * call, a route away, or simply sitting in the background. Wire this to a
   * user gesture so the theme comes back instead of silently dying.
   */
  async resume(): Promise<void> {
    const ctx = this.context;
    if (!ctx || !this.wanted || this.hidden) return;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
  }

  /**
   * Fetch and decode the track, trying each source in turn. Returns null when
   * none of them resolve — the expected state until the audition lands the
   * file — and caches the result so a missing track is not re-fetched on every
   * start within the same context.
   */
  private load(ctx: AudioContext): Promise<AudioBuffer | null> {
    if (this.buffer) return Promise.resolve(this.buffer);
    if (!this.loading) {
      this.loading = this.fetchBuffer(ctx);
    }
    return this.loading;
  }

  private async fetchBuffer(ctx: AudioContext): Promise<AudioBuffer | null> {
    for (const url of BGM_SOURCES) {
      try {
        const response = await this.fetcher(url);
        if (!response.ok) continue;
        const bytes = await response.arrayBuffer();
        const decoded = await ctx.decodeAudioData(bytes);
        if (this.context === ctx) {
          this.buffer = decoded;
        }
        return decoded;
      } catch {
        // 404, network failure or an undecodable file: try the next source.
        // Nothing is surfaced — a missing track is silence, not an error.
      }
    }
    return null;
  }
}

/** Linear gain ramp from wherever the value is now. Mechanical, no bounce. */
function ramp(gain: GainNode, now: number, target: number, ms: number): void {
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(target, now + ms / 1000);
}

/** App-wide singleton used by the SoundProvider. */
export const bgm = new BgmEngine();
