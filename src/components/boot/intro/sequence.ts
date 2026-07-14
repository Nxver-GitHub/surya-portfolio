import type { LiveryId } from "../../../../content/liveries";

/**
 * Beat 2 montage sequence — pure data, no JSX, so it stays testable in the
 * node test env and the "timeless" contract can be asserted (see the intro
 * test). Every frame is EVERGREEN motorsport iconography: heritage livery
 * colours, a generic car silhouette, start lights, a tach, a rim, timing
 * numerals, and brand type. Nothing references a project, a stat, or anything
 * "at the moment", so the intro never dates. The renderer lives in frames.tsx.
 */

export type Transition = "cut" | "whip" | "wipe";

export type Frame =
  | { kind: "grid" }
  | { kind: "livery"; livery: LiveryId }
  | { kind: "lights"; lit: boolean }
  | { kind: "silhouette"; tone: "chrome" | "orange" | "outline"; flip?: boolean }
  | { kind: "blur" }
  | { kind: "tach"; redline?: boolean }
  | { kind: "rim" }
  | { kind: "numerals" }
  | { kind: "word"; text: string };

export interface FrameEntry {
  frame: Frame;
  transition?: Transition;
}

/** The only words the reel may slam — brand identity only, nothing datable. */
export const ALLOWED_WORDS = ["SURYA", "RACING"] as const;

/** Desktop reel (~21 cuts @ 130ms ≈ 2.7s), building to the SURYA·RACING slam. */
export const FRAMES: readonly FrameEntry[] = [
  { frame: { kind: "grid" } },
  { frame: { kind: "livery", livery: "gulf" } },
  { frame: { kind: "lights", lit: false } },
  { frame: { kind: "lights", lit: true } },
  { frame: { kind: "silhouette", tone: "chrome" } },
  { frame: { kind: "blur" } },
  { frame: { kind: "livery", livery: "marlboro" }, transition: "whip" },
  { frame: { kind: "tach", redline: false } },
  { frame: { kind: "tach", redline: true } },
  { frame: { kind: "numerals" } },
  { frame: { kind: "silhouette", tone: "orange" }, transition: "wipe" },
  { frame: { kind: "livery", livery: "jps" } },
  { frame: { kind: "rim" } },
  { frame: { kind: "blur" } },
  { frame: { kind: "livery", livery: "martini" }, transition: "whip" },
  { frame: { kind: "silhouette", tone: "outline", flip: true } },
  { frame: { kind: "numerals" } },
  { frame: { kind: "lights", lit: true } },
  { frame: { kind: "word", text: "SURYA" }, transition: "whip" },
  { frame: { kind: "word", text: "RACING" }, transition: "whip" },
  { frame: { kind: "grid" } },
];

/** Mobile reel (~12 cuts ≈ 1.6s) — same beats, fewer of them. */
export const FRAMES_COMPACT: readonly FrameEntry[] = [
  { frame: { kind: "grid" } },
  { frame: { kind: "livery", livery: "gulf" } },
  { frame: { kind: "lights", lit: true } },
  { frame: { kind: "silhouette", tone: "chrome" } },
  { frame: { kind: "tach", redline: true } },
  { frame: { kind: "livery", livery: "jps" }, transition: "whip" },
  { frame: { kind: "rim" } },
  { frame: { kind: "livery", livery: "martini" }, transition: "whip" },
  { frame: { kind: "numerals" } },
  { frame: { kind: "silhouette", tone: "outline", flip: true } },
  { frame: { kind: "word", text: "SURYA" }, transition: "whip" },
  { frame: { kind: "word", text: "RACING" }, transition: "whip" },
];
