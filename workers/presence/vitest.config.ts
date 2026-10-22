import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";

/**
 * The room is tested in workerd itself, not against a mock: hibernation
 * attachments, `ctx.getWebSockets()` and the 101 handshake have no faithful
 * node stand-in. The pool reads this package's real wrangler.jsonc, so the
 * Durable Object binding and migration under test are the ones that deploy.
 *
 * No storage options appear here because PresenceRoom uses no storage at all —
 * see test/no-storage.test.ts. Each test file gets its own isolate and so its
 * own instance of the global room.
 */
/**
 * The pool pins its own workerd (miniflare 5.2026-08-15-alpha at the time of
 * writing), which is older than the one `wrangler` installs. It refuses to boot
 * against a compatibility date it does not know, so the test run — and only the
 * test run — is pinned to the newest date that build accepts. Deploys still use
 * the date in wrangler.jsonc. Raise this when the pool ships a newer runtime;
 * nothing here depends on behaviour introduced between the two dates.
 */
const TEST_COMPATIBILITY_DATE = "2026-08-22";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        compatibilityDate: TEST_COMPATIBILITY_DATE,
        // PRESENCE_IP_KEY is a REQUIRED secret (the Worker refuses upgrades
        // without it), so the test run supplies a fixed, obviously-fake one.
        // test/missing-key.test.ts strips it to prove the fail-closed path.
        bindings: { PRESENCE_IP_KEY: "test-only-presence-ip-key" },
      },
    }),
  ],
  test: {
    // The cap and throttle tests open real sockets and wait on a real second.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
