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

  it("declares no SQLite-backed migration", () => {
    // Guards the other half of the same rule: the class must be introduced with
    // `new_classes`, never `new_sqlite_classes`.
    const config = wranglerConfig;
    expect(config).toContain('"new_classes"');
    expect(stripComments(config)).not.toContain("new_sqlite_classes");
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
