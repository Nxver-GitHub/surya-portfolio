import { devices, expect, test, type Locator, type Page } from "@playwright/test";
import { expectRendered } from "./helpers";

/**
 * Touch behaviour on phones and tablets: 3D canvases scroll the page on a
 * vertical swipe and still orbit on a horizontal drag; hint copy follows the
 * pointer type (an iPad gets touch wording, not keyboard wording); the boot
 * intro's "Tap to skip" is literally true.
 *
 * Gestures go through CDP `Input.dispatchTouchEvent`, i.e. the browser's real
 * input pipeline — so `touch-action`, scrolling and pointercancel all behave
 * as they would under a finger, which `element.dispatchEvent` would bypass.
 * Chromium-only by design (the suite runs Chromium); `defaultBrowserType` is
 * stripped from the WebKit device descriptors so they apply to Chromium.
 */

function device(name: "iPhone 15 Pro" | "iPad Mini") {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- stripped on purpose
  const { defaultBrowserType, ...rest } = devices[name];
  return rest;
}

interface Point {
  x: number;
  y: number;
}

/** One finger (or several, for a pinch) dragged in straight lines. */
async function touchGesture(page: Page, paths: ReadonlyArray<readonly [Point, Point]>, steps = 14) {
  const cdp = await page.context().newCDPSession(page);
  const at = (t: number) =>
    paths.map(([from, to], id) => ({
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
      id,
    }));
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: at(0) });
  for (let i = 1; i <= steps; i += 1) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: at(i / steps) });
    await page.waitForTimeout(16);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

async function centreOf(locator: Locator): Promise<Point> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("element has no box");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Wait until the scene stops changing (model streamed in, first frames
 * settled) and return that frame. Reduced motion (the suite default) freezes
 * every idle spin, so a still scene is reachable. */
async function settledFrame(scene: Locator): Promise<Buffer> {
  let previous = await scene.screenshot();
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    await scene.page().waitForTimeout(600);
    const next = await scene.screenshot();
    if (next.equals(previous)) return next;
    previous = next;
  }
  throw new Error("scene never settled");
}

/** The gesture must land on the live canvas, not on the NOW LOADING backdrop
 * that covers it while the glb streams (that backdrop scrolls regardless). */
async function expectCanvasUnderCentre(scene: Locator) {
  await expect
    .poll(
      () =>
        scene.evaluate((el) => {
          // Re-centre each time: the layout above can still shift while loading.
          el.scrollIntoView({ block: "center" });
          const r = el.getBoundingClientRect();
          return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.tagName;
        }),
      { timeout: 40_000 },
    )
    .toBe("CANVAS");
}

/** Top edge of the scene box in the viewport — moves iff the page scrolled. */
async function topOf(scene: Locator): Promise<number> {
  return scene.evaluate((el) => el.getBoundingClientRect().top);
}

/** A vertical swipe that starts on the canvas must move the page. Swipes in
 * whichever direction the page still has room to scroll. `scene` is the
 * canvas's stable wrapper (the canvas element itself can remount). */
async function expectSwipeScrolls(page: Page, scene: Locator) {
  await scene.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(200);
  const before = await topOf(scene);
  const room = await page.evaluate(() => {
    const el = document.scrollingElement!;
    return el.scrollHeight - el.clientHeight - el.scrollTop;
  });
  const c = await centreOf(scene);
  const dy = room > 160 ? -140 : 140;
  await touchGesture(page, [[{ x: c.x, y: c.y - dy / 2 }, { x: c.x, y: c.y + dy / 2 }]]);
  await page.waitForTimeout(400);
  const after = await topOf(scene);
  expect(Math.abs(after - before), "page should scroll under a vertical swipe").toBeGreaterThan(50);
}

/** A horizontal drag on the canvas must turn the camera (frame changes)
 * without scrolling the page. */
async function expectDragRotates(page: Page, scene: Locator) {
  await scene.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const still = await settledFrame(scene);
  const before = await topOf(scene);
  const c = await centreOf(scene);
  await touchGesture(page, [[{ x: c.x - 110, y: c.y }, { x: c.x + 110, y: c.y }]]);
  await page.waitForTimeout(400);
  expect(await topOf(scene), "a horizontal drag must not scroll").toBeCloseTo(before, 0);
  expect((await scene.screenshot()).equals(still), "camera should have rotated").toBe(false);
}

