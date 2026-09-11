"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { bgm, BGM_IDLE_STATE } from "@/lib/bgm";
import { musicPreference } from "@/lib/sound-preferences";
import {
  DEFAULT_VOLUME_STEP,
  musicVolume,
  type VolumeStep,
} from "@/lib/music-volume";
import { musicPlaylist, type MusicTrack } from "../../../content/music";

const alwaysOff = () => false;
const alwaysIdle = () => BGM_IDLE_STATE;
const alwaysDefaultVolume = () => DEFAULT_VOLUME_STEP;

export interface MusicDeck {
  /** The whole rotation, in order — the popup's pickable rows. */
  readonly tracks: readonly MusicTrack[];
  /** The persisted opt-in. This is what the play/pause control flips. */
  readonly enabled: boolean;
  /** True only while a track is actually sounding. */
  readonly playing: boolean;
  /** Cued playlist index, or -1 before the first track of the session. */
  readonly index: number;
  /** The track the readout names, or null on an idle deck. */
  readonly track: MusicTrack | null;
  readonly volume: VolumeStep;
  /** Press play (opt in and sound) or pause (opt out and tear down). */
  toggle: () => void;
  next: () => void;
  prev: () => void;
  select: (index: number) => void;
  setVolume: (step: VolumeStep) => void;
}

/**
 * The Sound Select strip's view of the deck.
 *
 * Three external stores, no local copies: the persisted opt-in
 * (`surya-music-enabled` — the same key the Options panel used to flip, so a
 * returning visitor's preference survives), the engine's transport state, and
 * the persisted level. Reading the engine here rather than through the
 * SoundProvider context keeps a track change from re-rendering the whole page
 * — only the strip subscribes.
 *
 * Every transport press is treated as consent to hear music: skipping or
 * picking a track on an idle deck arms it, the same way pressing play does.
 * The gesture gate is unchanged — a press IS the user gesture the autoplay
 * policy wants, and while the preference is off no AudioContext exists at all.
 */
export function useMusicDeck(): MusicDeck {
  const enabled = useSyncExternalStore(
    musicPreference.subscribe,
    musicPreference.read,
    alwaysOff,
  );
  const state = useSyncExternalStore(bgm.subscribe, bgm.getState, alwaysIdle);
  const volume = useSyncExternalStore(
    musicVolume.subscribe,
    musicVolume.read,
    alwaysDefaultVolume,
  );

  const toggle = useCallback(() => {
    // Standing consent: the preference is on but the context died on a hard
    // reload and no gesture has re-armed it yet. This press re-arms rather
    // than flipping a visitor's preference off behind their back.
    if (enabled && !bgm.isAlive()) {
      void bgm.start();
      return;
    }

    const next = !enabled;
    musicPreference.write(next);
    if (next) {
      void bgm.start();
    } else {
      void bgm.pause();
    }
  }, [enabled]);

  /** Move the cue, then make sure the deck is running — one path whether the
   * press landed on a sounding deck or an idle one. */
  const steer = useCallback(
    (move: () => Promise<void>) => {
      if (!enabled) musicPreference.write(true);
      void move().then(() => bgm.start());
    },
    [enabled],
  );

  const next = useCallback(() => steer(() => bgm.next()), [steer]);
  const prev = useCallback(() => steer(() => bgm.prev()), [steer]);
  const select = useCallback(
    (index: number) => steer(() => bgm.selectTrack(index)),
    [steer],
  );

  const setVolume = useCallback((step: VolumeStep) => {
    // The SoundProvider owns applying this to the engine, so the level is
    // right even when something else armed the context.
    musicVolume.write(step);
  }, []);

  const track =
    state.playing && state.index >= 0
      ? (musicPlaylist[state.index] ?? null)
      : null;

  return useMemo(
    () => ({
      tracks: musicPlaylist,
      enabled,
      playing: state.playing,
      index: state.index,
      track,
      volume,
      toggle,
      next,
      prev,
      select,
      setVolume,
    }),
    [enabled, state, track, volume, toggle, next, prev, select, setVolume],
  );
}
