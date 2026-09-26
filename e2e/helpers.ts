import { expect, type ConsoleMessage, type Page } from "@playwright/test";

/** Every public pavilion route, as linked from the World Map. */
export const PAVILION_ROUTES = [
  "/career",
  "/garage",
  "/license-center",
  "/missions",
  "/special-stage",
  "/scapes",
  "/cafe",
  "/lobby",
] as const;

/**
 * Collect console errors for the life of a page. Returned array is live: read
 * it at the end of the test. Network-level failures from the optional live
 * presence socket are tolerated, since CI has no Worker to connect to.
 */
export function watchConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (/live\.suryapugaz\.com|WebSocket|Failed to load resource/i.test(text))
      return;
    errors.push(text);
  };
  page.on("console", onConsole);
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

/** Assert the page reached the real content (not a Next error overlay). */
export async function expectRendered(page: Page): Promise<void> {
  await expect(page.locator("body")).not.toContainText(
    /Application error|Unhandled Runtime Error/,
  );
}