async function openGarageScene(page: Page): Promise<Locator> {
  await page.goto("/garage?car=nodegent");
  await expectRendered(page);
  const region = page.getByRole("region", { name: /Nodegent in the garage/ });
  await expect(region.locator("canvas")).toHaveCount(1, { timeout: 20_000 });
  // R3F's wrapper div (canvas → sizer → wrapper): what OrbitControls binds to.
  const scene = region.locator("canvas").locator("xpath=../..");
  await expectCanvasUnderCentre(scene);
  // The bay remounts once the model streams in; act on the settled one.
  await settledFrame(scene);
  return scene;
}

async function openCafeScene(page: Page): Promise<Locator> {
  await page.goto("/cafe");
  await expectRendered(page);
  const scene = page.getByLabel(/GT Café 3D view/);
  await expect(scene.locator("canvas")).toHaveCount(1, { timeout: 30_000 });
  await expect(page.getByTestId("cafe-scene-hint")).toBeVisible({ timeout: 30_000 });
  await expectCanvasUnderCentre(scene);
  return scene;
}

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

test.describe("3D canvases on a phone", () => {
  test.use(device("iPhone 15 Pro"));
  // Waiting for a WebGL scene to settle under SwiftShader is slow.
  test.describe.configure({ timeout: 90_000 });

  test("garage: a vertical swipe on the canvas scrolls the page", async ({ page }) => {
    await expectSwipeScrolls(page, await openGarageScene(page));
  });

  test("garage: a horizontal drag still orbits the car", async ({ page }) => {
    await expectDragRotates(page, await openGarageScene(page));
  });

  test("café: a vertical swipe on the canvas scrolls the page", async ({ page }) => {
    await expectSwipeScrolls(page, await openCafeScene(page));
  });

  test("café: a horizontal drag still looks around", async ({ page }) => {
    await expectDragRotates(page, await openCafeScene(page));
  });

  test("café: a two-finger pinch zooms instead of scrolling", async ({ page }) => {
    const scene = await openCafeScene(page);
    await scene.evaluate((el) => el.scrollIntoView({ block: "center" }));
    const still = await settledFrame(scene);
    const before = await topOf(scene);
    const c = await centreOf(scene);
    // Fingers spread VERTICALLY — the case pan-y alone would hand to the page.
    await touchGesture(page, [
      [{ x: c.x, y: c.y - 20 }, { x: c.x, y: c.y - 110 }],
      [{ x: c.x, y: c.y + 20 }, { x: c.x, y: c.y + 110 }],
    ]);
    await page.waitForTimeout(400);
    expect(await topOf(scene), "a pinch must not scroll").toBeCloseTo(before, 0);
    expect((await scene.screenshot()).equals(still), "camera should have dollied").toBe(false);
  });
});

test.describe("touch wording on a tablet", () => {
  test.use(device("iPad Mini"));

  test("world map strip says choose, not arrows", async ({ page }) => {
    await page.goto("/");
    await expectRendered(page);
    const strip = page.locator(".map-control-strip");
    await expect(strip.getByText("Choose a destination")).toBeVisible();
    await expect(strip.getByText(/Arrows: select/)).toBeHidden();
  });

  test("café hint and label speak touch", async ({ page }) => {
    await openCafeScene(page);
    const hint = page.getByTestId("cafe-scene-hint");
    await expect(hint.getByText(/Drag to look · Pinch to zoom/)).toBeVisible();
    await expect(hint.getByText(/Tap an exhibit/)).toBeVisible();
    await expect(hint.getByText(/Scroll to zoom/)).toBeHidden();
    await expect(page.getByLabel(/GT Café 3D view/)).toHaveAttribute("aria-label", /pinch to zoom/);
  });

  test("terminal close reads Exit and the teaser says tap to skip; Esc still works", async ({ page }) => {
    const { input } = await openTerminal(page);
    const close = page.getByRole("button", { name: "Close terminal" }).first();
    await expect(close.getByText("Exit ✕")).toBeVisible();
    await expect(close.getByText("Esc ✕")).toBeHidden();

    await input.fill("what's next?");
    await input.press("Enter");
    const ad = page.getByRole("dialog", { name: "Citation teaser advertisement" });
    await expect(ad).toBeVisible();
    await expect(ad.getByText("tap to skip")).toBeVisible();
    await expect(ad.getByText("esc — skip")).toBeHidden();
    // A hardware keyboard on a tablet still gets Esc.
    await page.keyboard.press("Escape");
    await expect(ad).toBeHidden();
  });
});

