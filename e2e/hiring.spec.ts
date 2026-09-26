import { expect, test } from "@playwright/test";
import { expectRendered } from "./helpers";

/**
 * The hiring-manager path: résumé from the License Center and the Lobby,
 * and the Lobby's contact plates. The email plate must have NO address in
 * server-rendered markup and a real mailto after hydration.
 */
test.describe("driver profile résumé", () => {
  test("License Center offers a downloadable one-page PDF", async ({ page, request }) => {
    await page.goto("/license-center");
    await expectRendered(page);
    const profile = page.getByRole("region", { name: /Driver Profile/ });
    await expect(profile).toBeVisible();

    const download = profile.getByRole("link", { name: /Download résumé/i });
    const href = await download.getAttribute("href");
    expect(href).toMatch(/\.pdf$/);
    await expect(download).toHaveAttribute("download", /\.pdf$/);

    const pdf = await request.get(href!);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");
    const body = await pdf.body();
    expect(body.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  test("Lobby résumé plate points at the same PDF", async ({ page }) => {
    await page.goto("/lobby");
    await expectRendered(page);
    const plate = page.getByRole("link", { name: /Download Résumé/i });
    await expect(plate).toHaveAttribute("href", /\/resume\/.*\.pdf$/);
  });
});

test.describe("lobby contact plates", () => {
  test("email is absent from static HTML and present after hydration", async ({ page, request }) => {
    const raw = await (await request.get("/lobby")).text();
    expect(raw).not.toMatch(/mailto:[^"']+@/);
    expect(raw).not.toContain("@gmail.com");

    await page.goto("/lobby");
    await expectRendered(page);
    const email = page.getByRole("link", { name: /^Email/ });
    await expect(email).toHaveAttribute("href", /^mailto:.+@.+\..+$/);
  });

  test("external plates open in a new tab with safe rel", async ({ page }) => {
    await page.goto("/lobby");
    await expectRendered(page);
    for (const name of [/GitHub/, /LinkedIn/, /Book a call/]) {
      const link = page.getByRole("link", { name });
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
      await expect(link).toHaveAttribute("href", /^https:\/\//);
    }
  });
});
