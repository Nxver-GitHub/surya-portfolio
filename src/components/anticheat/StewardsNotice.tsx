"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/sfx";
import {
  PENALTY_SECONDS,
  isInspectGesture,
  stewardsAction,
  type StewardsAction,
} from "./stewards";

/**
 * The race stewards — a video-game anti-cheat gag for inspect-element
 * attempts (owner request + grill, 2026-07). Right-click, DevTools
 * shortcuts, and view-source trigger a GT2 penalty dialog with a
 * {@link PENALTY_SECONDS}-second lockout before CLOSE arms. Second offense
 * escalates the copy; from the third the stewards stand down for the
 * session (no popup, no blocking). The dialog winks at the truth: the repo
 * is public, so it links straight to the source.
 *
 * This is deliberately theater — DevTools cannot actually be blocked
 * (undocked tools and the browser menu are undetectable). It exists for the
 * fiction, not for protection; nothing on this site is secret.
 */

const OFFENSES_KEY = "sr-stewards-offenses";
const REPO_URL = "https://github.com/Nxver-GitHub/surya-portfolio";

function readOffenses(): number {
  try {
    return Number(sessionStorage.getItem(OFFENSES_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeOffenses(count: number): void {
  try {
    sessionStorage.setItem(OFFENSES_KEY, String(count));
  } catch {
    // storage unavailable (private mode etc.) — the gag just fires each time
  }
}

export function StewardsNotice() {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [action, setAction] = useState<Exclude<StewardsAction, "stand-down"> | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(PENALTY_SECONDS);
  const locked = secondsLeft > 0;

  const openNotice = useCallback(() => {
    const prior = readOffenses();
    const verdict = stewardsAction(prior);
    if (verdict === "stand-down") return false; // stewards gave up — no block
    writeOffenses(prior + 1);
    setAction(verdict);
    setSecondsLeft(PENALTY_SECONDS);
    sfx.play("back");
    dialogRef.current?.showModal();
    return true;
  }, []);

  // Trigger listeners: context menu + inspect keyboard gestures. The event
  // is only blocked when the stewards still care (before stand-down).
  useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      if (stewardsAction(readOffenses()) === "stand-down") return;
      event.preventDefault();
      openNotice();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isInspectGesture(event)) return;
      if (stewardsAction(readOffenses()) === "stand-down") return;
      event.preventDefault();
      openNotice();
    };
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openNotice]);

  // The countdown — the penalty itself. Esc is refused while locked (a
  // penalty you can Esc out of is no penalty).
  useEffect(() => {
    if (action === null || !locked) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [action, locked]);

  const onCancel = useCallback(
    (event: React.SyntheticEvent<HTMLDialogElement>) => {
      if (locked) event.preventDefault();
    },
    [locked],
  );

  const close = useCallback(() => {
    if (!locked) dialogRef.current?.close();
  }, [locked]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={onCancel}
      aria-labelledby="stewards-title"
      className="bg-grid-paper m-auto w-[min(26rem,calc(100vw-2rem))] border-2 border-accent bg-asphalt p-0 shadow-[4px_5px_0_rgba(0,0,0,0.8)] backdrop:bg-black/75"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <p
            id="stewards-title"
            className="ts-hard font-display text-sm font-black tracking-[0.24em] text-accent uppercase"
          >
            <span aria-hidden="true">⚠</span>{" "}
            {action === "repeat-offense"
              ? "Penalty — repeat offense"
              : "Penalty"}
          </p>
          {/* The time penalty, big and ticking — a race stewards' stop-go
              clock. Shows DONE once it expires so the beat resolves. */}
          <span
            aria-live="polite"
            className={`ts-hard shrink-0 border-2 px-2.5 py-1 font-display text-xl font-black tabular-nums tracking-widest ${
              locked ? "border-accent text-accent" : "border-steel text-silver"
            }`}
          >
            {locked ? `0:0${secondsLeft}` : "DONE"}
          </span>
        </div>
        <p className="mt-3 max-w-[44ch] text-sm text-ink leading-snug">
          {action === "repeat-offense"
            ? "STEWARDS' NOTICE: a second illegal modification attempt. The stewards are watching this garage very closely."
            : "STEWARDS' NOTICE: illegal modification attempt detected in scrutineering. Serve your time penalty."}
        </p>
        <p className="mt-3 max-w-[44ch] text-sm text-silver leading-snug">
          Psst — the paddock is open source. No need to break in.
        </p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-sfx="confirm"
            className="plate ts-hard inline-flex items-center gap-2 px-3 py-2 font-display text-xs font-bold tracking-widest text-gt-bright uppercase outline-none hover:text-chrome focus-visible:ring-2 focus-visible:ring-gt-bright"
          >
            View the code <span aria-hidden="true">↗</span>
          </a>
          <button
            type="button"
            onClick={close}
            disabled={locked}
            data-sfx="back"
            aria-disabled={locked}
            className={`${
              locked
                ? "cursor-not-allowed border border-steel text-silver/60"
                : "plate-hot text-asphalt hover:brightness-110"
            } ts-hard px-4 py-2 font-display text-xs font-black tracking-widest uppercase outline-none focus-visible:ring-2 focus-visible:ring-chrome`}
          >
            {locked ? `Close (0:0${secondsLeft})` : "Close"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
