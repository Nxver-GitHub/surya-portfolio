import { describe, expect, it } from "vitest";
import { SITE_URL } from "../src/lib/site";
import robots from "../src/app/robots";
import { AI_CRAWLERS } from "../src/lib/crawlers";

describe("robots", () => {
  const result = robots();

  it("allows crawling of everything by default", () => {
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules?.allow).toBe("/");
  });

  it("disallows the API routes and the internal markdown tree", () => {
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules?.disallow).toEqual(["/api/", "/md/"]);
  });

  it("names every AI crawler explicitly, allowed with /api/ still disallowed", () => {
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    for (const bot of AI_CRAWLERS) {
      const rule = rules.find((r) =>
        Array.isArray(r.userAgent) ? r.userAgent.includes(bot) : r.userAgent === bot,
      );
      expect(rule, bot).toBeDefined();
      expect(rule?.allow).toBe("/");
      expect(rule?.disallow).toEqual(["/api/", "/md/"]);
    }
    expect(AI_CRAWLERS).toContain("GPTBot");
    expect(AI_CRAWLERS).toContain("ClaudeBot");
    expect(AI_CRAWLERS).toContain("OAI-SearchBot");
  });

  it("every rule keeps the API routes disallowed", () => {
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    for (const rule of rules) expect(rule.disallow).toContain("/api/");
  });

  it("points at the sitemap under SITE_URL", () => {
    expect(result.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
});
