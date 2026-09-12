"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

const MODE_KEY = "sr-crt-mode"; // "off" | "subtle" | "full"

export type CrtMode = "off" | "subtle" | "full";

const DEFAULT_MODE: CrtMode = "subtle";

// Cycle order surfaced by the Options row: Off → Subtle → Full → Off.
const CYCLE_ORDER: readonly CrtMode[] = ["off", "subtle", "full"];

/**
 * Pure migration from a raw persisted string to a valid CrtMode. No DOM/
 * storage access here so it is trivially unit-testable. Legacy "on" (the
 * pre-three-state value) becomes "subtle"; unset/unrecognized values also
 * default to "subtle" — the owner-locked default tier. "off" and "full" pass
 * through unchanged.
 */
export function migrateCrtMode(raw: string | null): CrtMode {
  if (raw === "off" || raw === "full") return raw;
  if (raw === "subtle") return "subtle";
  return DEFAULT_MODE; // covers legacy "on" and anything missing/invalid
}

/** Pure cycle step: Off → Subtle → Full → Off. */
export function nextCrtMode(mode: CrtMode): CrtMode {
  const index = CYCLE_ORDER.indexOf(mode);
  return CYCLE_ORDER[(index + 1) % CYCLE_ORDER.length];
}

// ── Persisted preference store (mirrors the SoundProvider pattern) ──────────
const listeners = new Set<() => void>();

function readMode(): CrtMode {
  try {
    return migrateCrtMode(window.localStorage.getItem(MODE_KEY));
  } catch {
    return DEFAULT_MODE;
  }
}

function writeMode(mode: CrtMode): void {
  try {
    window.localStorage.setItem(MODE_KEY, mode);
  } catch {
    // best-effort (private mode etc.)
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

/**
 * CRT preference for UI controls (the Options menu row). Reads/writes the
 * same persisted store the overlay mirrors onto <html data-crt>.
 */
export function useCrtMode(): { mode: CrtMode; cycle: () => void } {
  const mode = useSyncExternalStore(subscribe, readMode, () => DEFAULT_MODE);
  const cycle = useCallback(() => {
    writeMode(nextCrtMode(mode));
  }, [mode]);
  return { mode, cycle };
}

/**
 * Site-wide CRT glass: renders the fixed effect overlay (see `.crt-fx` in
 * globals.css) and mirrors the persisted preference onto <html data-crt> so
 * the effect itself is pure CSS. Three states — off / subtle / full — with
 * subtle as the owner-locked default (felt more than seen); full layers on
 * visible scanlines, a phosphor grille, deeper corner falloff and a touch of
 * bloom. The rolling band dies under prefers-reduced-motion in every state.
 */
export function CrtLayer() {
  const mode = useSyncExternalStore(subscribe, readMode, () => DEFAULT_MODE);

  useEffect(() => {
    document.documentElement.dataset.crt = mode;
  }, [mode]);

  return (
    <div className="crt-fx" aria-hidden="true">
      <div className="crt-fx-tex" />
      <div className="crt-fx-vig" />
      <div className="crt-fx-band" />
      <div className="crt-fx-bloom" />
    </div>
  );
}
