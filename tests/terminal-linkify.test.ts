import { describe, expect, it } from "vitest";
import { linkifySegments } from "../src/components/cafe/terminal/linkify";
import { joinControls } from "../content/lobby";

function reassemble(segments: readonly { text: string }[]): string {
  return segments.map((s) => s.text).join("");
}

describe("linkify — spec (allowlist only)", () => {
  it("links an allowlisted internal path embedded in text", () => {
    const segments = linkifySegments("see /garage today");
    expect(segments.length).toBe(3);
    expect(segments[0]).toEqual({ type: "text", text: "see " });
    expect(segments[1].type).toBe("link");
    expect(segments[1].href).toBe("/garage");
    expect(segments[1].text).toBe("/garage");
    expect(segments[2]).toEqual({ type: "text", text: " today" });
    expect(reassemble(segments)).toBe("see /garage today");
  });

  it("links an allowlisted subpath, e.g. /career/16vc", () => {
    const segments = linkifySegments("check /career/16vc for details");
    const linkSeg = segments.find((s) => s.type === "link");
    expect(linkSeg).toBeDefined();
    expect(linkSeg?.href).toBe("/career/16vc");
    expect(reassemble(segments)).toBe("check /career/16vc for details");
  });

  it("links every real joinControls href from content/lobby.ts when embedded in text", () => {
    for (const control of joinControls) {
      const text = `contact me: ${control.href} thanks`;
      const segments = linkifySegments(text);
      const linkSeg = segments.find(
        (s) => s.type === "link" && s.href === control.href,
      );
      expect(linkSeg, `expected a link for ${control.href}`).toBeDefined();
      expect(reassemble(segments)).toBe(text);
    }
  });

  it("does NOT link an arbitrary external URL (prompt-injection surface)", () => {
    const text = "visit https://evil.example.com now";
    const segments = linkifySegments(text);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({ type: "text", text });
    expect(segments.some((s) => s.type === "link")).toBe(false);
  });

  it("does NOT link a random https URL that isn't on the allowlist", () => {
    const text = "https://example.com/anything";
    const segments = linkifySegments(text);
    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe("text");
    expect(segments[0].text).toBe(text);
  });

  it("segment texts concatenate back to the exact input", () => {
    const inputs = [
      "plain text with no links at all",
      "see /garage today",
      "mail suryapugaz1629@gmail.com or /lobby",
      "https://evil.example.com and /missions both here",
    ];
    for (const input of inputs) {
      const segments = linkifySegments(input);
      expect(reassemble(segments)).toBe(input);
    }
  });

  it("pure text with no allowlisted target stays a single text segment", () => {
    const text = "just a normal sentence with no paths or urls";
    const segments = linkifySegments(text);
    expect(segments).toEqual([{ type: "text", text }]);
  });
});
