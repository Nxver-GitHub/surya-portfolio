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

/**
 * Refuse WebGL contexts so the 3D scenes fall back to their 2D bays. The
 * layout checks only need the scene's box, and booting the café or a garage
 * car under CI's software GL starves the parallel touch.spec gesture tests.
 */
async function withoutWebGL(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: any[]) {
      if (type.startsWith("webgl") || type === "experimental-webgl") return null;
      return original.call(this, type as "2d", ...rest);
    } as typeof original;
  });
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
    test.slow(); // the 3D café boots slowly under CI's software GL
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

  test("garage: viewer first, picker strip below, taps change what is on screen", async ({ page }, testInfo) => {
    test.skip(!["phone-375", "ipad-mini"].includes(testInfo.project.name), "phone + portrait tablet");
    test.slow();
    await withoutWebGL(page); // layout only: keep SwiftShader free for touch.spec
    await page.goto("/garage?car=nodegent");
    await expectRendered(page);
    const nav = page.getByRole("navigation", { name: "Cars" });
    const viewer = page.getByRole("region", { name: /in the garage$/ });
    await expect.poll(() => nav.getByRole("button").count()).toBeGreaterThanOrEqual(5);
    await settle(page);

    const viewerBox = await viewer.boundingBox();
    const navBox = await nav.boundingBox();
    expect(viewerBox && navBox, "viewer and picker render").toBeTruthy();
    expect(viewerBox!.y + viewerBox!.height, "viewer sits above the picker").toBeLessThanOrEqual(navBox!.y + 1);

    // One horizontal strip that scrolls itself, never the page.
    const strip = await nav.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(strip.scroll, "strip has more plates than fit").toBeGreaterThan(strip.client);
    await nav.evaluate((el) => el.scrollTo({ left: 200 }));
    await expect.poll(() => nav.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    expect(await horizontalOverflow(page), "page overflow (px)").toBe(0);

    await nav.getByRole("button", { name: /TripWeaver/ }).tap();
    await expect(page).toHaveURL(/car=tripweaver/);
    await expect(
      page.getByRole("complementary", { name: /TripWeaver spec sheet/ }).getByRole("heading", { level: 2 }),
    ).toHaveText(/TripWeaver/i);
    await expect(nav.getByRole("button", { name: /TripWeaver/ })).toHaveAttribute("aria-current", "true");

    // The scene the tap changed is still (mostly) on screen.
    const visible = await page.getByRole("region", { name: /TripWeaver in the garage/ }).evaluate((el) => {
      const r = el.getBoundingClientRect();
      const shown = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      return shown / r.height;
    });
    expect(visible, "share of the viewer in the viewport").toBeGreaterThanOrEqual(0.5);
  });

  test("café: picking a Menu Book changes the detail in view", async ({ page }, testInfo) => {
    test.skip(!["phone-375", "ipad-mini"].includes(testInfo.project.name), "phone + portrait tablet");
    test.slow();
    await withoutWebGL(page); // layout only: keep SwiftShader free for touch.spec
    await page.goto("/cafe");
    await expectRendered(page);
    const books = page.getByRole("tablist", { name: "Menu Books" });
    await expect(books).toHaveAttribute("aria-orientation", "horizontal");
    const target = books.getByRole("tab", { name: /Venture Table/ });
    await target.tap();
    await expect(target).toHaveAttribute("aria-selected", "true");

    const heading = page.getByRole("tabpanel").getByRole("heading", { level: 2 });
    await expect(heading).toHaveText(/Venture Table/i);
    // The visitor never scrolls: the new title is on screen, above the deck bar.
    await expect.poll(() =>
      heading.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= window.innerHeight - 46;
      }),
    ).toBe(true);
    expect(await horizontalOverflow(page), "page overflow (px)").toBe(0);
  });

  test("license center: trophy summaries are visible text", async ({ page }) => {
    await page.goto("/license-center");
    await expectRendered(page);
    for (const summary of [
      /^As a Venture Scout at LvlUp Ventures, ran founder outreach/,
      /^As a Venture Associate at 16VC \(Jun – Oct 2026\), sourced/,
    ]) {
      const line = page.getByText(summary);
      await line.scrollIntoViewIfNeeded();
      await expect(line).toBeVisible();
    }
    await expect(page.locator(".trophy-wall li[title]")).toHaveCount(0);
  });

  test("lobby: org cards carry their logos, live rows keep the glyph", async ({ page }) => {
    await page.goto("/lobby");
    await expectRendered(page);
    const logos = page.locator(".badge-face img[src*='logos']");
    await expect.poll(() => logos.count()).toBeGreaterThanOrEqual(6);
    for (const img of await logos.all()) {
      await expect(img).toHaveAttribute("alt", "");
    }
    // Live visitor rows (when the presence socket reaches anyone) stay glyphs:
    // no live row may carry an org logo.
    const liveRows = page.locator(".badge-face:has-text('R')");
    await expect(liveRows.locator("img")).toHaveCount(0);
  });

  test("phone landscape: compact header, map on the first screen", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone-15-pro-landscape", "short-screen layout");
    await page.goto("/");
    await expectRendered(page);
    await settle(page);
    const title = await page.locator("h1.gt-title").boundingBox();
    expect(title!.height, "home title height").toBeLessThanOrEqual(44);
    const map = await page.locator(".world-map-landscape").boundingBox();
    const vh = page.viewportSize()!.height;
    expect(map!.y, "map top inside the first viewport").toBeLessThan(vh - 46);
    const card = await page.locator(".driver-selector").boundingBox();
    expect(card!.height, "driver chip is one line").toBeLessThanOrEqual(52);

    await page.goto("/garage");
    await expectRendered(page);
    await settle(page);
    const pageTitle = await page.locator("h1.gt-title").boundingBox();
    expect(pageTitle!.height, "interior title height").toBeLessThanOrEqual(44);
  });

  test.describe("iPad landscape", () => {
    test.use({ viewport: { width: 1080, height: 810 }, isMobile: true, hasTouch: true });

    test("home map and its ENTER strip fit above the music bar", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "ipad-mini", "one tablet project is enough");
      await page.goto("/");
      await expectRendered(page);
      await settle(page);
      const vh = page.viewportSize()!.height;
      const map = await page.locator(".world-map-landscape").boundingBox();
      const enter = await page.locator(".map-information").boundingBox();
      expect(map!.y, "map top on screen").toBeGreaterThanOrEqual(0);
      expect(enter!.y + enter!.height, "ENTER strip bottom").toBeLessThanOrEqual(vh - 46);
      expect(await horizontalOverflow(page), "page overflow (px)").toBe(0);
    });
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
