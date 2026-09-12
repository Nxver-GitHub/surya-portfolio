/**
 * The music volume step — a period stepped level, not a slider.
 *
 * A 1990s console deck gave you three notches, so the Sound Select popup does
 * too: LO / MID / HI. MID is the default, and it is the engine's resting gain
 * — `BGM_GAIN` is derived from this table rather than the other way round.
 *
 * Stored as its own key rather than folded into the music on/off preference:
 * the level has to survive being switched off and back on, and a visitor who
 * has never touched it must read as MID rather than as silence.
 *
 * The environment is injected so the store is unit-testable in node without a
 * DOM, matching lib/sound-preferences.ts.
 */

import { browserEnvironment, type PreferenceEnvironment } from "./sound-preferences";

/** Music level. New key, so every existing visitor reads as the default. */
export const MUSIC_VOLUME_STORAGE_KEY = "surya-music-volume";

export type VolumeStep = "lo" | "mid" | "hi";

/** Order the popup renders them in, quietest first. */
export const VOLUME_STEPS: readonly VolumeStep[] = ["lo", "mid", "hi"];

/** Unset, unreadable or junk all land here. */
export const DEFAULT_VOLUME_STEP: VolumeStep = "mid";

/**
 * Master gain per step.
 *
 * These are amplitudes, and loudness is not linear in amplitude: 0.5 is not
 * "half volume", it is about two thirds as loud. So the notches are spaced by
 * ear, roughly 7–8 dB apart — each one reads as about half or double the one
 * beside it — rather than by splitting the 0–1 range into equal thirds, which
 * is what makes a naive LO/MID/HI ladder come out uniformly too loud.
 *
 * The ceiling is deliberately low. This is menu music behind a portfolio, not
 * a player: even HI has to sit UNDER the synthesized menu tones and under
 * whatever else the visitor is listening to, and LO has to be a murmur you can
 * hold a conversation over rather than merely a quieter foreground.
 */
const STEP_GAIN: Readonly<Record<VolumeStep, number>> = {
  lo: 0.08,
  mid: 0.2,
  hi: 0.45,
};

/** Human label for the popup's stepped row. */
const STEP_LABEL: Readonly<Record<VolumeStep, string>> = {
  lo: "Lo",
  mid: "Mid",
  hi: "Hi",
};

export function gainForVolumeStep(step: VolumeStep): number {
  return STEP_GAIN[step];
}

export function labelForVolumeStep(step: VolumeStep): string {
  return STEP_LABEL[step];
}

/**
 * Pure migration from a raw persisted string to a valid step. No DOM or
 * storage access, so it is trivially unit-testable.
 *
 * Tolerant on the way in because another tab, an older build or a hand-edited
 * profile can all put something else in the slot: spelled-out levels and case
 * variants are understood, and anything genuinely unrecognised degrades to the
 * default rather than to silence or to an error.
 */
export function migrateVolumeStep(raw: string | null): VolumeStep {
  if (raw === null) return DEFAULT_VOLUME_STEP;
  const value = raw.trim().toLowerCase();
  if (value === "lo" || value === "low") return "lo";
  if (value === "mid" || value === "med" || value === "medium") return "mid";
  if (value === "hi" || value === "high") return "hi";
  return DEFAULT_VOLUME_STEP;
}

/** A `useSyncExternalStore`-shaped view of the persisted level. */
export interface VolumeStore {
  readonly key: string;
  read(): VolumeStep;
  write(step: VolumeStep): void;
  subscribe(callback: () => void): () => void;
}

/**
 * Build the persisted level store. Same shape as `createPreferenceStore`:
 * same-tab writes notify subscribers directly, because the native "storage"
 * event only fires in *other* tabs.
 */
export function createVolumeStore(
  environment: PreferenceEnvironment = browserEnvironment,
): VolumeStore {
  const listeners = new Set<() => void>();

  return {
    key: MUSIC_VOLUME_STORAGE_KEY,
    read() {
      return migrateVolumeStep(environment.getItem(MUSIC_VOLUME_STORAGE_KEY));
    },
    write(step: VolumeStep) {
      environment.setItem(MUSIC_VOLUME_STORAGE_KEY, step);
      for (const notify of listeners) notify();
    },
    subscribe(callback: () => void) {
      listeners.add(callback);
      const detach = environment.addChangeListener(callback);
      return () => {
        listeners.delete(callback);
        detach();
      };
    },
  };
}

/** App-wide singleton, read by the SoundProvider and the Sound Select popup. */
export const musicVolume = createVolumeStore();
