import { expect, test, type Page } from "@playwright/test";
import { expectRendered, watchConsoleErrors } from "./helpers";

/**
 * The café terminal's "what's next?" teaser, rebranded Proximize → Citation
 * (2026-10). Answered entirely client-side, so it runs without the model.
 */
async function openTerminal(page: Page) {
  await page.goto("/cafe");
  await expectRendered(page);
  const opener = page.getByRole("button", { name: /^(Open )?terminal$/i }).first();
  await expect(opener).toBeVisible({ timeout: 30_000 });
  await opener.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await opener.click();
  const input = page.getByPlaceholder(/help · projects · contact/).first();
  await expect(input).toBeVisible({ timeout: 20_000 });
  const output = page.getByRole("log", { name: "Terminal output" }).first();
  await expect(output).toContainText(/CAFE-OS login/, { timeout: 15_000 });
  await input.press("Enter");
  return { input, output };
}

async function dismissTakeover(page: Page) {
  const ad = page.getByRole("dialog", { name: "Citation teaser advertisement" });
  await expect(ad).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(ad).toBeHidden();
}

test.describe("citation teaser", () => {
  test("'what's next?' plays the Citation advert and leaves a linked card", async ({ page }) => {
    const errors = watchConsoleErrors(page);
    const { input, output } = await openTerminal(page);

    await input.fill("what's next?");
    await input.press("Enter");
    await dismissTakeover(page);

    await expect(output).toContainText("CITATION — improving geo for the physical world.");
    await expect(output).toContainText(/Status: coming soon\./);
    await expect(output).not.toContainText(/proximize/i);

    const link = output.getByRole("link", { name: /citation\.so/ });
    await expect(link).toHaveAttribute("href", "https://citation.so");

    // The card's <img> is decorative; its description lives on the zoom button.
    await expect(output.getByRole("button", { name: /Enlarge image: Citation teaser poster/ })).toBeVisible();
    const poster = output.locator('img[src*="/terminal/citation/poster.webp"]');
    await expect
      .poll(() => poster.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
      .toBe(1085);
    expect(errors).toEqual([]);
  });

  test("the pre-rebrand name still reaches the teaser", async ({ page }) => {
    const { input, output } = await openTerminal(page);
    await input.fill("what is Proximize?");
    await input.press("Enter");
    await dismissTakeover(page);
    await expect(output).toContainText("CITATION — improving geo for the physical world.");
  });

  test.describe("with full motion", () => {
    test.use({ reducedMotion: "no-preference" });

    test("the advert cuts through the car and the Citation lockup", async ({ page }) => {
      const { input } = await openTerminal(page);
      await input.fill("what's next?");
      await input.press("Enter");
      const ad = page.getByRole("dialog", { name: "Citation teaser advertisement" });
      await expect(ad).toBeVisible();
      for (const [name, width] of [["car", 1070], ["lockup", 666]] as const) {
        const frame = ad.locator(`img[src*="/terminal/citation/${name}.webp"]`);
        await expect(frame, name).toBeVisible({ timeout: 20_000 });
        expect(await frame.evaluate((img: HTMLImageElement) => img.naturalWidth), name).toBe(width);
      }
      await expect(ad).toContainText("citation.so", { timeout: 20_000 });
      await expect(ad).not.toContainText(/proximize/i);
    });
  });

  test("ships the Citation assets and retires the Proximize ones", async ({ request }) => {
    for (const name of ["poster", "car", "lockup"]) {
      const fresh = await request.get(`/terminal/citation/${name}.webp`);
      expect(fresh.status(), name).toBe(200);
      expect(fresh.headers()["content-type"], name).toContain("image/webp");
      expect((await request.get(`/terminal/proximize/${name}.webp`)).status(), name).toBe(404);
    }
  });
});
