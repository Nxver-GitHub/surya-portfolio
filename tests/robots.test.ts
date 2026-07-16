import { describe, expect, it } from "vitest";
import { SITE_URL } from "../src/lib/site";
import robots from "../src/app/robots";

describe("robots", () => {
  const result = robots();

  it("allows crawling of everything by default", () => {
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules?.allow).toBe("/");
  });

  it("disallows the API routes", () => {
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules?.disallow).toBe("/api/");
  });

  it("points at the sitemap under SITE_URL", () => {
    expect(result.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
});
