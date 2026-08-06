import { describe, expect, it } from "vitest";
import {
  DECODE_STALL_CAP_MS,
  FIRST_IMAGE_BEAT,
  FRAMES,
  POSITIONING_LINES,
  REDUCED_FRAMES,
  TEASER_ANNOUNCEMENT,
  preloadWindowMs,
  totalDuration,
} from "../src/components/cafe/terminal/teaser/sequence";
import { proximize } from "../content/proximize";

describe("teaser sequence — shape", () => {
  it("runs long enough to be an advert, short enough to sit through", () => {
    const total = totalDuration(FRAMES);
    expect(total).toBeGreaterThan(9_000);
    expect(total).toBeLessThan(14_000);
  });

  it("gives every beat a positive hold", () => {
    for (const entry of FRAMES) {
      expect(entry.hold, JSON.stringify(entry.frame)).toBeGreaterThan(0);
    }
  });

  it("opens on the signal drop and ends on black", () => {
    expect(FRAMES[0].frame.kind).toBe("signal");
    expect(FRAMES[FRAMES.length - 1].frame.kind).toBe("black");
  });

  it("reads the poster top to bottom: type, car, lockup, sign-off", () => {
    const order = FRAMES.map((e) => e.frame.kind);
    const car = order.indexOf("car");
    const lockup = order.indexOf("lockup");
    const badge = order.indexOf("badge");
    const url = order.indexOf("url");
    expect(car).toBeGreaterThan(0);
    expect(lockup).toBeGreaterThan(car);
    expect(badge).toBeGreaterThan(lockup);
    expect(url).toBeGreaterThan(badge);
  });

  it("uses the poster's own positioning copy, verbatim", () => {
    const lines = FRAMES.flatMap((e) =>
      e.frame.kind === "line" ? [e.frame.text] : [],
    );
    for (const line of POSITIONING_LINES) {
      expect(lines).toContain(line);
    }
    expect(lines).toContain("COMING SOON.");
  });

  it("only fires the two cinematic cues, on their own beats", () => {
    const cued = FRAMES.filter((e) => e.sfx);
    expect(cued).toHaveLength(2);
    expect(cued[0].sfx).toBe("teaserDrop");
    expect(cued[0].frame.kind).toBe("signal");
    expect(cued[1].sfx).toBe("teaserSlam");
    expect(cued[1].frame.kind).toBe("lockup");
  });
});

describe("teaser sequence — the preload window", () => {
  it("puts every image beat after a long stretch of imageless beats", () => {
    // This is the whole loading strategy: beats 1-6 are type on black, which
    // is the budget the cut-outs get to decode in. If a future edit moves an
    // image beat earlier, the decode gate loses its cover and the money shot
    // can render blank on a slow connection.
    expect(FIRST_IMAGE_BEAT).toBeGreaterThan(0);
    for (const entry of FRAMES.slice(0, FIRST_IMAGE_BEAT)) {
      expect(["signal", "black", "line"]).toContain(entry.frame.kind);
    }
  });

  it("leaves a window comfortably longer than the stall cap", () => {
    expect(preloadWindowMs()).toBeGreaterThan(DECODE_STALL_CAP_MS);
    expect(preloadWindowMs()).toBeGreaterThan(4_000);
  });
});

describe("teaser sequence — reduced motion", () => {
  it("keeps every beat and every hold", () => {
    // The setting is about vestibular safety, not about opting out of the
    // content: same rhythm, same length, same beats.
    expect(REDUCED_FRAMES).toHaveLength(FRAMES.length);
    expect(totalDuration(REDUCED_FRAMES)).toBe(totalDuration(FRAMES));
    REDUCED_FRAMES.forEach((entry, i) => {
      expect(entry.hold).toBe(FRAMES[i].hold);
    });
  });

  it("removes the phosphor glitch, which is the one real flicker", () => {
    expect(REDUCED_FRAMES.some((e) => e.frame.kind === "signal")).toBe(false);
    expect(REDUCED_FRAMES[0].frame.kind).toBe("black");
  });

  it("leaves the image and type beats untouched", () => {
    REDUCED_FRAMES.forEach((entry, i) => {
      if (FRAMES[i].frame.kind !== "signal") {
        expect(entry.frame).toEqual(FRAMES[i].frame);
      }
    });
  });
});

describe("teaser sequence — announcement", () => {
  it("carries the whole advert as one sentence for assistive tech", () => {
    expect(TEASER_ANNOUNCEMENT).toContain(proximize.name);
    expect(TEASER_ANNOUNCEMENT).toContain(proximize.tagline);
    expect(TEASER_ANNOUNCEMENT).toContain("proximize.net");
  });

  it("is a single sentence group, not a beat list", () => {
    expect(TEASER_ANNOUNCEMENT.split("\n")).toHaveLength(1);
  });
});
