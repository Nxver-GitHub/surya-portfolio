import { describe, expect, it } from "vitest";
import { isAutomatedVisitor } from "../src/lib/agent-visitor";

const CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

describe("isAutomatedVisitor", () => {
  it("treats a normal browser as a person", () => {
    expect(isAutomatedVisitor({ webdriver: false, userAgent: CHROME })).toBe(false);
  });

  it("detects WebDriver/CDP automation", () => {
    expect(isAutomatedVisitor({ webdriver: true, userAgent: CHROME })).toBe(true);
  });

  it.each([
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)",
    "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
    "Mozilla/5.0 (compatible; PerplexityBot/1.0)",
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/141.0.0.0 Safari/537.36",
    "Mozilla/5.0 (compatible; GrokBot/1.0)",
  ])("detects agent user agent %s", (userAgent) => {
    expect(isAutomatedVisitor({ webdriver: false, userAgent })).toBe(true);
  });
});
