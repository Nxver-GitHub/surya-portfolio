/**
 * Opt-in menu playlist — the era's other half of the sound design.
 *
 * Same hard policy as the menu tones (see sfx.ts + the SoundProvider): the
 * site is silent by default, forever. No AudioContext exists until the visitor
 * has opted into MUSIC specifically, and switching it off tears the context
 * down. Music and tones are independent opt-ins with independent contexts, so
 * turning one on never creates audio state for the other.
 *
 * One rotation, site-wide, running continuously across client-side navigation
 * — not a theme per destination. The tracks and their attribution live in
 * content/music.ts.
 *
 * Why WebAudio rather than an <audio> element: everything else here already
 * runs through a graph — the duck when a tab is backgrounded, the fades, and
 * the gating that guarantees no context exists while music is off are all gain
 * scheduling, which an element cannot express. Each track is decoded into an
 * AudioBuffer and played by an AudioBufferSourceNode.
 *
 * Between tracks it is a HARD CUT with a fade either side, not a crossfade:
 * that is the site's motion law (hard cuts, straight-line slides, subtle
 * fades), and it is also what keeps memory honest — a crossfade would mean two
 * decoded tracks resident at once, and a decoded four-minute stereo track is
 * tens of megabytes. Only the outgoing track's *encoded* bytes are prefetched
 * during playback (a couple of megabytes); the decode happens at the seam,
 * after the previous buffer has been released.
 *
 * Missing files are not an error state. Any track that 404s is skipped; if
 * none of them resolve, the toggle produces silence without throwing or
 * logging.
 */

import { musicPlaylist } from "../../content/music";

/** Resting gain. Modest on purpose: the music sits UNDER the menu tones. */
export const BGM_GAIN = 0.5;
/** Fade on start, stop and either side of a track change, in milliseconds.
 * Mechanical linear ramp, no bounce. */
export const BGM_FADE_MS = 300;
/** Faster ramp for ducking a backgrounded tab. */
export const BGM_DUCK_MS = 150;

/** Floor for the ramps — a true zero reads as a click on a linear ramp. */
const SILENT = 0.0001;

type AudioContextFactory = () => AudioContext;
type Fetcher = (url: string) => Promise<Response>;
type Waiter = (ms: number) => Promise<void>;
type Chooser = (length: number) => number;

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

/** Where the rotation starts. Randomised per session so a return visit does
 * not always open on the same bar. */
const defaultChooser: Chooser = (length) => Math.floor(Math.random() * length);

export interface BgmEngineOptions {
  readonly factory?: AudioContextFactory;
  readonly fetcher?: Fetcher;
  readonly waiter?: Waiter;
  readonly chooser?: Chooser;
}

/**
 * Owns the music AudioContext, the master gain and the one source node that is
 * sounding.
 *
 * `start()` and `stop()` carry intent; every async step re-checks it, so a
 * visitor who flips the toggle twice while a track is still decoding ends up
 * silent rather than with an orphaned loop. `start()` must be called from a
 * user gesture — creating a context outside one leaves it suspended under
 * every browser's autoplay policy.
 */
export class BgmEngine {
  private readonly factory: AudioContextFactory;
  private readonly fetcher: Fetcher;
  private readonly waiter: Waiter;
  private readonly chooser: Chooser;

  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private index = -1;
  /** Encoded bytes for the next track, fetched during the current one. */
  private prefetch: { index: number; bytes: Promise<ArrayBuffer | null> } | null =
    null;
  private wanted = false;
  private hidden = false;
  /** True between "a track was asked for" and "it is sounding". Two toggle
   * clicks in the time one track takes to decode must not start two. */
  private starting = false;

  constructor(options: BgmEngineOptions = {}) {
    this.factory = options.factory ?? defaultFactory;
    this.fetcher = options.fetcher ?? defaultFetcher;
    this.waiter = options.waiter ?? defaultWaiter;
    this.chooser = options.chooser ?? defaultChooser;
  }

  /** True once a context exists (i.e. the visitor has enabled music). */
  isAlive(): boolean {
    return this.context !== null;
  }

  /** True while a track is actually sounding. */
  isPlaying(): boolean {
    return this.source !== null;
  }

  /** Index into the playlist of the sounding track, or -1. */
  currentIndex(): number {
    return this.source ? this.index : -1;
  }

  /**
   * Arm the context and start the rotation with a fade-in. MUST be called from
   * within a user gesture. Idempotent: calling it while a track is already
   * sounding does nothing.
   */
  async start(): Promise<void> {
    this.wanted = true;

    if (!this.context) {
      this.context = this.factory();
      const master = this.context.createGain();
      master.gain.setValueAtTime(
        this.hidden ? SILENT : BGM_GAIN,
        this.context.currentTime,
      );
      master.connect(this.context.destination);
      this.master = master;
    }
    const ctx = this.context;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    if (this.source || this.starting || musicPlaylist.length === 0) return;

    if (this.index < 0) {
      this.index = this.chooser(musicPlaylist.length) % musicPlaylist.length;
    }
    this.starting = true;
    try {
      await this.playTrack(ctx, this.index, 0);
    } finally {
      this.starting = false;
    }
  }

