import { describe, expect, it } from "vitest";
import { migrateCrtMode, nextCrtMode } from "../src/components/crt/CrtLayer";

/**
 * The CRT preference store is a three-state cycle (Off → Subtle → Full) that
 * replaced a two-state on/off toggle. These pin the migration from the old
 * persisted value and the cycle order — pure functions, no DOM/localStorage
 * involved, so they run in vitest's default node environment.
 */

describe("migrateCrtMode", () => {
  it("migrates the legacy 'on' value to subtle", () => {
    expect(migrateCrtMode("on")).toBe("subtle");
  });

  it("keeps 'off' as off", () => {
    expect(migrateCrtMode("off")).toBe("off");
  });

  it("defaults a missing (null) value to subtle", () => {
    expect(migrateCrtMode(null)).toBe("subtle");
  });

  it("keeps 'subtle' as subtle", () => {
    expect(migrateCrtMode("subtle")).toBe("subtle");
  });

  it("keeps 'full' as full", () => {
    expect(migrateCrtMode("full")).toBe("full");
  });

  it("defaults any unrecognized value to subtle", () => {
    expect(migrateCrtMode("bogus")).toBe("subtle");
    expect(migrateCrtMode("")).toBe("subtle");
  });
});

describe("nextCrtMode", () => {
  it("cycles Off → Subtle → Full → Off", () => {
    expect(nextCrtMode("off")).toBe("subtle");
    expect(nextCrtMode("subtle")).toBe("full");
    expect(nextCrtMode("full")).toBe("off");
  });
});
