"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

const MODE_KEY = "sr-crt-mode"; // "on" | "off"

// ── Persisted preference store (mirrors the SoundProvider pattern) ──────────
const listeners = new Set<() => void>();

function readMode(): boolean {
  try {
    return window.localStorage.getItem(MODE_KEY) !== "off";
  } catch {
    return true;
  }
}

function writeMode(on: boolean): void {
  try {
    window.localStorage.setItem(MODE_KEY, on ? "on" : "off");
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
export function useCrtMode(): { on: boolean; toggle: () => void } {
  const on = useSyncExternalStore(subscribe, readMode, () => true);
  const toggle = useCallback(() => {
    writeMode(!on);
  }, [on]);
  return { on, toggle };
}

/**
 * Site-wide CRT glass: renders the fixed effect overlay (see `.crt-fx` in
 * globals.css) and mirrors the persisted preference onto <html data-crt> so
 * the effect itself is pure CSS. On by default at the owner-locked subtle
 * intensity; the Options menu row (useCrtMode) is the readability/
 * accessibility escape hatch, and the rolling band dies under
 * prefers-reduced-motion.
 */
export function CrtLayer() {
  const on = useSyncExternalStore(subscribe, readMode, () => true);

  useEffect(() => {
    document.documentElement.dataset.crt = on ? "on" : "off";
  }, [on]);

  return (
    <div className="crt-fx" aria-hidden="true">
      <div className="crt-fx-tex" />
      <div className="crt-fx-vig" />
      <div className="crt-fx-band" />
    </div>
  );
}
