import { describe, expect, it } from "vitest";
import { changelog, siteVersion } from "../content/changelog";

describe("changelog", () => {
  it("has at least one release with a version, date, and changes", () => {
    expect(changelog.length).toBeGreaterThan(0);
    for (const entry of changelog) {
      expect(entry.version).toMatch(/^\d+\.\d+$/);
      expect(entry.date.length).toBeGreaterThan(0);
      expect(entry.changes.length).toBeGreaterThan(0);
      for (const change of entry.changes) {
        expect(change.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("derives the displayed site version from the newest entry", () => {
    expect(siteVersion).toBe(changelog[0].version);
  });

  it("has unique versions", () => {
    const versions = changelog.map((e) => e.version);
    expect(new Set(versions).size).toBe(versions.length);
  });
});
