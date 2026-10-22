import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import nextConfig, { SECURITY_HEADERS } from "../next.config";

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

  const appHeader = (key: string) => SECURITY_HEADERS.find((h) => h.key === key)?.value;

  it("gives every static asset the same baseline headers the app sends on HTML", () => {
    const all = rules["/*"];
    for (const key of [
      "X-Content-Type-Options",
      "Referrer-Policy",
      "X-Frame-Options",
      "Permissions-Policy",
      "X-DNS-Prefetch-Control",
    ]) {
      expect(all?.[key.toLowerCase()], key).toBe(appHeader(key));
    }
  });

  it("never puts a CSP on /* (it would be merged into, not replace, other rules)", () => {
    expect(rules["/*"]?.["content-security-policy"]).toBeUndefined();
  });

  it("locks directly opened SVG documents down with a no-script CSP", () => {
    const csp = rules["/*.svg"]?.["content-security-policy"] ?? "";
    expect(csp).toContain("default-src 'none'");
    expect(csp).not.toContain("script-src");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("leaves HSTS to the edge (no duplicate header on assets)", () => {
    for (const headers of Object.values(rules)) {
      expect(headers["strict-transport-security"]).toBeUndefined();
    }
  });

  it("disables the X-Powered-By (and OpenNext's X-OpenNext) fingerprint", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
