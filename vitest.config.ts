import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Vitest config. Mirrors the one path alias from tsconfig (`@/* → ./src/*`) so
 * tests can import route/lib modules the same way the app does. Everything else
 * stays on vitest's defaults (node environment, `tests/**` discovery) — the
 * suite is pure logic with no DOM.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
