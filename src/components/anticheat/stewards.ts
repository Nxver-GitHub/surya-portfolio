/**
 * Pure logic for the race-stewards anti-cheat gag: which gestures count as
 * an inspection attempt, and how the stewards escalate. No DOM — unit-tested
 * directly; StewardsNotice adapts real events onto these.
 *
 * Honesty note (also in the component): DevTools cannot actually be blocked
 * — undocked tools and the browser menu are undetectable, and the repo is
 * public anyway. This is theater in the GT2 fiction, escalating twice and
 * then gracefully standing down for persistent visitors.
 */

/** The shape of a keydown we care about — a structural subset of KeyboardEvent. */
export interface KeyGesture {
  /** KeyboardEvent.code (layout-independent — Cmd+Opt+I mangles .key on mac) */
  code: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/**
 * Deliberate "open the toolbox" keyboard gestures:
 * F12 · Cmd/Ctrl+Shift+I/J/C · Cmd+Opt+I (mac) · Cmd/Ctrl+U (view source).
 */
export function isInspectGesture(g: KeyGesture): boolean {
  if (g.code === "F12") return true;
  const mod = g.metaKey || g.ctrlKey;
  if (!mod) return false;
  if (g.shiftKey && (g.code === "KeyI" || g.code === "KeyJ" || g.code === "KeyC")) {
    return true;
  }
  if (g.metaKey && g.altKey && (g.code === "KeyI" || g.code === "KeyJ" || g.code === "KeyC")) {
    return true;
  }
  return g.code === "KeyU" && !g.shiftKey && !g.altKey;
}

export type StewardsAction = "penalty" | "repeat-offense" | "stand-down";

/**
 * Escalation ladder by PRIOR offense count: first attempt gets the penalty,
 * the second gets the repeat-offense notice, and from the third on the
 * stewards stand down for the session (no popup, no blocking — persistence
 * is respected).
 */
export function stewardsAction(priorOffenses: number): StewardsAction {
  if (priorOffenses <= 0) return "penalty";
  if (priorOffenses === 1) return "repeat-offense";
  return "stand-down";
}

/** Seconds the CLOSE plate stays locked — the time penalty itself. */
export const PENALTY_SECONDS = 5;
