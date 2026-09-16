import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { errorMessage } from "../src/lib/logging";

describe("logging — errorMessage", () => {
  it("returns an Error's message", () => {
    expect(errorMessage(new Error("upstash timed out"))).toBe("upstash timed out");
  });

  it("returns a fixed string for anything that is not an Error", () => {
    expect(errorMessage("boom")).toBe("unknown");
    expect(errorMessage({ url: "https://x.upstash.io", token: "AX..." })).toBe(
      "unknown",
    );
    expect(errorMessage(undefined)).toBe("unknown");
  });

  it("never returns the surrounding object's fields", () => {
    const error = Object.assign(new Error("request failed"), {
      url: "https://secret-db.upstash.io",
      headers: { authorization: "Bearer AX4-super-secret" },
    });
    const logged = errorMessage(error);
    expect(logged).toBe("request failed");
    expect(logged).not.toContain("upstash.io");
    expect(logged).not.toContain("Bearer");
  });
});

/**
 * Worker logs are retained with `observability.enabled`, and an Upstash or
 * AI-SDK failure object serializes the upstream URL plus the auth header into
 * that store. Round 1 fixed the route call sites but left lib/events.ts logging
 * raw objects on two paths both public routes reach. This is a whole-repo
 * guard, not a spot check: any new `console.error("...", error)` fails it.
 */
describe("logging — no raw error objects reach the platform log", () => {
  const SRC = fileURLToPath(new URL("../src", import.meta.url));

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(path);
      return /\.tsx?$/.test(entry.name) ? [path] : [];
    });
  }

  it("passes only errorMessage(...) to console.error, never the caught error", () => {
    // Matches `console.error(<anything>, error)` — the raw-object form.
    const rawErrorArgument = /console\.error\([^)]*,\s*error\s*\)/;
    const offenders = sourceFiles(SRC).filter((file) =>
      rawErrorArgument.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
