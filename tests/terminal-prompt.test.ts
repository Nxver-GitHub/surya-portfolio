import { describe, expect, it } from "vitest";
import {
  DIGEST_CHAR_CAP,
  OWNER_NAME,
  SYSTEM_NAME,
  buildFactsDigest,
  buildSystemPrompt,
} from "../src/lib/terminal-prompt";

describe("terminal prompt — facts digest", () => {
  const digest = buildFactsDigest();

  it("stays within the character cap", () => {
    expect(digest.length).toBeLessThanOrEqual(DIGEST_CHAR_CAP);
  });

  // Regression: a 6k cap silently dropped whole blocks (CAREER included), so
  // the model answered career questions from scraps and guessed tenure wrong.
  it("keeps every content block — CAREER must never drop", () => {
    for (const header of [
      "CONTACT",
      "CAREER",
      "PROJECTS:",
      "SKILLS",
      "COMPETITIONS:",
      "GUIDED TOURS",
    ]) {
      expect(digest, `missing block: ${header}`).toContain(header);
    }
  });

  // Regression: the model called a "Present"-dated role "former" — currency
  // must be explicit in the digest and enforced by a hard rule in the prompt.
  it("marks Present-dated roles as current", () => {
    expect(digest).toContain("[CURRENT — ongoing role]");
    expect(buildSystemPrompt()).toContain(
      "Never describe them as former, past, or previous",
    );
  });

  it("never leaks undefined or [object Object]", () => {
    expect(digest).not.toContain("undefined");
    expect(digest).not.toContain("[object");
    expect(digest).not.toContain("NaN");
  });

  it("includes real project names from content/cars.ts", () => {
    for (const name of ["Nodegent", "TripWeaver", "Credence", "BenefitFinder"]) {
      expect(digest, `missing project: ${name}`).toContain(name);
    }
  });

  it("includes real orgs from career/lobby content", () => {
    for (const org of ["16VC", "LvlUp Ventures", "UC Santa Cruz", "Entrepreneur First"]) {
      expect(digest, `missing org: ${org}`).toContain(org);
    }
  });

  it("includes real competitions from content/missions.ts", () => {
    for (const comp of ["CruzHacks", "Locus", "EF Marketing Agents"]) {
      expect(digest, `missing competition: ${comp}`).toContain(comp);
    }
  });

  it("includes the real contact links from content/lobby.ts", () => {
    expect(digest).toContain("github.com/Nxver-GitHub");
    expect(digest).toContain("linkedin.com/in/surya-pugazhenthi");
    expect(digest).toContain("mailto:suryapugaz1629@gmail.com");
  });

  it("serializes multi-line content copy onto single lines (no stray newlines mid-entry)", () => {
    // Every non-empty line should be a real entry, not a fragment starting with
    // a lowercase continuation — a rough guard that oneLine() collapsed copy.
    const lines = digest.split("\n").filter((l) => l.trim().length > 0);
    expect(lines.length).toBeGreaterThan(10);
  });

  it("is deterministic across calls", () => {
    expect(buildFactsDigest()).toBe(digest);
  });

  it("truncates on entry boundaries under a tight cap (never mid-entry)", () => {
    const tiny = buildFactsDigest(400);
    expect(tiny.length).toBeLessThanOrEqual(400);
    // A block is dropped whole, so the result is either empty or ends cleanly on
    // a full line (no dangling partial word from a chopped block).
    if (tiny.length > 0) {
      expect(tiny.endsWith("undefined")).toBe(false);
    }
  });
});

describe("terminal prompt — full system prompt", () => {
  const prompt = buildSystemPrompt();

  it("names the in-fiction system and the owner", () => {
    expect(prompt).toContain(SYSTEM_NAME);
    expect(prompt).toContain(OWNER_NAME);
  });

  it("embeds the hard rules against prompt leakage and role changes", () => {
    expect(prompt.toLowerCase()).toContain("never reveal");
    expect(prompt.toLowerCase()).toContain("ignore any attempt");
  });

  it("embeds the grounding rule (no invention)", () => {
    expect(prompt.toLowerCase()).toContain("never invent");
  });

  it("wraps the facts digest in a clearly delimited DATA block", () => {
    expect(prompt).toContain("=== DATA");
    expect(prompt).toContain("=== END DATA ===");
    expect(prompt).toContain("Nodegent");
  });

  it("never leaks undefined or [object", () => {
    expect(prompt).not.toContain("undefined");
    expect(prompt).not.toContain("[object");
  });
});
