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
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      testMatch: /home\.spec\.ts/,
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
