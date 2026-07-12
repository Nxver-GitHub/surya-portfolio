import { describe, expect, it } from "vitest";
import {
  PORTRAIT_SRC,
  isWhoIsSurya,
  makePortraitLine,
} from "../src/components/cafe/terminal/portrait";

describe("portrait — isWhoIsSurya", () => {
  it("recognizes direct 'who is surya' style asks", () => {
    for (const text of [
      "who is surya",
      "Who's Surya?",
      "who are you",
      "tell me about surya",
    ]) {
      expect(isWhoIsSurya(text), text).toBe(true);
    }
  });

  it("rejects unrelated queries", () => {
    for (const text of ["help", "what did he build at Locus", "contact"]) {
      expect(isWhoIsSurya(text), text).toBe(false);
    }
  });
});

describe("portrait — makePortraitLine", () => {
  it("returns a line pointing at the placeholder portrait with non-empty alt", () => {
    const line = makePortraitLine();
    expect(line.media?.src).toBe("/terminal/portrait-placeholder.svg");
    expect(line.media?.alt).toBeTruthy();
    expect(line.media?.alt.length).toBeGreaterThan(0);
    expect(PORTRAIT_SRC).toBe("/terminal/portrait-placeholder.svg");
  });
});
