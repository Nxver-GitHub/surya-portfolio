"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { Glyph } from "@/components/gt/Glyph";

const MODE_KEY = "sr-crt-mode"; // "on" | "off"
const LEVEL_KEY = "sr-crt-level"; // "1" | "2" | "3"
const DEFAULT_LEVEL = "2";

// ── Persisted preference store (mirrors the SoundProvider pattern) ──────────
const listeners = new Set<() => void>();

function readMode(): boolean {
  try {
    return window.localStorage.getItem(MODE_KEY) !== "off";
  } catch {
    return true;
  }
}

function readLevel(): string {
  try {
    const raw = window.localStorage.getItem(LEVEL_KEY);
    return raw === "1" || raw === "2" || raw === "3" ? raw : DEFAULT_LEVEL;
  } catch {
    return DEFAULT_LEVEL;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
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
 * preference onto <html data-crt / data-crt-level> so the effect is pure CSS.
 * On by default; the rolling band dies under prefers-reduced-motion.
 *
 * PROTOTYPE ONLY (strip before finalizing): keys 1/2/3 switch intensity and 0
 * toggles the effect, with a small readout chip bottom-left, so the owner can
 * judge intensities live on the preview. Keystrokes inside inputs/textareas
 * (e.g. the café terminal) are ignored.
 */
export function CrtLayer() {
  const on = useSyncExternalStore(subscribe, readMode, () => true);
  const level = useSyncExternalStore(subscribe, readLevel, () => DEFAULT_LEVEL);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.crt = on ? "on" : "off";
    root.dataset.crtLevel = level;
  }, [on, level]);

  const toggle = useCallback(() => {
    write(MODE_KEY, on ? "off" : "on");
  }, [on]);

  // PROTOTYPE ONLY: live intensity switcher for the preview review.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "0") write(MODE_KEY, readMode() ? "off" : "on");
      else if (event.key === "1" || event.key === "2" || event.key === "3") {
        write(LEVEL_KEY, event.key);
        write(MODE_KEY, "on");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div className="crt-fx" aria-hidden="true">
        <div className="crt-fx-tex" />
        <div className="crt-fx-vig" />
        <div className="crt-fx-band" />
      </div>
      <CrtToggle on={on} onToggle={toggle} />
      {/* PROTOTYPE ONLY: intensity readout for the preview review. */}
      <div
        aria-hidden="true"
        className="plate ts-hard fixed bottom-3 left-3 z-50 px-2.5 py-1 font-display text-xs font-bold tracking-widest text-gt-bright uppercase"
      >
        CRT {on ? `L${level}` : "off"} · keys 1/2/3/0
      </div>
    </>
  );
}
