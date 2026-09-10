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

/**
 * A lap time on the timing frame. The era's clock RUNS — GT2's race and licence
 * timers count up, and a frozen zero only ever meant "not started" (GT2 drew an
 * unset record as --'--"---, never as zeros). So the reel's two timing cuts
 * carry different times: the montage cuts away and comes back to a clock that
 * has moved, which is what a real lap looks like.
 *
 * The numbers are set dressing, like the tach needle and the start lights —
 * chosen to be plausible for the machinery on screen, decoding to nothing. They
 * are not a claim about anyone's driving.
 */
export interface LapTime {
  minutes: number;
  /** 0–59 */
  seconds: number;
  /** Thousandths, 0–999 */
  millis: number;
}

/** Mid-lap, and the same lap most of the way home. */
export const LAP_SPLIT: LapTime = { minutes: 1, seconds: 8, millis: 431 };
export const LAP_FINAL: LapTime = { minutes: 1, seconds: 32, millis: 956 };

/**
 * GT's signature notation: apostrophe for minutes, double-quote for seconds —
 * 1'32"956, not a generic 00:00.000 stopwatch. Returned split so the frame can
 * hold the thousandths in a different ink, the way the HUD did.
 */
export function formatLap(lap: LapTime): { head: string; millis: string } {
  return {
    head: `${lap.minutes}'${String(lap.seconds).padStart(2, "0")}"`,
    millis: String(lap.millis).padStart(3, "0"),
  };
}

export type Frame =
  | { kind: "grid" }
  | { kind: "livery"; livery: LiveryId }
  | { kind: "lights"; lit: boolean }
  | { kind: "silhouette"; car: CarSilhouetteId; tone: "chrome" | "orange" }
  | { kind: "blur" }
  | { kind: "tach"; redline?: boolean }
  | { kind: "rim" }
  | { kind: "numerals"; lap: LapTime }
  | { kind: "word"; text: string };

export interface FrameEntry {
  frame: Frame;
  transition?: Transition;
}

/** The only words the reel may slam — brand identity only, nothing datable. */
export const ALLOWED_WORDS = ["SURYA", "PUGAZHENTHI"] as const;

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
  { frame: { kind: "numerals", lap: LAP_SPLIT } },
  { frame: { kind: "livery", livery: "west" } },
  { frame: { kind: "silhouette", car: "credence", tone: "chrome" } },
  { frame: { kind: "rim" } },
  { frame: { kind: "livery", livery: "rothmans" }, transition: "whip" },
  { frame: { kind: "silhouette", car: "nodegent", tone: "orange" } },
  { frame: { kind: "numerals", lap: LAP_FINAL } },
  { frame: { kind: "lights", lit: true } },
  { frame: { kind: "word", text: "SURYA" }, transition: "whip" },
  { frame: { kind: "word", text: "PUGAZHENTHI" }, transition: "whip" },
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
  // The compact reel has room for one timing cut, so it shows the lap set
  // rather than a split — a single clock can't tell a story of progression.
  { frame: { kind: "silhouette", car: "nodegent", tone: "orange" }, transition: "whip" },
  { frame: { kind: "numerals", lap: LAP_FINAL } },
  { frame: { kind: "word", text: "SURYA" }, transition: "whip" },
  { frame: { kind: "word", text: "PUGAZHENTHI" }, transition: "whip" },
];
