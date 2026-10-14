import { expect, test, type Page } from "@playwright/test";
import { expectRendered, watchConsoleErrors } from "./helpers";
import {
  MOBILE_ROUTES,
  horizontalOverflow,
  textUnderSoundBar,
  undersizedTargets,
  undersizedText,
} from "./mobile-audit";

/**
 * The mobile gate. Runs under the phone/tablet projects in playwright.config.ts
 * (375×667, iPhone 15 Pro portrait + landscape, iPad Mini portrait), so a
 * layout regression on any of those widths fails CI instead of shipping.
 */

/** Let hydration, fonts and the first layout pass settle before measuring. */
async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("load");
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.waitForTimeout(400);
}

test.describe("mobile layout audit", () => {
  for (const route of MOBILE_ROUTES) {
    test(`${route} fits, reads and taps`, async ({ page }) => {
      const errors = watchConsoleErrors(page);
      await page.goto(route);
      await expectRendered(page);
      await settle(page);

      expect.soft(await horizontalOverflow(page), "horizontal page overflow (px)").toBe(0);
      expect.soft(await undersizedTargets(page), "interactive targets under 24×24px").toEqual([]);
      expect.soft(await undersizedText(page), "visible text under 12px").toEqual([]);
      expect.soft(await textUnderSoundBar(page), "text hidden under the music bar").toEqual([]);
      expect(errors).toEqual([]);
    });
  }
});

test.describe("mobile focused regressions", () => {
  test("café terminal input is never under the music bar", async ({ page }) => {
    await page.goto("/cafe");
    await expectRendered(page);
    const opener = page.getByRole("button", { name: /^(Open )?terminal$/i }).first();
    await expect(opener).toBeVisible({ timeout: 30_000 });
    await opener.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await opener.click();
    const input = page.getByPlaceholder(/help · projects · contact/).first();
    await expect(input).toBeVisible({ timeout: 20_000 });

    const bar = page.locator(".sound-bar");
    const overlay = page.locator("[data-fullscreen-overlay]");
    if ((await overlay.count()) > 0) {
      // Phones: the terminal is a full-screen overlay and the bar steps aside
      // for exactly as long as it is open.
      await expect(bar).toBeHidden();
      await page.keyboard.press("Escape");
      await expect(overlay).toHaveCount(0);
      await expect(bar).toBeVisible();
      return;
    }

    // Wider screens dock the terminal in the page: the bar must not cover it.
    const overlap = await page.evaluate(() => {
      const field = document.querySelector<HTMLElement>("input[placeholder*='help']");
      const bar = document.querySelector<HTMLElement>(".sound-bar");
      if (!field) return "no input";
      if (!bar) return "no music bar";
      const a = field.getBoundingClientRect();
      const b = bar.getBoundingClientRect();
      // The input wins only if it is painted above the bar where they meet.
      const hit = document.elementFromPoint(a.left + a.width / 2, a.top + a.height / 2);
      if (hit && !field.contains(hit) && bar.contains(hit)) return "bar covers input";
      return Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    });
    expect(overlap).toBe(0);
  });

  test("320px header: mark, back lozenge and OPTIONS do not overlap", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "phone-375", "pins its own 320px viewport; one project is enough");
    await page.setViewportSize({ width: 320, height: 640 });
    for (const route of ["/career", "/career/16vc", "/garage/nodegent", "/special-stage/reason-codes", "/lobby"]) {
      await page.goto(route);
      await expectRendered(page);
      await settle(page);
      const clash = await page.evaluate(() => {
        const header = document.querySelector(".console-page > header");
        const options = document.querySelector(".console-options");
        if (!header || !options) return "missing header or options";
        const o = options.getBoundingClientRect();
        for (const el of Array.from(header.querySelectorAll(".gt-mark, a.lozenge"))) {
          const r = el.getBoundingClientRect();
          const xs = Math.min(r.right, o.right) - Math.max(r.left, o.left);
          const ys = Math.min(r.bottom, o.bottom) - Math.max(r.top, o.top);
          if (xs > 0 && ys > 0) return `${el.className} overlaps OPTIONS`;
          if (r.right > window.innerWidth) return `${el.className} runs off-screen`;
        }
        return "";
      });
      expect(clash, route).toBe("");
    }
  });

  test("career season tabs stack on a phone", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "phone-375", "pins its own 375px viewport; one project is enough");
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/career");
    await expectRendered(page);
    const tabs = page.getByRole("navigation", { name: "Seasons" }).getByRole("button");
    const boxes = await tabs.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
    expect(boxes.length).toBeGreaterThan(1);
    for (let i = 1; i < boxes.length; i += 1) {
      expect(boxes[i].top, `tab ${i} sits below tab ${i - 1}`).toBeGreaterThanOrEqual(boxes[i - 1].bottom - 1);
    }
  });

  test("Scapes opens on Cars, and the map counts every pavilion open", async ({ page }) => {
    await page.goto("/scapes");
    await expectRendered(page);
    await expect(page.getByRole("tab", { selected: true })).toHaveText(/cars/i);

    await page.goto("/");
    await expectRendered(page);
    await expect(page.getByLabel("Portfolio totals")).toContainText(/8\/8\s*Open/i);
    // Phones list it in the directory, tablets as a map node: a link either way.
    await expect(page.locator("a[href='/scapes']:visible").first()).toBeVisible();
  });
});
