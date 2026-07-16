"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { changelog, siteVersion } from "../../../content/changelog";

/**
 * VERSION plate in the home footer. Click opens a small GT2-style update-log
 * panel (upward, so it never leaves the viewport) listing what each release
 * added to the site. Content lives in content/changelog.ts. Esc and
 * click-away close, mirroring the OptionsMenu interaction contract.
 */
export function VersionLog() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelId = useId();

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
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        data-sfx="move"
        onClick={() => setOpen((o) => !o)}
        className="ts-hard inline-flex items-baseline gap-1.5 font-display text-xs font-bold tracking-[0.14em] text-silver uppercase outline-none hover:text-gt-bright focus-visible:ring-2 focus-visible:ring-gt-bright"
      >
        Version
        <span className="text-chrome tabular-nums">{siteVersion}</span>
      </button>

      {open ? (
        <div
          id={panelId}
          aria-label="Update log"
          className="bg-grid-paper absolute bottom-full left-0 z-50 mb-2 w-72 border-2 border-gt bg-asphalt shadow-[3px_4px_0_rgba(0,0,0,0.8)]"
        >
          <p className="border-b border-steel px-3 py-1.5 font-display text-xs font-black tracking-[0.28em] text-gt-bright uppercase">
            Update Log
          </p>
          {changelog.map((entry) => (
            <div key={entry.version} className="px-3 py-2">
              <p className="ts-hard font-display text-xs font-bold tracking-[0.14em] text-chrome uppercase">
                v{entry.version}
                <span className="ml-2 font-medium text-silver normal-case tracking-normal">
                  {entry.date}
                </span>
              </p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {entry.changes.map((change) => (
                  <li key={change} className="flex gap-1.5 text-xs text-ink leading-snug">
                    <span aria-hidden="true" className="text-gt-bright">
                      +
                    </span>
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
