"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { sfx, type SfxKind } from "@/lib/sfx";
import { bgm } from "@/lib/bgm";
import { musicPreference, sfxPreference } from "@/lib/sound-preferences";
import { DEFAULT_VOLUME_STEP, musicVolume } from "@/lib/music-volume";

// ── Persisted preferences ───────────────────────────────────────────────────
// Two independent opt-ins, each a tiny external store read via
// useSyncExternalStore: the server snapshot is always "off" (no hydration
// mismatch), and same-tab writes notify subscribers directly since the native
// "storage" event only fires in other tabs. The stores are module singletons
// in lib/sound-preferences.ts so the Sound Select strip writes through the
// same objects this provider reads — and so the split stays unit-testable
// without a DOM.

const alwaysOff = () => false;
const alwaysDefaultVolume = () => DEFAULT_VOLUME_STEP;

/** Kinds the delegated `data-sfx` click listener will play. */
const CLICK_KINDS: readonly SfxKind[] = [
  "move",
  "confirm",
  "back",
  "locked",
  "enter",
];

/** Floor between selection ticks, in ms. Fast keyboard scrolling through a
 * list must not stack blips into a buzz. */
const TICK_THROTTLE_MS = 60;

function markContextCreated(): void {
  (window as unknown as { __sfxCtxCreated?: boolean }).__sfxCtxCreated = true;
}

interface SoundContextValue {
  /** Whether the visitor has opted into menu tones. Default off, persisted. */
  enabled: boolean;
  /** Toggle menu tones on/off. */
  toggle: () => void;
  /** Whether the visitor has opted into the menu playlist. Default off. */
  musicEnabled: boolean;
  /** Toggle the menu playlist on/off. */
  toggleMusic: () => void;
  /** Play a menu tone. No-op while tones are off. */
  play: (kind: SfxKind) => void;
  /** Play the selection tick. Throttled, so callers can fire it on every
   * selection change without policing the rate themselves. */
  tick: () => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

/** Access the sound controls. Safe to call from any client component. */
export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    throw new Error("useSound must be used within a SoundProvider");
  }
  return ctx;
}

/**
 * Site-wide sound layer. SOUND FX keeps its row in the Options menu; MUSIC is
 * driven by the Sound Select strip in the page header (see useMusicDeck),
 * which writes the same persisted key this provider reads. Owns the
 * muted-by-default,
 * gesture-gated policy — now across two independent opt-ins, MUSIC and
 * SOUND FX, each with its own preference key and its own AudioContext:
 *
 * - Both default off. Nothing plays until the visitor opts in via a toggle.
 * - While a preference is off, zero AudioContext exists for it: enabling it is
 *   always a toggle click, and switching it off tears that context down. With
 *   both off the page holds no audio state at all.
 * - A persisted-on preference is standing consent: after a reload the engine
 *   re-arms on the session's FIRST user gesture (pointer/key, anywhere) —
 *   autoplay policy requires a gesture, not specifically the toggle's. This
 *   keeps a button that reads "On" truthful; previously every return visit was
 *   silent until the visitor cycled the toggle off and on.
 * - A single delegated click listener plays tones for elements tagged with a
 *   `data-sfx` attribute, keeping per-component wiring to one attribute.
 * - Selection-driven components call `tick()` when the SELECTED ITEM CHANGES,
 *   which is not the same thing as hovering: sweeping the pointer across a
 *   list should tick per row entered, never per mouse event.
 *
 * The provider lives in the root layout, and App Router layouts preserve state
 * across navigation, so the playlist keeps running through client-side route
 * changes without a seam — mid-track included. The engine is a module
 * singleton besides, so even a remount would not interrupt it.
 */
