import { describe, expect, it } from "vitest";

/**
 * The privacy story for this Worker is "there is nothing at rest": the room
 * handles `cf-connecting-ip`, and the only reason that is safe is that the
 * Durable Object never writes anything down. A single stray `ctx.storage` call
 * would quietly create a durable surface holding visitor state, so the ban is
 * asserted against the source itself rather than trusted to review.
 *
 * Sources are inlined at build time by Vite, so this runs inside workerd with
 * no filesystem access. See Docs/story-lobby-presence.md §3 and §6.
 */
const sources = import.meta.glob("../src/**/*.ts", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

describe("storage ban", () => {
  it("reads every source file in src/", () => {
    const names = Object.keys(sources);
    expect(names.length).toBeGreaterThanOrEqual(3);
    expect(names.some((n) => n.endsWith("/room.ts"))).toBe(true);
    for (const body of Object.values(sources)) {
      expect(body.length).toBeGreaterThan(0);
    }
  });

  it("never touches ctx.storage", () => {
    const offenders = Object.entries(sources).filter(
      ([, body]) => /\bctx\.storage\b/.test(stripComments(body)),
    );
    expect(offenders.map(([name]) => name)).toEqual([]);
  });

  it("declares the class once, as the platform-required SQLite kind", () => {
    // Cloudflare no longer creates key-value DO namespaces (error 10099), so the
    // migration MUST say `new_sqlite_classes`. The backend is dormant: the test
    // above is what keeps it empty. Guard against a stray `new_classes` that
    // would make the first deploy fail again.
    const config = stripComments(wranglerConfig);
    expect(config).toContain('"new_sqlite_classes": ["PresenceRoom"]');
    expect(config).not.toMatch(/"new_classes"/);
  });
});

const wranglerConfig = (
  import.meta.glob("../wrangler.jsonc", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>
)["../wrangler.jsonc"];

/** Comments explain the ban; only real code should be able to break it. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}
