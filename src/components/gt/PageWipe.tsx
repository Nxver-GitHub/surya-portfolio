"use client";

import * as React from "react";

/**
 * GT2 screen wipe between pavilions, via React's <ViewTransition>.
 *
 * Wraps the root layout's children. This ViewTransition is PERSISTENT, so
 * route changes activate its `update` slot (enter/exit only fire when the
 * component itself mounts/unmounts). The update map is keyed by transition
 * type: links tagged transitionTypes={["nav-forward"]} wipe left, ["nav-back"]
 * (the lozenge back buttons) wipe right — a hard 200ms mechanical slide (see
 * gt-wipe-* in globals.css). Untagged updates — same-route query-param
 * browsing (garage ?car=, trophy wall) and browser back/forward — map to
 * "none": the classic hard cut. Reduced-motion users and browsers without
 * the View Transitions API also get the hard cut.
 *
 * `ViewTransition` only exists in the react-experimental build Next swaps in
 * under `experimental.viewTransition` — the published react types don't
 * declare it yet, hence the local typing.
 */
const ViewTransition = (
  React as unknown as {
    ViewTransition: React.ComponentType<{
      children: React.ReactNode;
      enter?: string | Record<string, string>;
      exit?: string | Record<string, string>;
      update?: string | Record<string, string>;
      default?: string;
    }>;
  }
).ViewTransition;

const WIPES = {
  "nav-forward": "gt-wipe-fwd",
  "nav-back": "gt-wipe-back",
  default: "none",
} as const;

export function PageWipe({ children }: { children: React.ReactNode }) {
  // Belt and braces: if the experimental export ever disappears, render
  // children untouched instead of crashing the whole site shell.
  if (!ViewTransition) return <>{children}</>;
  return <ViewTransition update={WIPES}>{children}</ViewTransition>;
}
