import { expect, test } from "@playwright/test";
import { expectRendered, watchConsoleErrors } from "./helpers";

test.describe("career mode", () => {
  test("a season lists events and an event opens its own page", async ({ page }) => {
    const errors = watchConsoleErrors(page);
    await page.goto("/career");
    await expectRendered(page);
    await expect(page.getByRole("navigation", { name: "Seasons" })).toBeVisible();

    const event = page.locator('a[href^="/career/"]').first();
    const href = await event.getAttribute("href");
    await event.click();
    await expect(page).toHaveURL(new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    await expectRendered(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("a locked event has no page", async ({ request }) => {
    const response = await request.get("/career/project-silhouette");
    expect(response.status()).toBe(404);
  });
});

test.describe("gt café terminal", () => {
  test("local commands answer without the model", async ({ page }) => {
    await page.goto("/cafe");
    await expectRendered(page);

    // The terminal mounts once the CRT has focus: the "Terminal" lozenge
    // (WebGL room, once the glb is in) or the no-WebGL "Open terminal"
    // fallback both route there. The control row sits below the fold under
    // the fixed music bar, so centre it before clicking or the bar intercepts.
    const opener = page
      .getByRole("button", { name: /^(Open )?terminal$/i })
      .first();
    await expect(opener).toBeVisible({ timeout: 30_000 });
    await opener.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await opener.click();
    const input = page.getByPlaceholder(/help · projects · contact/).first();
    await expect(input).toBeVisible({ timeout: 20_000 });
    const output = page.getByRole("log", { name: "Terminal output" }).first();

    // Cold boot ends at a login prompt; Enter logs in as guest.
    await expect(output).toContainText(/CAFE-OS login/, { timeout: 15_000 });
    await input.press("Enter");

    await input.fill("help");
    await input.press("Enter");
    await expect(output).toContainText(/contact\s+how to reach Surya/, { timeout: 10_000 });

    await input.fill("contact");
    await input.press("Enter");
    await expect(output).toContainText(/REACH SURYA/);
    await expect(output).toContainText(/github\.com\/Nxver-GitHub/);
  });
});
