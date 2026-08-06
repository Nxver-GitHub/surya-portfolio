import { describe, expect, it } from "vitest";
import {
  isProximizeQuestion,
  makeProximizeLines,
  makeProximizePosterLine,
} from "../src/components/cafe/terminal/proximize";
import { proximize, POSTER_ASPECT } from "../content/proximize";

describe("isProximizeQuestion", () => {
  it("matches the phrasings this feature exists to answer", () => {
    const asking = [
      "What is Surya working on?",
      "what is surya working on next",
      "What's Surya's next project?",
      "what are you working on these days",
      "what are you building now?",
      "So what's next?",
      "whats next",
      "any new projects coming?",
      "what's the new venture",
      "is he working on something new",
      "what are you up to lately?",
      "what's cooking?",
      "anything in the works?",
      "are you building something in stealth",
      "tell me about Proximize",
      "what is project silhouette",
    ];
    for (const text of asking) {
      expect(isProximizeQuestion(text), text).toBe(true);
    }
  });

  it("does NOT swallow questions the model should answer", () => {
    // A false positive here suppresses the model entirely, so the past-tense
    // and unrelated cases matter more than they do for the sibling matchers.
    const notAsking = [
      "what projects have you worked on?",
      "what have you built?",
      "which projects has he shipped?",
      "who is Surya?",
      "how do I contact you?",
      "what is this cafe based on?",
      "what licenses does he have?",
      "tell me about 16VC",
      "what hackathons did he win",
      "can I book a call?",
      "where did he go to school",
      "what is your tech stack",
    ];
    for (const text of notAsking) {
      expect(isProximizeQuestion(text), text).toBe(false);
    }
  });

  it("is case-insensitive on the named forms", () => {
    expect(isProximizeQuestion("PROXIMIZE")).toBe(true);
    expect(isProximizeQuestion("proximize")).toBe(true);
    expect(isProximizeQuestion("Project Silhouette")).toBe(true);
  });

  it("ignores empty and whitespace input", () => {
    expect(isProximizeQuestion("")).toBe(false);
    expect(isProximizeQuestion("   ")).toBe(false);
  });
});

describe("makeProximizeLines", () => {
  it("leads with the poster card at the poster's true aspect", () => {
    const poster = makeProximizePosterLine();
    expect(poster.media?.src).toBe(proximize.poster.src);
    expect(poster.media?.alt).toBe(proximize.poster.alt);
    // Default card geometry is a 4/5 portrait crop; the poster must override
    // it or object-fit:cover eats the lockup.
    expect(poster.media?.aspect).toBe(POSTER_ASPECT);
    expect(poster.media?.width).toBeGreaterThan(128);
  });

  it("states the public facts and the clickable link", () => {
    const lines = makeProximizeLines();
    const text = lines.map((l) => l.text).join("\n");
    expect(text).toContain(proximize.tagline);
    expect(text).toContain(proximize.href);
    expect(text).toContain(proximize.status);
  });

  it("points shipped work at the Garage, for false positives", () => {
    const text = makeProximizeLines()
      .map((l) => l.text)
      .join("\n");
    expect(text).toContain("/garage");
  });

  it("leaks nothing beyond the public content module", () => {
    // The disclosure boundary is content/proximize.ts. If a future edit hard-
    // codes a detail here instead, this catches it.
    const text = makeProximizeLines()
      .map((l) => l.text)
      .join(" ")
      .toLowerCase();
    for (const forbidden of ["funding", "raise", "seed", "launch date", "customers", "revenue"]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("gives every line a stable unique id", () => {
    const ids = makeProximizeLines().map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