  /** Fade out, stop the rotation and tear the context down completely. */
  async stop(): Promise<void> {
    this.wanted = false;

    const ctx = this.context;
    const source = this.source;
    const master = this.master;
    this.context = null;
    this.master = null;
    this.source = null;
    this.prefetch = null;

    if (!ctx) return;

    if (master) {
      ramp(master.gain, ctx.currentTime, SILENT, BGM_FADE_MS);
      await this.waiter(BGM_FADE_MS);
    }

    if (source) {
      // Clear the handler first: stopping deliberately must not be mistaken
      // for a track running out and advancing the rotation.
      source.onended = null;
      try {
        source.stop();
      } catch {
        // Already stopped; nothing actionable.
      }
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
      if (this.master) {
        ramp(this.master.gain, ctx.currentTime, SILENT, BGM_DUCK_MS);
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
    if (this.master) {
      ramp(this.master.gain, ctx.currentTime, BGM_GAIN, BGM_DUCK_MS);
    }
  }

  /**
   * iOS Safari drops an AudioContext back to "suspended" on its own — after a
   * call, a route away, or simply sitting in the background. Wire this to a
   * user gesture so the music comes back instead of silently dying.
   */
  async resume(): Promise<void> {
    const ctx = this.context;
    if (!ctx || !this.wanted || this.hidden) return;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
  }

  /**
   * Decode one track and play it through, then hand off to the next.
   * `skipped` counts consecutive unplayable tracks so a playlist whose files
   * are all missing stops instead of spinning.
   */
  private async playTrack(
    ctx: AudioContext,
    index: number,
    skipped: number,
  ): Promise<void> {
    if (!this.wanted || this.context !== ctx) return;
    if (skipped >= musicPlaylist.length) return; // nothing playable: silence

    const buffer = await this.decode(ctx, index);
    if (!this.wanted || this.context !== ctx || this.source) return;
    if (!buffer) {
      return this.playTrack(ctx, next(index), skipped + 1);
    }

    const gain = ctx.createGain();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain).connect(this.master ?? ctx.destination);

    const now = ctx.currentTime;
    const fade = BGM_FADE_MS / 1000;
    const endsAt = now + buffer.duration;

    // In over the first 300ms, out over the last 300ms: the track change is a
    // hard cut with a soft edge, never a crossfade.
    gain.gain.setValueAtTime(SILENT, now);
    gain.gain.linearRampToValueAtTime(1, now + fade);
    gain.gain.setValueAtTime(1, Math.max(now + fade, endsAt - fade));
    gain.gain.linearRampToValueAtTime(SILENT, endsAt);

    source.onended = () => {
      if (this.source !== source) return;
      this.source = null;
      if (!this.wanted || this.context !== ctx) return;
      void this.playTrack(ctx, next(index), 0);
    };

    source.start(now);
    source.stop(endsAt);
    this.index = index;
    this.source = source;

    // Pull the NEXT track's encoded bytes now, while this one plays, so the
    // seam costs a decode rather than a round trip. Bytes only — the decoded
    // buffer would be tens of megabytes and is built at the seam instead.
    this.queuePrefetch(next(index));
  }

  /** Fetch and decode one track. Null means "not playable, skip it". */
  private async decode(
    ctx: AudioContext,
    index: number,
  ): Promise<AudioBuffer | null> {
    const bytes = await this.bytesFor(index);
    if (!bytes) return null;
    try {
      return await ctx.decodeAudioData(bytes);
    } catch {
      // An undecodable file is a missing file as far as the visitor is
      // concerned: skip it, surface nothing.
      return null;
    }
  }

  private bytesFor(index: number): Promise<ArrayBuffer | null> {
    const queued = this.prefetch;
    this.prefetch = null;
    if (queued && queued.index === index) return queued.bytes;
    return this.fetchBytes(index);
  }

  private queuePrefetch(index: number): void {
    if (this.prefetch?.index === index) return;
    this.prefetch = { index, bytes: this.fetchBytes(index) };
  }

  private async fetchBytes(index: number): Promise<ArrayBuffer | null> {
    const track = musicPlaylist[index];
    if (!track) return null;
    try {
      const response = await this.fetcher(track.src);
      if (!response.ok) return null;
      return await response.arrayBuffer();
    } catch {
      // 404 or network failure: silence, not an error.
      return null;
    }
  }
}

function next(index: number): number {
  return (index + 1) % musicPlaylist.length;
}

/** Linear gain ramp from wherever the value is now. Mechanical, no bounce. */
function ramp(
  param: AudioParam,
  now: number,
  target: number,
  ms: number,
): void {
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(target, now + ms / 1000);
}

/** App-wide singleton used by the SoundProvider. */
export const bgm = new BgmEngine();
