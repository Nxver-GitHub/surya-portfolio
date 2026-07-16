"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { Glyph } from "@/components/gt/Glyph";

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

/** GT plate chip under the Sound toggle — the tube on/off switch. */
function CrtToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      aria-label={on ? "CRT effect on — turn off" : "CRT effect off — turn on"}
      className={`${
        on ? "plate-hot text-asphalt" : "plate ts-hard text-gt-bright"
      } fixed top-24 right-3 z-50 inline-flex min-h-9 items-center gap-1.5 px-2.5 py-1 font-display text-xs font-bold tracking-widest uppercase outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-chrome md:top-27 md:right-6`}
    >
      <Glyph kind="badge" size="0.95em" className={on ? "" : "opacity-70"} />
      <span>{on ? "CRT On" : "CRT Off"}</span>
    </button>
  );
}

/**
 * Site-wide CRT glass: renders the fixed effect overlay (see `.crt-fx` in
 * globals.css) and the persistent CRT toggle, and mirrors the persisted
 * preference onto <html data-crt> so the effect itself is pure CSS. On by
 * default at the owner-locked subtle intensity; the toggle is the readability/
 * accessibility escape hatch, and the rolling band dies under
 * prefers-reduced-motion.
 */
export function CrtLayer() {
  const on = useSyncExternalStore(subscribe, readMode, () => true);

  useEffect(() => {
    document.documentElement.dataset.crt = on ? "on" : "off";
  }, [on]);

  const toggle = useCallback(() => {
    writeMode(!on);
  }, [on]);

  return (
    <>
      <div className="crt-fx" aria-hidden="true">
        <div className="crt-fx-tex" />
        <div className="crt-fx-vig" />
        <div className="crt-fx-band" />
      </div>
      <CrtToggle on={on} onToggle={toggle} />
    </>
  );
}
