"use client";

import { Glyph } from "@/components/gt/Glyph";

interface SoundToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

/**
 * The persistent sound switch — a small stamped GT plate chip fixed in the top
 * chrome, just under the breadcrumb strip, on every route. Off by default:
 * black plate with orange glyph. On: lit orange plate with dark text (AA on
 * orange). `aria-pressed` announces state; it is an ordinary button, so it is
 * fully keyboard operable and uses the site's chrome focus ring.
 */
export function SoundToggle({ enabled, onToggle }: SoundToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      aria-label={enabled ? "Sound on — turn off" : "Sound off — turn on"}
      className={`${
        enabled ? "plate-hot text-asphalt" : "plate ts-hard text-gt-bright"
      } fixed top-14 right-3 z-50 inline-flex min-h-9 items-center gap-1.5 px-2.5 py-1 font-display text-xs font-bold tracking-widest uppercase outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-chrome md:top-16 md:right-6`}
    >
      <Glyph
        kind="signal"
        size="0.95em"
        className={enabled ? "" : "opacity-70"}
      />
      <span>{enabled ? "Sound On" : "Sound Off"}</span>
    </button>
  );
}
