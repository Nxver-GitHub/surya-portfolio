"use client";

import { useCallback, useRef } from "react";
import { joinControls } from "../../../content/lobby";

const BOOKING_URL =
  joinControls.find((c) => c.channel === "calendly")?.href ?? "/lobby";

/**
 * The unsold dealer slot at the end of the Garage roster. A dashed "open
 * bay" card that invites visitors to pitch a collaboration; clicking it
 * opens a small GT dialog with the Calendly booking plate (owner call,
 * 2026-07: booking link only — no email fallback inside the window).
 *
 * Uses a native <dialog> — showModal() gives focus trapping, Esc-to-close,
 * and inert background for free; backdrop clicks close via the click-target
 * check (the dialog element itself is only the click target when the click
 * lands on the backdrop).
 */
export function EmptyBay() {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const open = useCallback(() => dialogRef.current?.showModal(), []);
  const close = useCallback(() => dialogRef.current?.close(), []);

  const onBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDialogElement>) => {
      if (event.target === dialogRef.current) close();
    },
    [close],
  );

  return (
    <>
      <button
        type="button"
        data-sfx="move"
        onClick={open}
        className="ts-hard flex w-full items-center gap-3 border-2 border-dashed border-steel px-3 py-2.5 text-left outline-none transition-colors duration-(--duration-snap) ease-(--ease-mech) hover:border-gt hover:text-gt-bright focus-visible:ring-2 focus-visible:ring-gt-bright"
      >
        <span
          aria-hidden="true"
          className="block h-8 w-1.5 border border-dashed border-steel"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-display text-base leading-tight font-bold tracking-wide text-silver uppercase">
            + Add a new car
          </span>
          <span className="truncate text-xs text-silver/70">
            Empty bay — yours?
          </span>
        </span>
      </button>

      <dialog
        ref={dialogRef}
        onClick={onBackdropClick}
        aria-labelledby="empty-bay-title"
        className="bg-grid-paper m-auto w-[min(26rem,calc(100vw-2rem))] border-2 border-gt bg-asphalt p-0 shadow-[4px_5px_0_rgba(0,0,0,0.8)] backdrop:bg-black/70"
      >
        <div className="p-5">
          <p
            id="empty-bay-title"
            className="ts-hard font-display text-sm font-black tracking-[0.24em] text-gt-bright uppercase"
          >
            New car — open bay
          </p>
          <p className="mt-3 max-w-[44ch] text-sm text-ink leading-snug">
            Every car in this garage started as a conversation. Have an idea
            worth building together? Book a call — the next machine in the
            dealership could be ours.
          </p>
          <div className="mt-5 flex items-center justify-between gap-3">
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-sfx="confirm"
              className="plate-hot inline-flex items-center gap-2 px-4 py-2 font-display text-sm font-bold tracking-widest text-asphalt uppercase outline-none transition-[filter] duration-(--duration-snap) ease-(--ease-mech) hover:brightness-110 focus-visible:ring-2 focus-visible:ring-chrome"
            >
              Book a call <span aria-hidden="true">→</span>
            </a>
            <button
              type="button"
              onClick={close}
              data-sfx="move"
              className="plate ts-hard px-3 py-2 font-display text-xs font-bold tracking-widest text-silver uppercase outline-none hover:text-chrome focus-visible:ring-2 focus-visible:ring-gt-bright"
            >
              Close
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
