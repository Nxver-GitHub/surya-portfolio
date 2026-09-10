import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { liveries } from "../content/liveries";
import { carById } from "../content/cars";
import {
  ALLOWED_WORDS,
  CAR_SILHOUETTES,
  FRAMES,
  FRAMES_COMPACT,
  formatLap,
  type FrameEntry,
  type LapTime,
} from "../src/components/boot/intro/sequence";

const CARS_DIR = join(__dirname, "..", "public", "intro", "cars");

/**
 * The intro is a signature FIRST-LOAD moment that must stay TIMELESS — it may
 * never reference a project, a stat, or anything "at the moment", so it reads
 * identically whenever a visitor returns. These tests pin that contract plus
 * the montage's structural invariants.
 */

const reels: Record<string, readonly FrameEntry[]> = {
  desktop: FRAMES,
  mobile: FRAMES_COMPACT,
};

describe.each(Object.entries(reels))("intro montage — %s reel", (_name, reel) => {
  it("only ever slams the brand words (nothing datable)", () => {
    const words = reel
      .filter((e) => e.frame.kind === "word")
      .map((e) => (e.frame as { kind: "word"; text: string }).text);
    for (const w of words) {
      expect(ALLOWED_WORDS).toContain(w);
    }
  });

  it("references only real heritage liveries", () => {
    const ids = reel
      .filter((e) => e.frame.kind === "livery")
      .map((e) => (e.frame as { kind: "livery"; livery: string }).livery);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect(liveries).toHaveProperty(id);
    }
  });

  it("builds to the SURYA → PUGAZHENTHI title hand-off", () => {
    const words = reel
      .filter((e) => e.frame.kind === "word")
      .map((e) => (e.frame as { kind: "word"; text: string }).text);
    expect(words.slice(-2)).toEqual(["SURYA", "PUGAZHENTHI"]);
  });

  it("only shows silhouettes of real hero cars", () => {
    const ids = reel
      .filter((e) => e.frame.kind === "silhouette")
      .map((e) => (e.frame as { kind: "silhouette"; car: string }).car);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect(CAR_SILHOUETTES).toContain(id);
      const car = carById.get(id);
      expect(car?.status).toBe("hero");
      expect(car?.modelPath).toBeTruthy();
    }
  });

  it("never shows a stopped clock", () => {
    const laps = reel
      .filter((e) => e.frame.kind === "numerals")
      .map((e) => (e.frame as { kind: "numerals"; lap: LapTime }).lap);
    for (const lap of laps) {
      // A zeroed timer reads as "not started". The era's clock ran, and GT2
      // drew an unset record as --'--"--- rather than as zeros.
      expect(lap.minutes + lap.seconds + lap.millis).toBeGreaterThan(0);
      expect(lap.seconds).toBeLessThan(60);
      expect(lap.millis).toBeLessThan(1000);
    }
  });

  it("advances the clock across timing cuts instead of repeating one time", () => {
    const totals = reel
      .filter((e) => e.frame.kind === "numerals")
      .map((e) => (e.frame as { kind: "numerals"; lap: LapTime }).lap)
      .map((l) => l.minutes * 60_000 + l.seconds * 1000 + l.millis);
    // Two cuts to the same clock made it look broken. Each later cut must show
    // the lap further along than the one before it.
    for (let i = 1; i < totals.length; i++) {
      expect(totals[i]).toBeGreaterThan(totals[i - 1]);
    }
  });

  it("uses only known frame kinds", () => {
    const known = new Set([
      "grid",
      "livery",
      "lights",
      "silhouette",
      "blur",
      "tach",
      "rim",
      "numerals",
      "word",
    ]);
    for (const e of reel) {
      expect(known).toContain(e.frame.kind);
    }
  });
});

describe("intro montage — lap time notation", () => {
  it("uses GT's apostrophe/quote notation, not a generic stopwatch", () => {
    const { head, millis } = formatLap({ minutes: 1, seconds: 8, millis: 431 });
    expect(head).toBe("1'08\"");
    expect(millis).toBe("431");
    expect(head).not.toContain(":");
  });

  it("pads seconds and thousandths", () => {
    const { head, millis } = formatLap({ minutes: 2, seconds: 4, millis: 7 });
    expect(head).toBe("2'04\"");
    expect(millis).toBe("007");
  });
});

describe("intro montage — car silhouette assets", () => {
  it("every hero car silhouette PNG exists", () => {
    for (const id of CAR_SILHOUETTES) {
      expect(existsSync(join(CARS_DIR, `${id}.png`))).toBe(true);
    }
  });

  it("references only cars that exist in the garage", () => {
    for (const id of CAR_SILHOUETTES) {
      expect(carById.has(id)).toBe(true);
    }
  });
});

describe("intro montage — pacing", () => {
  const GRID_MS = 165;

  it("desktop reel runs a montage of a few seconds", () => {
    const ms = FRAMES.length * GRID_MS;
    expect(ms).toBeGreaterThanOrEqual(2500);
    expect(ms).toBeLessThanOrEqual(4000);
  });

  it("mobile reel is shorter than desktop", () => {
    expect(FRAMES_COMPACT.length).toBeLessThan(FRAMES.length);
  });
});
