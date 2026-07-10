import { describe, expect, it } from "vitest";
import {
  allLicenseTests,
  licenseById,
  licenseTierOrder,
  licenses,
  type LicenseGrade,
} from "../content/licenses";
import { carById } from "../content/cars";
import { missionById } from "../content/missions";
import { findEvent } from "../content/career";

const ALLOWED_GRADES: readonly LicenseGrade[] = [
  "gold",
  "silver",
  "bronze",
  "inprogress",
];

describe("license tiers", () => {
  it("has exactly five tiers in the canonical B → A → IB → IA → S order", () => {
    expect(licenses).toHaveLength(5);
    expect(licenses.map((l) => l.id)).toEqual([
      "B",
      "A",
      "IB",
      "IA",
      "S",
    ]);
    expect(licenseTierOrder).toEqual(["B", "A", "IB", "IA", "S"]);
  });

  it("has unique tier ids", () => {
    const ids = licenses.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every tier a non-empty name, theme, and summary", () => {
    for (const l of licenses) {
      expect(l.name, l.id).toBeTruthy();
      expect(l.theme, l.id).toBeTruthy();
      expect(l.summary, l.id).toBeTruthy();
    }
  });

  it("gives every tier between 2 and 5 tests", () => {
    for (const l of licenses) {
      expect(l.tests.length, l.id).toBeGreaterThanOrEqual(2);
      expect(l.tests.length, l.id).toBeLessThanOrEqual(5);
    }
  });

  it("resolves every tier through licenseById", () => {
    for (const l of licenses) {
      expect(licenseById.get(l.id)).toBe(l);
    }
  });
});

describe("license tests", () => {
  it("has unique test ids across all tiers", () => {
    const ids = allLicenseTests.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every test a non-empty name and summary", () => {
    for (const t of allLicenseTests) {
      expect(t.name, t.id).toBeTruthy();
      expect(t.summary, t.id).toBeTruthy();
    }
  });

  it("uses only allowed grades", () => {
    for (const t of allLicenseTests) {
      expect(ALLOWED_GRADES, t.id).toContain(t.grade);
    }
  });
});

describe("license evidence cross-links", () => {
  it("resolves every carId to a real garage car", () => {
    for (const t of allLicenseTests) {
      if (t.carId) {
        expect(carById.has(t.carId), `${t.id} → ${t.carId}`).toBe(true);
      }
    }
  });

  it("resolves every missionId to a real mission", () => {
    for (const t of allLicenseTests) {
      if (t.missionId) {
        expect(missionById.has(t.missionId), `${t.id} → ${t.missionId}`).toBe(
          true,
        );
      }
    }
  });

  it("resolves every careerEventId to a real career event", () => {
    for (const t of allLicenseTests) {
      if (t.careerEventId) {
        expect(
          findEvent(t.careerEventId),
          `${t.id} → ${t.careerEventId}`,
        ).not.toBeNull();
      }
    }
  });

  it("grounds every earned test in at least one piece of evidence", () => {
    // In-progress tiers may honestly carry no cross-refs; earned grades
    // (gold/silver/bronze) must point at a real project, mission, or role.
    for (const t of allLicenseTests) {
      if (t.grade !== "inprogress") {
        const evidenced = Boolean(t.carId || t.missionId || t.careerEventId);
        expect(evidenced, t.id).toBe(true);
      }
    }
  });
});
