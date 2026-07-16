import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  CAFE_ORIGIN_PHOTOS,
  isCafeOriginQuestion,
  makeCafeOriginLines,
} from "../src/components/cafe/terminal/cafeOrigin";
import { buildSystemPrompt } from "../src/lib/terminal-prompt";
import { photos } from "../content/photos";

describe("cafeOrigin — isCafeOriginQuestion", () => {
  it("recognizes 'what is the cafe based on' style asks", () => {
    for (const text of [
      "what is the cafe based on",
      "What's this café based off?",
      "what inspired the cafe",
      "is the coffee shop real?",
      "where did the idea for the cafe come from",
      "why a cafe?",
    ]) {
      expect(isCafeOriginQuestion(text), text).toBe(true);
    }
  });

  it("rejects unrelated queries (including other cafe questions)", () => {
    for (const text of [
      "help",
      "who is surya",
      "what inspired the garage",
      "how do I order at the cafe",
    ]) {
      expect(isCafeOriginQuestion(text), text).toBe(false);
    }
  });
});

describe("cafeOrigin — media lines", () => {
  it("returns one line per photo with non-empty alt text", () => {
    const lines = makeCafeOriginLines();
    expect(lines).toHaveLength(CAFE_ORIGIN_PHOTOS.length);
    for (const line of lines) {
      expect(line.media?.src).toBeTruthy();
      expect(line.media?.alt.length).toBeGreaterThan(0);
    }
  });

  it("ships the photo files the cards point at", () => {
    for (const photo of CAFE_ORIGIN_PHOTOS) {
      expect(existsSync(join(__dirname, "..", "public", photo.src))).toBe(true);
    }
  });

  it("shares its photos with the Scapes gallery (no duplicate assets)", () => {
    const scapeSrcs = new Set(photos.map((p) => p.src));
    for (const photo of CAFE_ORIGIN_PHOTOS) {
      expect(scapeSrcs.has(photo.src), photo.src).toBe(true);
    }
  });
});

describe("cafeOrigin — system prompt grounding", () => {
  it("includes the Motoring Coffee origin fact in the terminal system prompt", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("Motoring Coffee");
    expect(prompt).toContain("San Francisco");
  });
});
