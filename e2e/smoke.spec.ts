import { expect, test } from "@playwright/test";
import { PAVILION_ROUTES, expectRendered, watchConsoleErrors } from "./helpers";

/**
 * Every pavilion answers 200, renders its own heading, and logs no console
 * errors. This is the floor: a broken import or a content id that stops
 * resolving usually surfaces here first.
 */
for (const route of PAVILION_ROUTES) {
  test(`${route} renders clean`, async ({ page }) => {
    const errors = watchConsoleErrors(page);
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expectRendered(page);
    await expect(page.locator("h1").first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("security headers ship on every HTML response", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["strict-transport-security"]).toContain("max-age=");
});

test("robots and sitemap are served", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("/garage");
});
