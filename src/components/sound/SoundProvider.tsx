"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { sfx, type SfxKind } from "@/lib/sfx";
import { SoundToggle } from "./SoundToggle";

const STORAGE_KEY = "surya-sfx-enabled";

// ── Persisted preference store ──────────────────────────────────────────────
// A tiny external store read via useSyncExternalStore: the server snapshot is
// always "off" (no hydration mismatch), and same-tab writes notify subscribers
// directly since the native "storage" event only fires in other tabs.
const listeners = new Set<() => void>();

function readPreference(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

function writePreference(on: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Persisting is best-effort (private mode etc.).
  }
  for (const notify of listeners) notify();
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function markContextCreated(): void {
  (window as unknown as { __sfxCtxCreated?: boolean }).__sfxCtxCreated = true;
}

interface SoundContextValue {
  /** Whether the user has opted into sound. Default off, persisted. */
  enabled: boolean;
  /** Toggle sound on/off. The only place the AudioContext is armed/disarmed. */
  toggle: () => void;
  /** Play a menu tone. No-op while sound is off. */
  play: (kind: SfxKind) => void;
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
 * Site-wide sound layer. Renders a persistent toggle on every route (it lives
 * in the root layout) and owns the muted-by-default, gesture-gated policy:
 *
 * - Default off. Nothing plays until the user clicks the toggle.
 * - The AudioContext is created/resumed ONLY inside the toggle click, and torn
 *   down when sound is switched off — so while off, zero AudioContext exists.
 *   (Even a persisted-on preference does not create a context on load; it is
 *   re-armed by the user's next toggle click after a hard reload.)
 * - A single delegated click listener plays tones for elements tagged with a
 *   `data-sfx` attribute ("move" | "confirm" | "back"), keeping per-component
 *   wiring to a single attribute.
 */
export function SoundProvider({ children }: { children: React.ReactNode }) {
  const enabled = useSyncExternalStore(subscribe, readPreference, () => false);

  const play = useCallback(
    (kind: SfxKind) => {
      if (!enabled) return;
      sfx.play(kind);
    },
    [enabled],
  );

  const toggle = useCallback(() => {
    // Persisted-on but the context was lost on a hard reload: this click (a
    // real gesture) re-arms it. Still the only place a context is created.
    if (enabled && !sfx.isAlive()) {
      void sfx.arm().then(markContextCreated);
      return;
    }

    const next = !enabled;
    writePreference(next);
    if (next) {
      void sfx.arm().then(markContextCreated);
    } else {
      void sfx.disarm();
    }
  }, [enabled]);

  // Expose a probe so tooling can confirm no context exists while off.
  useEffect(() => {
    (window as unknown as { __sfxProbe?: () => boolean }).__sfxProbe = () =>
      sfx.isAlive();
  }, []);

  // One delegated listener drives all menu tones. Keyboard activation of a
  // button/link also fires a click, so Enter/Space are covered too.
  useEffect(() => {
    if (!enabled) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const el = target?.closest<HTMLElement>("[data-sfx]");
      const kind = el?.dataset.sfx as SfxKind | undefined;
      if (kind === "move" || kind === "confirm" || kind === "back") {
        sfx.play(kind);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [enabled]);

  const value = useMemo(
    () => ({ enabled, toggle, play }),
    [enabled, toggle, play],
  );

  return (
    <SoundContext.Provider value={value}>
      {children}
      <SoundToggle enabled={enabled} onToggle={toggle} />
    </SoundContext.Provider>
  );
}
