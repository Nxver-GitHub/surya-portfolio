import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end suite: the critical visitor flows, run against a PRODUCTION
 * build (`next build` then `next start`), never the dev server — the dev
 * server logs a CSP `eval` notice that production does not, and the CI gate
 * exists to protect the artifact that ships, not the one that hot-reloads.
 *
 * `reducedMotion: "reduce"` is the default because the GT2 boot intro honours
 * prefers-reduced-motion by skipping itself; the intro gate has its own spec
 * that opts back into motion. Runs headless Chromium only: the WebGL scenes
 * need a GPU-capable browser, and SwiftShader in headless Chromium is the one
 * CI can rely on.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    reducedMotion: "reduce",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /mobile-layout\.spec\.ts/,
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      testMatch: /home\.spec\.ts/,
    },
    // The mobile gate (mobile-layout.spec.ts). Every device here runs in
    // Chromium — CI installs only Chromium, and Playwright's iPhone/iPad
    // descriptors default to WebKit — so these pin browserName back. Note
    // devices["iPhone SE"] is 320 wide, so 375 is a custom viewport.
    {
      name: "phone-375",
      use: {
        browserName: "chromium",
        viewport: { width: 375, height: 667 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
      testMatch: /mobile-layout\.spec\.ts/,
    },
    {
      name: "iphone-15-pro",
      use: { ...devices["iPhone 15 Pro"], browserName: "chromium" },
      testMatch: /mobile-layout\.spec\.ts/,
    },
    {
      name: "iphone-15-pro-landscape",
      use: { ...devices["iPhone 15 Pro landscape"], browserName: "chromium" },
      testMatch: /mobile-layout\.spec\.ts/,
    },
    {
      name: "ipad-mini",
      use: { ...devices["iPad Mini"], browserName: "chromium" },
      testMatch: /mobile-layout\.spec\.ts/,
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm start -p 3100",
        url: "http://localhost:3100",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
