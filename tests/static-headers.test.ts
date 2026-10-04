import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Parse Cloudflare's _headers format into { pattern: { header: value } }. */
function parseHeaders(text: string): Record<string, Record<string, string>> {
  const rules: Record<string, Record<string, string>> = {};
  let current: string | null = null;
  for (const line of text.split("\n")) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      current = line.trim();
      rules[current] = {};
    } else if (current) {
      const [name, ...rest] = line.trim().split(":");
      rules[current] = { ...rules[current], [name.trim().toLowerCase()]: rest.join(":").trim() };
    }
  }
  return rules;
}

describe("public/_headers", () => {
  const rules = parseHeaders(readFileSync(join(__dirname, "../public/_headers"), "utf8"));

  it("caches content-hashed build assets for a year, immutably", () => {
    expect(rules["/_next/static/*"]?.["cache-control"]).toBe(
      "public, max-age=31536000, immutable",
    );
  });

  it("never marks un-hashed paths immutable", () => {
    for (const [pattern, headers] of Object.entries(rules)) {
      if (headers["cache-control"]?.includes("immutable")) {
        expect(pattern).toBe("/_next/static/*");
      }
    }
  });
});
