import type { LiveryId } from "../../../../content/liveries";

/**
 * Beat 2 montage sequence — pure data, no JSX, so it stays testable in the node
 * test env and its invariants can be asserted (see the intro test).
 *
 * The reel is EVERGREEN motorsport iconography: recognizable silhouettes of the
 * garage's hero cars (all iconic, timeless machines — R32 GT-R, 993, F1 LM, CLK
 * GTR), each paired with its heritage livery, plus start lights, a tach, a rim,
 * decorative timing numerals, and brand type. No stats, no dated copy — nothing
 * that reads differently whenever a visitor returns. The renderer is frames.tsx.
 */

export type Transition = "cut" | "whip" | "wipe";

/** Hero cars with rendered silhouettes under public/intro/cars/<id>.png. */
export type CarSilhouetteId =
  | "benefitfinder"
  | "tripweaver"
  | "credence"
  | "nodegent";

export const CAR_SILHOUETTES: readonly CarSilhouetteId[] = [
  "benefitfinder",
  "tripweaver",
  "credence",
  "nodegent",
];

export type Frame =
  | { kind: "grid" }
  | { kind: "livery"; livery: LiveryId }
  | { kind: "lights"; lit: boolean }
  | { kind: "silhouette"; car: CarSilhouetteId; tone: "chrome" | "orange" }
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

/** Desktop reel (~21 cuts @ 165ms ≈ 3.5s): each hero car after its livery. */
export const FRAMES: readonly FrameEntry[] = [
  { frame: { kind: "grid" } },
  { frame: { kind: "livery", livery: "calsonic" } },
  { frame: { kind: "lights", lit: false } },
  { frame: { kind: "lights", lit: true } },
  { frame: { kind: "silhouette", car: "benefitfinder", tone: "chrome" } },
  { frame: { kind: "blur" } },
  { frame: { kind: "livery", livery: "marlboro" }, transition: "whip" },
  { frame: { kind: "tach", redline: false } },
  { frame: { kind: "tach", redline: true } },
  { frame: { kind: "silhouette", car: "tripweaver", tone: "orange" }, transition: "wipe" },
  { frame: { kind: "numerals" } },
  { frame: { kind: "livery", livery: "west" } },
  { frame: { kind: "silhouette", car: "credence", tone: "chrome" } },
  { frame: { kind: "rim" } },
  { frame: { kind: "livery", livery: "rothmans" }, transition: "whip" },
  { frame: { kind: "silhouette", car: "nodegent", tone: "orange" } },
  { frame: { kind: "numerals" } },
  { frame: { kind: "lights", lit: true } },
  { frame: { kind: "word", text: "SURYA" }, transition: "whip" },
  { frame: { kind: "word", text: "RACING" }, transition: "whip" },
  { frame: { kind: "grid" } },
];

/** Mobile reel (~12 cuts @ 165ms ≈ 2.0s) — same beats, fewer of them. */
export const FRAMES_COMPACT: readonly FrameEntry[] = [
  { frame: { kind: "grid" } },
  { frame: { kind: "livery", livery: "calsonic" } },
  { frame: { kind: "silhouette", car: "benefitfinder", tone: "chrome" } },
  { frame: { kind: "tach", redline: true } },
  { frame: { kind: "livery", livery: "marlboro" }, transition: "whip" },
  { frame: { kind: "silhouette", car: "tripweaver", tone: "orange" } },
  { frame: { kind: "livery", livery: "west" } },
  { frame: { kind: "silhouette", car: "credence", tone: "chrome" } },
  { frame: { kind: "silhouette", car: "nodegent", tone: "orange" }, transition: "whip" },
  { frame: { kind: "numerals" } },
  { frame: { kind: "word", text: "SURYA" }, transition: "whip" },
  { frame: { kind: "word", text: "RACING" }, transition: "whip" },
];
