import { expect, test } from "@playwright/test";
import { expectRendered, watchConsoleErrors } from "./helpers";

test.describe("garage", () => {
  test("lists the cars and shows the spec sheet for the selected one", async ({ page }) => {
    const errors = watchConsoleErrors(page);
    await page.goto("/garage?car=calendarize");
    await expectRendered(page);

    const list = page.getByRole("navigation", { name: "Cars" });
    expect(await list.getByRole("button").count()).toBeGreaterThanOrEqual(5);
    await expect(list.getByRole("button", { name: /Calendarize/ })).toHaveAttribute("aria-current", "true");

    const sheet = page.getByRole("complementary", { name: /Calendarize spec sheet/ });
    await expect(sheet).toContainText(/Lancia Delta/);
    expect(errors).toEqual([]);
  });

  test("a hero car mounts a WebGL canvas and credits its model", async ({ page }) => {
    await page.goto("/garage?car=nodegent");
    await expectRendered(page);
    const scene = page.getByRole("region", { name: /Nodegent in the garage/ });
    await expect(scene.locator("canvas")).toHaveCount(1, { timeout: 20_000 });
    await expect(scene.getByRole("link", { name: /CC BY 4.0/ })).toHaveAttribute(
      "href",
      /creativecommons\.org/,
    );
  });

  test("selecting another car updates the URL and the sheet", async ({ page }) => {
    await page.goto("/garage?car=nodegent");
    await expectRendered(page);
    await page.getByRole("navigation", { name: "Cars" }).getByRole("button", { name: /TripWeaver/ }).click();
    await expect(page).toHaveURL(/car=tripweaver/);
    await expect(page.getByRole("complementary", { name: /TripWeaver spec sheet/ })).toBeVisible();
  });

  test("a silhouette car shows its coming-soon bay, not a crash", async ({ page }) => {
    const errors = watchConsoleErrors(page);
    await page.goto("/garage?car=clientsight");
    await expectRendered(page);
    await expect(page.getByRole("region", { name: /ClientSight in the garage/ })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
