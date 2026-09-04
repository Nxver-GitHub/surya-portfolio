import { describe, expect, it } from "vitest";
import {
  buildFactsDigest,
  buildSystemPrompt,
  DIGEST_CHAR_CAP,
} from "../src/lib/terminal-prompt";

/**
 * Guards the GTME block in the café terminal's facts digest. The digest cap
 * drops whole blocks silently when content grows past it, and a terminal that
 * cannot answer "what did he build with Clay?" undermines the section built
 * to answer exactly that. If this fails after adding content, raise
 * DIGEST_CHAR_CAP rather than trimming the block.
 */
describe("terminal-prompt — GTME block", () => {
  const digest = buildFactsDigest();

  it("keeps the GTM engineering block inside the capped digest", () => {
    expect(digest).toContain("GTM ENGINEERING");
    expect(digest.length).toBeLessThanOrEqual(DIGEST_CHAR_CAP);
  });

  it("carries the load-bearing facts and the pavilion routes", () => {
    for (const needle of [
      "/special-stage",
      "/special-stage/recon",
      "/special-stage/pace-notes",
      "/special-stage/the-stage",
      "AlphaForge",
      "zero replies",
      "2,932",
    ]) {
      expect(digest).toContain(needle);
    }
  });

  it("keeps every other block intact alongside it (no silent drops)", () => {
    for (const heading of [
      "THE CAFE ITSELF",
      "UPCOMING",
      "CONTACT",
      "CAREER",
      "PROJECTS:",
      "SKILLS",
      "COMPETITIONS:",
      "GUIDED TOURS",
    ]) {
      expect(digest, heading).toContain(heading);
    }
  });

  it("mentions the Special Stage in the persona's site-places line", () => {
    expect(buildSystemPrompt()).toContain("Special Stage");
  });
});
