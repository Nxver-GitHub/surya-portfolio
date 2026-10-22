"use client";

import { useEffect, useRef, useSyncExternalStore, type RefObject } from "react";

/**
 * Below this width the Garage and Café pickers fold from a side column into a
 * horizontal strip under the viewer (`.picker-strip` in console.css). Matches
 * Tailwind's `lg` breakpoint, so `max-lg:` utilities and this agree.
 */
export const SIDE_PICKER_QUERY = "(min-width: 1024px)";

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(SIDE_PICKER_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * Is the picker a side column (true) or a horizontal strip (false)? Only for
 * semantics that CSS cannot carry, such as a tablist's `aria-orientation`.
 * The server snapshot is the desktop column, so SSR and hydration agree.
 */
export function useSidePicker(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(SIDE_PICKER_QUERY).matches,
    () => true,
  );
}

const SELECTED = '[aria-current="true"], [aria-selected="true"]';

/**
 * Keep the selected plate of a horizontal picker strip in view: centred on
 * first paint (instantly) and on every change after (a short slide, or a hard
 * cut under reduced motion). Scrolls the strip only, never the page, so a
 * selection made down the screen does not yank the viewer out of sight. A
 * no-op while the picker is a column (nothing to scroll).
 */
export function useCenterSelected(
  stripRef: RefObject<HTMLElement | null>,
  selectedKey: string,
): void {
  const settled = useRef(false);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const first = !settled.current;
    settled.current = true;
    if (strip.scrollWidth <= strip.clientWidth) return;
    const plate = strip.querySelector<HTMLElement>(SELECTED);
    if (!plate) return;

    const stripBox = strip.getBoundingClientRect();
    const plateBox = plate.getBoundingClientRect();
    const left =
      strip.scrollLeft +
      (plateBox.left - stripBox.left) -
      (stripBox.width - plateBox.width) / 2;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    strip.scrollTo({ left, behavior: first || reduce ? "auto" : "smooth" });
  }, [stripRef, selectedKey]);
}
