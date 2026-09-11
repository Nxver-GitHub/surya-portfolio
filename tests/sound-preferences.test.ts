import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  browserEnvironment,
  createPreferenceStore,
  ENABLED_VALUE,
  MUSIC_STORAGE_KEY,
  SFX_STORAGE_KEY,
  type PreferenceEnvironment,
} from "@/lib/sound-preferences";

/** In-memory stand-in for localStorage + the cross-tab "storage" event. */
function makeEnvironment(seed: Record<string, string> = {}) {
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
  return {
    environment,
    values,
    /** Simulate another tab writing, then firing the native storage event. */
    otherTab(key: string, value: string) {
      values.set(key, value);
      for (const notify of external) notify();
    },
    externalCount: () => external.size,
  };
}

describe("preference keys", () => {
  it("keeps the pre-split SFX key and adds a separate music key", () => {
    // Renaming the SFX key would silently mute every existing visitor who had
    // already opted in, so it is pinned by this assertion.
    expect(SFX_STORAGE_KEY).toBe("surya-sfx-enabled");
    expect(MUSIC_STORAGE_KEY).toBe("surya-music-enabled");
    expect(MUSIC_STORAGE_KEY).not.toBe(SFX_STORAGE_KEY);
  });
});

describe("migration from the single-key era", () => {
  it("carries a persisted SFX opt-in across the split and leaves music off", () => {
    const env = makeEnvironment({ [SFX_STORAGE_KEY]: ENABLED_VALUE });
    const tones = createPreferenceStore(SFX_STORAGE_KEY, env.environment);
    const music = createPreferenceStore(MUSIC_STORAGE_KEY, env.environment);

    expect(tones.read()).toBe(true);
    expect(music.read()).toBe(false);
  });

  it("defaults both off for a visitor with no stored preferences", () => {
    const env = makeEnvironment();
    expect(createPreferenceStore(SFX_STORAGE_KEY, env.environment).read()).toBe(
      false,
    );
    expect(
      createPreferenceStore(MUSIC_STORAGE_KEY, env.environment).read(),
    ).toBe(false);
  });

  it("reads anything other than \"on\" as off", () => {
    for (const stored of ["off", "true", "1", "ON", ""]) {
      const env = makeEnvironment({ [SFX_STORAGE_KEY]: stored });
      const store = createPreferenceStore(SFX_STORAGE_KEY, env.environment);
      expect(store.read()).toBe(false);
    }
  });

  it("reads and writes as off when storage throws (private mode)", () => {
    // Safari's private mode throws from localStorage rather than returning
    // null. The browser environment swallows it, so a blocked visitor gets a
    // silent site and a working toggle instead of a crashed provider.
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    const previous = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = {
      localStorage: blocked,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    try {
      const store = createPreferenceStore(SFX_STORAGE_KEY, browserEnvironment);
      expect(store.read()).toBe(false);
      expect(() => store.write(true)).not.toThrow();
      expect(store.read()).toBe(false);
    } finally {
      (globalThis as { window?: unknown }).window = previous;
    }
  });
});

describe("independent opt-ins", () => {
  let env: ReturnType<typeof makeEnvironment>;

  beforeEach(() => {
    env = makeEnvironment();
  });

  it("writes each preference under its own key without touching the other", () => {
    const tones = createPreferenceStore(SFX_STORAGE_KEY, env.environment);
    const music = createPreferenceStore(MUSIC_STORAGE_KEY, env.environment);

    music.write(true);
    expect(music.read()).toBe(true);
    expect(tones.read()).toBe(false);
    expect(env.values.get(SFX_STORAGE_KEY)).toBeUndefined();

    tones.write(true);
    music.write(false);
    expect(tones.read()).toBe(true);
    expect(music.read()).toBe(false);
  });

  it("persists an explicit off rather than deleting the key", () => {
    const music = createPreferenceStore(MUSIC_STORAGE_KEY, env.environment);
    music.write(true);
    music.write(false);
    expect(env.values.get(MUSIC_STORAGE_KEY)).toBe("off");
    expect(music.read()).toBe(false);
  });
});

describe("subscription", () => {
  it("notifies same-tab writers directly and detaches cleanly", () => {
    const env = makeEnvironment();
    const store = createPreferenceStore(MUSIC_STORAGE_KEY, env.environment);
    const listener = vi.fn();

    const unsubscribe = store.subscribe(listener);
    store.write(true);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.write(false);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(env.externalCount()).toBe(0);
  });

  it("relays cross-tab changes through the environment listener", () => {
    const env = makeEnvironment();
    const store = createPreferenceStore(MUSIC_STORAGE_KEY, env.environment);
    const listener = vi.fn();
    store.subscribe(listener);

    env.otherTab(MUSIC_STORAGE_KEY, ENABLED_VALUE);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.read()).toBe(true);
  });

  it("keeps the two stores' subscriber sets separate", () => {
    const env = makeEnvironment();
    const tones = createPreferenceStore(SFX_STORAGE_KEY, env.environment);
    const music = createPreferenceStore(MUSIC_STORAGE_KEY, env.environment);
    const onTones = vi.fn();
    tones.subscribe(onTones);

    music.write(true);
    expect(onTones).not.toHaveBeenCalled();
  });
});
