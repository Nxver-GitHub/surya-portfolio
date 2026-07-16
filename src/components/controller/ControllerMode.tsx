"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sfx } from "@/lib/sfx";
import {
  isDirection,
  pickFirstOnScreenIndex,
  pickNearestIndex,
  type Direction,
} from "./spatial";

/**
 * Controller mode — GT2 D-pad navigation for the whole site (E-immersion).
 *
 * PS1 games had no mouse cursor: you drove a selection highlight with the
 * D-pad. The web translation: the FIRST arrow-key press flips the site into
 * controller mode — the cursor hides, a bottom hint bar slides in, and the
 * arrow keys spatially move focus between the page's links/buttons (nearest
 * candidate in the pressed direction, orthogonal drift penalised). Enter
 * activates natively; Backspace navigates back. Any real mouse movement
 * flips back to pointer mode.
 *
 * Guards: never hijacks keys while typing (inputs/textareas/selects/
 * contenteditable — includes the café terminal), while a <dialog> is open
 * (native focus trap owns arrows), or under the boot overlay
 * ([data-boot-overlay]). Touch devices never see it — activation requires a
 * physical arrow key.
 *
 * The `data-controller` attribute on <html> drives the CSS (cursor hiding +
 * amplified GT2 focus ring — see globals.css).
 */

const CANDIDATE_SELECTOR = 'a[href], button:not([disabled]), [role="button"]';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function isInertPage(): boolean {
  return Boolean(
    document.querySelector("dialog[open]") ||
      document.querySelector("[data-boot-overlay]"),
  );
}

/** All visible spatial-nav candidates on the page. */
function candidates(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(CANDIDATE_SELECTOR)].filter(
    (el) => {
      if (el.closest("[aria-hidden='true']")) return false;
      if (!el.checkVisibility()) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    },
  );
}

function HintPlate({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="plate ts-hard inline-flex items-center gap-1.5 px-2.5 py-1 font-display text-xs font-bold tracking-widest text-silver uppercase">
      <span className="text-gt-bright">{keys}</span>
      {label}
    </span>
  );
}

export function ControllerMode() {
  const [active, setActive] = useState(false);
  const router = useRouter();

  // Mirror onto <html> for the CSS (cursor hiding + focus amplifier).
  useEffect(() => {
    document.documentElement.dataset.controller = active ? "on" : "off";
  }, [active]);

  const move = useCallback((direction: Direction) => {
    const pool = candidates();
    const rects = pool.map((el) => el.getBoundingClientRect());
    const currentIndex =
      document.activeElement instanceof HTMLElement
        ? pool.indexOf(document.activeElement)
        : -1;
    const nextIndex =
      currentIndex >= 0
        ? pickNearestIndex(rects[currentIndex], direction, rects, currentIndex)
        : pickFirstOnScreenIndex(rects, window.innerHeight);
    const next = nextIndex >= 0 ? pool[nextIndex] : null;
    if (!next) return false;
    next.focus();
    next.scrollIntoView({ block: "nearest", inline: "nearest" });
    sfx.play("move");
    return true;
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (isInertPage()) return;

      if (isDirection(event.key)) {
        // First arrow press just arms controller mode; subsequent ones drive.
        if (move(event.key) || !active) event.preventDefault();
        setActive(true);
        return;
      }

      if (event.key === "Backspace" && active) {
        event.preventDefault();
        sfx.play("back");
        router.back();
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      // Real mouse motion only — ignore the zero-move events some browsers
      // fire on scroll, and any synthetic touch pointers.
      if (event.pointerType !== "mouse") return;
      if (event.movementX === 0 && event.movementY === 0) return;
      setActive(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointermove", onPointerMove);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointermove", onPointerMove);
    };
  }, [active, move, router]);

  if (!active) return null;

  return (
    <div
      aria-hidden="true"
      className="controller-hints fixed inset-x-0 bottom-3 z-60 flex justify-center gap-2 md:bottom-4"
    >
      <HintPlate keys="◂ ▸" label="Move" />
      <HintPlate keys="⏎" label="Enter" />
      <HintPlate keys="⌫" label="Back" />
    </div>
  );
}
