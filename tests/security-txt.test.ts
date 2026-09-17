import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * public/.well-known/security.txt (RFC 9116). There is no route handler to
 * unit test — Next serves everything under public/ verbatim as a static file
 * (see next.config.ts: the only headers() rule is the catch-all security
 * headers, which layers on top of static files without replacing them, and
 * there are no redirects/rewrites that touch /.well-known/*). So this test
 * reads the file straight off disk and asserts its RFC 9116 shape instead.
 */
const SECURITY_TXT_PATH = join(
  process.cwd(),
  "public/.well-known/security.txt",
);

function parseFields(contents: string): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    (fields[key] ??= []).push(value);
  }
  return fields;
}

describe("public/.well-known/security.txt", () => {
  const contents = readFileSync(SECURITY_TXT_PATH, "utf8");
  const fields = parseFields(contents);

  it("has an https Contact field", () => {
    expect(fields.Contact?.[0]).toMatch(/^https:\/\//);
  });

  /**
   * Deliberately time-bomb: this assertion is meant to start FAILING once
   * Expires passes, so CI catches a stale security.txt instead of it silently
   * lapsing. When this test starts failing, bump Expires in security.txt (and
   * its `# Bump Expires...` comment line) to a new future date — do not loosen
   * this assertion instead.
   */
  it("has an Expires field in the future, as a valid ISO 8601 timestamp", () => {
    const expires = fields.Expires?.[0];
    expect(expires).toBeTruthy();
    const parsed = new Date(expires as string);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
    expect(parsed.getTime()).toBeGreaterThan(Date.now());
  });

  it("tolerates RFC 9116 '#' comment lines (e.g. the Expires reminder) without parsing them as fields", () => {
    expect(
      contents.split("\n").some((line) => line.trim().startsWith("#")),
    ).toBe(true);
    // Exactly the four real fields — a comment line must never be picked up
    // as (or merged into) a field itself.
    expect(Object.keys(fields).sort()).toEqual(
      ["Canonical", "Contact", "Expires", "Preferred-Languages"].sort(),
    );
  });

  it("declares English as a preferred language", () => {
    expect(fields["Preferred-Languages"]?.[0]).toBe("en");
  });

  it("has a Canonical field matching the file's own published URL", () => {
    expect(fields.Canonical?.[0]).toBe(
      "https://suryapugaz.com/.well-known/security.txt",
    );
  });
});
