import { describe, expect, it } from "vitest";
import nextConfig, { SECURITY_HEADERS } from "../next.config";

function headerValue(key: string): string | undefined {
  return SECURITY_HEADERS.find((h) => h.key === key)?.value;
}

describe("security headers", () => {
  it("applies every header to every route", async () => {
    const rules = await nextConfig.headers!();
    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe("/(.*)");
    expect(rules[0].headers).toEqual(SECURITY_HEADERS);
  });

  it("keeps the headers that survived the Cloudflare migration", () => {
    expect(headerValue("X-Content-Type-Options")).toBe("nosniff");
    expect(headerValue("X-Frame-Options")).toBe("DENY");
    expect(headerValue("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headerValue("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=()",
    );
    expect(headerValue("Content-Security-Policy")).toContain(
      "default-src 'self'",
    );
    expect(headerValue("Content-Security-Policy")).toContain(
      "frame-ancestors 'none'",
    );
  });

  /**
   * Vercel injected HSTS automatically; Cloudflare does not, so the migration
   * dropped it silently. Two years, subdomains included.
   */
  it("sends HSTS with a two-year max-age and includeSubDomains", () => {
    expect(headerValue("Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains",
    );
  });

  /**
   * `preload` is a ONE-WAY DOOR: entering the browser preload list takes months
   * to undo and ships with browser releases. The owner has not opted in, so
   * this assertion is the gate — do not "fix" it by adding the directive.
   */
  it("does NOT opt into the browser preload list", () => {
    expect(headerValue("Strict-Transport-Security")).not.toContain("preload");
  });
});
