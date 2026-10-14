"use client";

import { useSyncExternalStore, type ReactNode } from "react";

/**
 * The one definition of a "touch" visitor across the site: the PRIMARY pointer
 * is coarse (a finger). Deliberately not a width check — an iPad is as wide as
 * a small laptop but has no keyboard or hover, so it needs touch wording. A
 * touchscreen laptop (primary pointer: mouse/trackpad) keeps keyboard wording.
 *
 * Matches Tailwind's built-in `pointer-coarse:` variant exactly, so CSS-only
 * swaps (`PointerText`) and the JS hook never disagree.
 */
export const COARSE_POINTER_QUERY = "(pointer: coarse)";

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(COARSE_POINTER_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * Is the primary pointer coarse? For the few places where the text must differ
 * in JS (attributes such as `aria-label`). Server snapshot is `false`, so SSR
 * and hydration render the keyboard wording and the client swaps after — no
 * mismatch. Prefer `PointerText` for visible copy: it is CSS-only and correct
 * from the first paint.
 */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(COARSE_POINTER_QUERY).matches,
    () => false,
  );
}

/**
 * Renders both wordings and lets `@media (pointer: coarse)` show one. The
 * hidden variant is `display: none`, so assistive tech reads only the visible
 * one — and there is nothing to hydrate differently.
 */
export function PointerText({ fine, touch }: { fine: ReactNode; touch: ReactNode }) {
  return (
    <>
      <span className="pointer-coarse:hidden">{fine}</span>
      <span className="hidden pointer-coarse:inline">{touch}</span>
    </>
  );
}
