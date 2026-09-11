/**
 * The two persisted audio opt-ins, as a tiny external store per preference.
 *
 * The site ships silent and stays silent until the visitor asks for sound, so
 * each preference is an independent opt-in that defaults to OFF:
 *
 * - `surya-sfx-enabled` — the synthesized menu blips. This key predates the
 *   split and is deliberately unchanged, so anyone who already turned tones on
 *   keeps them on across the upgrade.
 * - `surya-music-enabled` — the looping menu theme. New, therefore absent for
 *   every existing visitor, which reads as off. Nobody is opted into music by
 *   an upgrade; they have to ask for it.
 *
 * Only the literal string "on" counts as enabled. Anything else — missing,
 * "off", or junk written by another tab — is off, which is what makes the
 * migration safe in both directions: an old single-key profile degrades to
 * "tones on, music off" rather than to an error.
 *
 * The environment is injected so the whole store is unit-testable in node
 * without a DOM; the browser default reads localStorage and republishes the
 * native cross-tab "storage" event.
 */

/** Menu tones. Predates the music/SFX split — never rename it. */
export const SFX_STORAGE_KEY = "surya-sfx-enabled";
/** Looping menu theme. Added by the split; absent means off. */
export const MUSIC_STORAGE_KEY = "surya-music-enabled";

/** The value that counts as opted in. Everything else is off. */
export const ENABLED_VALUE = "on";
const DISABLED_VALUE = "off";

/** The browser surfaces a preference store needs, injectable for tests. */
export interface PreferenceEnvironment {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  /** Subscribe to external (other-tab) changes. Returns an unsubscribe. */
  addChangeListener(callback: () => void): () => void;
}

/** A `useSyncExternalStore`-shaped view of one persisted boolean. */
export interface PreferenceStore {
  readonly key: string;
  /** Client snapshot. */
  read(): boolean;
  /** Persist and notify every subscriber in this tab. */
  write(on: boolean): void;
  subscribe(callback: () => void): () => void;
}

/** localStorage + the native cross-tab "storage" event. */
export const browserEnvironment: PreferenceEnvironment = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      // Private mode / blocked storage: treat as unset.
      return null;
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Persisting is best-effort; the in-session preference still holds.
    }
  },
  addChangeListener(callback) {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
  },
};

/**
 * Build one persisted opt-in. Same-tab writes notify subscribers directly,
 * because the native "storage" event only fires in *other* tabs.
 */
export function createPreferenceStore(
  key: string,
  environment: PreferenceEnvironment = browserEnvironment,
): PreferenceStore {
  const listeners = new Set<() => void>();

  return {
    key,
    read() {
      return environment.getItem(key) === ENABLED_VALUE;
    },
    write(on: boolean) {
      environment.setItem(key, on ? ENABLED_VALUE : DISABLED_VALUE);
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