test.describe("keyboard wording stays on desktop", () => {
  test("map strip and café hint keep the keys", async ({ page }) => {
    await page.goto("/");
    await expectRendered(page);
    await expect(page.locator(".map-control-strip").getByText(/Arrows: select/)).toBeVisible();
    await expect(page.locator(".map-control-strip").getByText("Choose a destination")).toBeHidden();
    await openCafeScene(page);
    await expect(page.getByTestId("cafe-scene-hint").getByText(/Scroll to zoom/)).toBeVisible();
  });
});

/** Automation sets navigator.webdriver, which routes agents past the intro;
 * these tests are about the human path. */
async function presentAsPerson(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false });
  });
}

/** Open the intro on a frozen clock and step it to mid-montage: the monogram
 * holds 850ms, then the montage runs ~2.8s on its own. With time stopped, a
 * title screen after the input can only mean the input skipped — no race
 * against a loaded CI box. */
async function openIntroAtMontage(page: Page): Promise<Locator> {
  await presentAsPerson(page);
  await page.clock.install();
  await page.goto("/");
  await page.clock.runFor(1_500);
  const dialog = page.getByRole("dialog", { name: /portfolio introduction/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: /press start/i })).toHaveCount(0);
  return dialog;
}

/** One input reaches PRESS START without the montage clock moving — and,
 * however long it then sits, never passes it. */
async function expectHeldOnTitle(page: Page, dialog: Locator) {
  const start = dialog.getByRole("button", { name: /press start/i });
  await page.clock.runFor(50);
  await expect(start).toBeVisible();
  await page.clock.runFor(10_000);
  await expect(dialog).toBeVisible();
  await expect(start).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("sr-boot-seen"))).toBeNull();
}

test.describe("boot intro on a phone", () => {
  test.use({ ...device("iPhone 15 Pro"), reducedMotion: "no-preference" });

  test("a tap during the montage jumps to the title screen, not past it", async ({ page }) => {
    const dialog = await openIntroAtMontage(page);
    // Tap dead centre — exactly where PRESS START will appear.
    const c = await centreOf(dialog);
    await page.touchscreen.tap(c.x, c.y);
    await expectHeldOnTitle(page, dialog);
  });
});

test.describe("boot intro on a tablet", () => {
  test.use({ ...device("iPad Mini"), reducedMotion: "no-preference" });

  test("the skip hint says tap (768px wide, but no keys)", async ({ page }) => {
    await presentAsPerson(page);
    await page.goto("/");
    const dialog = page.getByRole("dialog", { name: /portfolio introduction/ });
    await expect(dialog.getByText("Tap to skip")).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByText("Press any key to skip")).toBeHidden();
  });
});

test.describe("boot intro with a keyboard", () => {
  // Headless Chromium's UA names itself "Headless" (an agent): present a person.
  test.use({
    reducedMotion: "no-preference",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  });

  test("any key during the montage jumps to the title screen, not past it", async ({ page }) => {
    const dialog = await openIntroAtMontage(page);
    await page.keyboard.press("a");
    await expectHeldOnTitle(page, dialog);
  });

  test("the skip hint says press any key", async ({ page }) => {
    await presentAsPerson(page);
    await page.goto("/");
    const dialog = page.getByRole("dialog", { name: /portfolio introduction/ });
    await expect(dialog.getByText("Press any key to skip")).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByText("Tap to skip")).toBeHidden();
  });
});
