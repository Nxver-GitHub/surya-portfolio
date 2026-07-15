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
  type FrameEntry,
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
