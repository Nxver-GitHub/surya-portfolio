"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Glyph } from "@/components/gt/Glyph";
import { useSound } from "@/components/sound/SoundProvider";
import { useCrtMode } from "@/components/crt/CrtLayer";

/** One GT options row: label left, ON/OFF state chip right; click flips. */
function OptionRow({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={on}
      onClick={onToggle}
      data-sfx="confirm"
      className="flex w-full items-center justify-between gap-6 px-3 py-2 text-left outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-gt-bright"
    >
      <span className="ts-hard font-display text-xs font-bold tracking-[0.2em] text-chrome uppercase">
        {label}
      </span>
      <span
        className={`${
          on ? "plate-hot text-asphalt" : "plate ts-hard text-silver"
        } px-2 py-0.5 font-display text-xs font-black tracking-widest uppercase`}
      >
        {on ? "On" : "Off"}
      </span>
    </button>
  );
}

/**
 * The corner OPTIONS plate — a miniature GT2 options screen. Replaces the
 * former pile of per-setting chips (Sound, CRT) with one trigger that drops a
 * panel of toggle rows, so site chrome never stacks over page content (the
 * home driver card sits right under this corner). Anchored to the top of the
 * page (absolute, not fixed) — the owner rejected a scroll-following plate
 * because it collided with page content mid-scroll. Esc and click-away close;
 * the trigger reflects expansion for assistive tech.
 */
export function OptionsMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelId = useId();
  const sound = useSound();
  const crt = useCrtMode();

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  // Click-away + Escape, active only while open.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  return (
    <div
      ref={rootRef}
      className="absolute top-14 right-3 z-50 flex flex-col items-end gap-1.5 md:top-16 md:right-6"
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={panelId}
        data-sfx="move"
        onClick={() => setOpen((o) => !o)}
        className={`${
          open ? "plate-hot text-asphalt" : "plate ts-hard text-gt-bright"
        } inline-flex min-h-9 items-center gap-1.5 px-2.5 py-1 font-display text-xs font-bold tracking-widest uppercase outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-chrome`}
      >
        <Glyph kind="badge" size="0.95em" className={open ? "" : "opacity-70"} />
        <span>Options</span>
      </button>

      {open ? (
        <div
          id={panelId}
          role="menu"
          aria-label="Options"
          className="bg-grid-paper w-52 border-2 border-gt bg-asphalt shadow-[3px_4px_0_rgba(0,0,0,0.8)]"
        >
          <p className="border-b border-steel px-3 py-1.5 font-display text-xs font-black tracking-[0.28em] text-gt-bright uppercase">
            Options
          </p>
          <OptionRow label="Sound" on={sound.enabled} onToggle={sound.toggle} />
          <OptionRow label="CRT FX" on={crt.on} onToggle={crt.toggle} />
        </div>
      ) : null}
    </div>
  );
}
