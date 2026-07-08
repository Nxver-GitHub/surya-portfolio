import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  allEventSlugs,
  findEvent,
  seasons,
} from "../content/career";
import { liveries } from "../content/liveries";
import { openCount, pavilions } from "../content/pavilions";

const PUBLIC_DIR = join(__dirname, "..", "public");

describe("pavilions", () => {
  it("has all seven pavilions with unique slugs", () => {
    expect(pavilions).toHaveLength(7);
    const slugs = pavilions.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("keeps map coordinates inside the canvas", () => {
    for (const p of pavilions) {
      expect(p.map.x).toBeGreaterThan(0);
      expect(p.map.x).toBeLessThan(100);
      expect(p.map.y).toBeGreaterThan(0);
      expect(p.map.y).toBeLessThan(100);
    }
  });

  it("references only defined liveries", () => {
    for (const p of pavilions) {
      expect(liveries[p.livery]).toBeDefined();
    }
  });

  it("counts open pavilions correctly", () => {
    expect(openCount).toBe(
      pavilions.filter((p) => p.status === "open").length,
    );
    expect(openCount).toBeGreaterThanOrEqual(1);
  });
});

describe("career content", () => {
  it("has unique event slugs across all seasons", () => {
    expect(new Set(allEventSlugs).size).toBe(allEventSlugs.length);
    expect(allEventSlugs.length).toBeGreaterThan(0);
  });

  it("resolves every slug through findEvent", () => {
    for (const slug of allEventSlugs) {
      const found = findEvent(slug);
      expect(found).not.toBeNull();
      expect(found?.event.slug).toBe(slug);
    }
    expect(findEvent("does-not-exist")).toBeNull();
  });

  it("gives every event the required GT2 fields and a full story", () => {
    for (const season of seasons) {
      for (const e of season.events) {
        expect(e.title).toBeTruthy();
        expect(e.org).toBeTruthy();
        expect(e.role).toBeTruthy();
        expect(e.dates).toBeTruthy();
        expect(e.result).toBeTruthy();
        expect(e.story.problem).toBeTruthy();
        expect(e.story.actions.length).toBeGreaterThan(0);
        expect(e.story.results).toBeTruthy();
      }
    }
  });

  it("points every logo path at a real file in public/", () => {
    const logoPaths = [
      ...seasons.map((s) => s.logo),
      ...seasons.flatMap((s) => s.events.map((e) => e.logo)),
    ].filter((l): l is string => Boolean(l));
    expect(logoPaths.length).toBeGreaterThan(0);
    for (const logo of logoPaths) {
      expect(existsSync(join(PUBLIC_DIR, logo)), `${logo} missing`).toBe(true);
    }
  });

  it("uses only external https links", () => {
    for (const season of seasons) {
      for (const e of season.events) {
        for (const link of e.links ?? []) {
          expect(link.href).toMatch(/^https:\/\//);
        }
      }
    }
  });
});

describe("liveries", () => {
  it("defines bars and a key color for every livery", () => {
    for (const livery of Object.values(liveries)) {
      expect(livery.bars.length).toBeGreaterThanOrEqual(2);
      expect(livery.key).toMatch(/^#[0-9a-f]{6}$/i);
      for (const bar of livery.bars) {
        expect(bar).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });
});
