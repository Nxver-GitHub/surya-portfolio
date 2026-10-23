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
  // The café's 3D room is the slowest page to boot under CI's software GL.
  test.slow();

  // WebGL off: the café falls back to its 2D backdrop and plain "Open
  // terminal" lozenge. Everything here is terminal DOM, but under CI's
  // software GL the 3D scene's first render blocks the main thread for 15s+:
  // advert beats stall on their timers and image polls run out of time.
  // Without a scene there is no stall.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
        if (/webgl/i.test(kind)) return null;
        return (getContext as (...a: unknown[]) => RenderingContext | null).call(this, kind, ...rest);
      } as typeof getContext;
    });
  });

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
    // Three reports the blocked context (see the beforeEach); the café's error
    // boundary turns it into the 2D fallback. Any other error still fails.
    expect(errors.filter((e) => !/Error creating WebGL context/.test(e))).toEqual([]);
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
      // Each frame is on screen for one beat only, so a slow runner can miss it
      // with a visibility poll. Record every advert frame that mounts and loads
      // inside the dialog instead, and assert on that log.
      await page.addInitScript(() => {
        const seen: Record<string, number> = {};
        (window as unknown as { __adFrames: Record<string, number> }).__adFrames = seen;
        const record = (img: HTMLImageElement) => {
          const name = /\/terminal\/citation\/(car|lockup)\.webp/.exec(img.src)?.[1];
          if (!name || !img.closest("[role=dialog]")) return;
          const log = () => { if (img.naturalWidth) seen[name] = img.naturalWidth; };
          if (img.complete) log(); else img.addEventListener("load", log, { once: true });
        };
        new MutationObserver((mutations) => {
          for (const m of mutations) for (const node of Array.from(m.addedNodes)) {
            if (node instanceof HTMLImageElement) record(node);
            else if (node instanceof Element) node.querySelectorAll("img").forEach(record);
          }
        }).observe(document, { childList: true, subtree: true });
      });
      const { input } = await openTerminal(page);
      await input.fill("what's next?");
      await input.press("Enter");
      const ad = page.getByRole("dialog", { name: "Citation teaser advertisement" });
      await expect(ad).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => (window as unknown as { __adFrames: Record<string, number> }).__adFrames), { timeout: 30_000 })
        .toEqual({ car: 1070, lockup: 666 });
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
