import { expect, test } from "@playwright/test";
import { expectRendered, watchConsoleErrors } from "./helpers";

test.describe("world map", () => {
  test("lists every destination and enters the Garage", async ({ page }) => {
    const errors = watchConsoleErrors(page);
    await page.goto("/");
    await expectRendered(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/World Map/);

    // Desktop shows the circuit nodes; phones show the directory. Either way
    // every pavilion is reachable by link.
    const links = page.locator('a[href="/garage"]');
    await expect(links.first()).toBeVisible();

    await links.first().click();
    await expect(page).toHaveURL(/\/garage/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Garage/);
    expect(errors).toEqual([]);
  });

  test("keyboard reaches a destination link", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard traversal is a desktop contract");
    await page.goto("/");
    await expectRendered(page);
    // Tab until focus lands on a pavilion link; the map must be reachable
    // without a pointer.
    let reached = false;
    for (let i = 0; i < 25 && !reached; i += 1) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(() => {
        const el = document.activeElement as HTMLAnchorElement | null;
        return !!el && el.tagName === "A" && /^\/(garage|career|cafe|lobby|missions|scapes|license-center|special-stage)/.test(el.getAttribute("href") ?? "");
      });
    }
    expect(reached).toBe(true);
  });
});

test.describe("boot intro gate", () => {
  test.use({ reducedMotion: "no-preference" });

  test("holds on PRESS START until input, then once per session", async ({ page }) => {
    await page.goto("/");
    const dialog = page.getByRole("dialog", { name: /portfolio introduction/ });
    await expect(dialog).toBeVisible();

    // Pointer input during the logo/montage jumps to the title screen (GT2
    // behaviour) — keyboard is avoided here because the native modal focuses
    // its Skip button first, and Enter would activate that instead.
    const box = (await dialog.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(dialog).toContainText(/press start/i, { timeout: 15_000 });

    // The title is a real gate: the PRESS START control passes it.
    await dialog.getByRole("button", { name: /press start/i }).click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });

    const seen = await page.evaluate(() => sessionStorage.getItem("sr-boot-seen"));
    expect(seen).toBe("1");

    await page.reload();
    await expect(page.getByRole("dialog", { name: /portfolio introduction/ })).toHaveCount(0);
  });
});
