import { describe, expect, it } from "vitest";
import { allEventSlugs } from "../content/career";
import { KNOWN_ROUTES } from "../src/lib/routes";
import { SITE_URL } from "../src/lib/site";
import sitemap from "../src/app/sitemap";

describe("sitemap", () => {
  const entries = sitemap();
  const urls = entries.map((e) => e.url);

  it("includes every known pavilion/home route", () => {
    for (const route of KNOWN_ROUTES) {
      expect(urls).toContain(`${SITE_URL}${route}`);
    }
  });

  it("includes every career event slug", () => {
    expect(allEventSlugs.length).toBeGreaterThan(0);
    for (const slug of allEventSlugs) {
      expect(urls).toContain(`${SITE_URL}/career/${slug}`);
    }
  });

  it("uses only absolute URLs built from SITE_URL", () => {
    for (const url of urls) {
      expect(url.startsWith(SITE_URL)).toBe(true);
    }
  });

  it("has no duplicate URLs", () => {
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("gives the home route the highest priority", () => {
    const home = entries.find((e) => e.url === SITE_URL || e.url === `${SITE_URL}/`);
    expect(home?.priority).toBe(1);
  });
});