export function SoundProvider({ children }: { children: React.ReactNode }) {
  const enabled = useSyncExternalStore(
    sfxPreference.subscribe,
    sfxPreference.read,
    alwaysOff,
  );
  const musicEnabled = useSyncExternalStore(
    musicPreference.subscribe,
    musicPreference.read,
    alwaysOff,
  );
  const volumeStep = useSyncExternalStore(
    musicVolume.subscribe,
    musicVolume.read,
    alwaysDefaultVolume,
  );

  const lastTickRef = useRef(0);

  // One owner for the resting level, so whichever gesture arms the engine —
  // the strip's play button, a track pick, or the first-gesture re-arm below —
  // finds the visitor's persisted notch already set. Cheap while music is off:
  // the engine just remembers the value.
  useEffect(() => {
    bgm.setVolumeStep(volumeStep);
  }, [volumeStep]);

  const play = useCallback(
    (kind: SfxKind) => {
      if (!enabled) return;
      sfx.play(kind);
    },
    [enabled],
  );

  const tick = useCallback(() => {
    if (!enabled) return;
    const now = Date.now();
    if (now - lastTickRef.current < TICK_THROTTLE_MS) return;
    lastTickRef.current = now;
    sfx.play("move");
  }, [enabled]);

  const toggle = useCallback(() => {
    // Persisted-on but the context was lost on a hard reload and no other
    // gesture has re-armed it yet: this click re-arms without flipping state.
    if (enabled && !sfx.isAlive()) {
      void sfx.arm().then(markContextCreated);
      return;
    }

    const next = !enabled;
    sfxPreference.write(next);
    if (next) {
      void sfx.arm().then(markContextCreated);
    } else {
      void sfx.disarm();
    }
  }, [enabled]);

  const toggleMusic = useCallback(() => {
    // Same standing-consent rule as the tones: a persisted-on preference whose
    // context died on reload re-arms here instead of flipping to off.
    if (musicEnabled && !bgm.isAlive()) {
      void bgm.start();
      return;
    }

    const next = !musicEnabled;
    musicPreference.write(next);
    if (next) {
      void bgm.start();
    } else {
      void bgm.stop();
    }
  }, [musicEnabled]);

  // Expose a probe so tooling can confirm no context exists while off.
  useEffect(() => {
    (window as unknown as { __sfxProbe?: () => boolean }).__sfxProbe = () =>
      sfx.isAlive() || bgm.isAlive();
  }, []);

  // Persisted-on after a reload: re-arm on the session's first gesture so a
  // toggle reading "On" is true from the first data-sfx click (e.g. the PRESS
  // START gate). Both engines are idempotent, and this never runs while the
  // matching preference is off.
  useEffect(() => {
    const needsSfx = enabled && !sfx.isAlive();
    const needsMusic = musicEnabled && !bgm.isAlive();
    if (!needsSfx && !needsMusic) return;

    const rearm = () => {
      if (enabled) void sfx.arm().then(markContextCreated);
      if (musicEnabled) void bgm.start();
    };
    window.addEventListener("pointerdown", rearm, { once: true });
    window.addEventListener("keydown", rearm, { once: true });
    return () => {
      window.removeEventListener("pointerdown", rearm);
      window.removeEventListener("keydown", rearm);
    };
  }, [enabled, musicEnabled]);

  // iOS Safari suspends an AudioContext on its own (backgrounding, a call, the
  // ringer switch) and only a gesture brings it back. Cheap no-op while the
  // context is already running.
  useEffect(() => {
    if (!musicEnabled) return;
    const wake = () => {
      void bgm.resume();
    };
    window.addEventListener("pointerdown", wake);
    window.addEventListener("keydown", wake);
    return () => {
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
    };
  }, [musicEnabled]);

  // A backgrounded tab ducks to silence and suspends; returning fades back.
  useEffect(() => {
    if (!musicEnabled) return;
    const onVisibility = () => {
      void bgm.setHidden(document.visibilityState === "hidden");
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      void bgm.setHidden(false);
    };
  }, [musicEnabled]);

  // One delegated listener drives all menu tones. Keyboard activation of a
  // button/link also fires a click, so Enter/Space are covered too.
  useEffect(() => {
    if (!enabled) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const el = target?.closest<HTMLElement>("[data-sfx]");
      const kind = el?.dataset.sfx as SfxKind | undefined;
      if (kind && CLICK_KINDS.includes(kind)) {
        sfx.play(kind);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [enabled]);

  const value = useMemo(
    () => ({ enabled, toggle, musicEnabled, toggleMusic, play, tick }),
    [enabled, toggle, musicEnabled, toggleMusic, play, tick],
  );

  return (
    <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
  );
}
