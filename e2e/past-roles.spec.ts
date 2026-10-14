import { expect, test } from "@playwright/test";
import { expectRendered, watchConsoleErrors } from "./helpers";

/**
 * Wrapped stints (2026-10): 16VC Jun – Oct 2026, LvlUp Ventures Feb – May
 * 2026, Venture Starters 2026. None may read as current on any surface.
 */
const STINTS = [
  { slug: "16vc", dates: "Jun – Oct 2026", lede: "served as Venture Associate at 16VC (Jun – Oct 2026)." },
  {
    slug: "lvlup-ventures",
    dates: "Feb – May 2026",
    lede: "served as Venture Scout at LvlUp Ventures (Shopline-backed seed fund), Feb – May 2026.",
  },
  { slug: "venture-starters", dates: "2026", lede: "served as Venture Analyst Intern at Venture Starters (2026)." },
] as const;

test.describe("wrapped stints", () => {
  for (const stint of STINTS) {
    test(`${stint.slug} reads as a past role`, async ({ page }) => {
      const errors = watchConsoleErrors(page);
      await page.goto(`/career/${stint.slug}`);
      await expectRendered(page);
      const main = page.getByRole("main");
      await expect(main).toContainText(stint.lede);
      await expect(main).toContainText(stint.dates);
      await expect(main).not.toContainText(/Present|serves as/);
      expect(errors).toEqual([]);
    });

    test(`${stint.slug} markdown twin matches`, async ({ request }) => {
      const res = await request.get(`/career/${stint.slug}.md`);
      expect(res.status()).toBe(200);
      const body = await res.text();
      expect(body).toContain(stint.lede);
      // Season 3 itself is still "2026 – Present" (Project Silhouette runs on);
      // only the stint must not read as current.
      expect(body).not.toMatch(/2026 – Present\)\.|serves as/);
      expect(body).not.toMatch(/(Jan|Feb|Jun) 2026 – Present/);
    });
  }

  test("the lobby marks 16VC former and nothing active", async ({ page }) => {
    await page.goto("/lobby");
    await expectRendered(page);
    const card = page.getByRole("listitem").filter({ hasText: "Venture firm where Surya previously sourced" });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText(/Former/i);
    await expect(card).toContainText("previously sourced");
    await expect(page.getByText(/^Active$/i)).toHaveCount(0);
    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(description).toBe(
      "Contact Surya Pugazhenthi — email, book a call, GitHub, LinkedIn, and X — and see the communities on his journey, from 16VC back through UCSC and DVC.",
    );
  });

  test("the license center dates the 16VC test", async ({ page }) => {
    await page.goto("/license-center");
    await expectRendered(page);
    // Test summaries are carried as the trophy tile's tooltip (title attribute).
    await expect(
      page.locator('[title^="As a Venture Associate at 16VC (Jun – Oct 2026), sourced"]'),
    ).toHaveCount(1);
  });

  test("llms-full.txt carries no current roles", async ({ request }) => {
    const body = await (await request.get("/llms-full.txt")).text();
    for (const stint of STINTS) expect(body, stint.slug).toContain(stint.lede);
    expect(body).not.toMatch(/Jun 2026 – Present|Feb 2026 – Present|Jan 2026 – Present/);
  });

  test("the home OG card drops the 16VC tagline", async ({ page, request }) => {
    await page.goto("/");
    const alt = await page.locator('meta[property="og:image:alt"]').first().getAttribute("content");
    expect(alt).toBe("Surya Pugazhenthi — Product Builder, CS Alum @ UCSC");
    const src = await page.locator('meta[property="og:image"]').first().getAttribute("content");
    const img = await request.get(new URL(src!).pathname + new URL(src!).search);
    expect(img.status()).toBe(200);
    expect(img.headers()["content-type"]).toContain("image/png");
  });

  test("the résumé PDF is served", async ({ request }) => {
    const res = await request.get("/resume/Surya_Pugazhenthi_Resume.pdf");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/pdf");
  });
});
