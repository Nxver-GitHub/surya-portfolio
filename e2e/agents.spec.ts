import { expect, test } from "@playwright/test";
import { expectRendered, watchConsoleErrors } from "./helpers";

/**
 * The agent-facing surface: per-project pages, markdown twins, llms.txt, and
 * browser-driving agents landing on content instead of the boot intro.
 */
test.describe("project spec-sheet pages", () => {
  test("render server-side with the project as the heading", async ({ page }) => {
    const errors = watchConsoleErrors(page);
    await page.goto("/garage/nodegent");
    await expectRendered(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nodegent");
    await expect(page.getByText(/Built by Surya Pugazhenthi/)).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);

    await page.getByRole("link", { name: /Inspect in 3D/ }).click();
    await expect(page).toHaveURL(/\/garage\?car=nodegent/);
    expect(errors).toEqual([]);
  });

  test("the 3D browser links each car to its page", async ({ page }) => {
    await page.goto("/garage?car=tripweaver");
    await expectRendered(page);
    const link = page.getByRole("link", { name: "Full spec sheet" });
    await expect(link).toHaveAttribute("href", "/garage/tripweaver");
  });

  test("a silhouette car's page says it is in development", async ({ page }) => {
    await page.goto("/garage/clientsight");
    await expect(page.getByText("In development", { exact: true })).toBeVisible();
  });

  test("the locked project has no page", async ({ request }) => {
    expect((await request.get("/garage/stealth")).status()).toBe(404);
    expect((await request.get("/garage/stealth.md")).status()).toBe(404);
    expect((await request.get("/api/beacon.md")).status()).toBe(404);
  });
});

test.describe("machine-readable documents", () => {
  test("llms.txt and a markdown twin are served as text", async ({ request }) => {
    const llms = await request.get("/llms.txt");
    expect(llms.status()).toBe(200);
    expect(await llms.text()).toContain("# Surya Pugazhenthi");

    const md = await request.get("/garage/nodegent.md");
    expect(md.status()).toBe(200);
    expect(md.headers()["content-type"]).toContain("text/markdown");
    expect(md.headers()["link"]).toContain('/garage/nodegent>; rel="canonical"');
    expect(await md.text()).toMatch(/^# Nodegent/);
  });
});

test.describe("browser-driving agents", () => {
  // Motion allowed, so the only thing that can skip the intro is agent detection.
  test.use({ reducedMotion: "no-preference" });

  test("land on the World Map with no intro gate", async ({ page }) => {
    await page.goto("/");
    await expectRendered(page);
    await expect(page.locator('a[href="/garage"]').first()).toBeVisible();
    await expect(page.getByRole("dialog", { name: /portfolio introduction/ })).toHaveCount(0);
  });
});
