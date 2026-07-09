import { describe, expect, it } from "vitest";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { cars } from "../content/cars";

const PUBLIC_DIR = join(__dirname, "..", "public");
/** Per-model payload budget — keeps the garage within Core Web Vitals reach */
const MODEL_SIZE_BUDGET_BYTES = 600_000;

const modeledCars = cars.filter((c) => c.modelPath);

describe("3D model files", () => {
  it("every modelPath resolves to a committed file", () => {
    for (const car of modeledCars) {
      const p = join(PUBLIC_DIR, car.modelPath!);
      expect(existsSync(p), `${car.id}: missing ${car.modelPath}`).toBe(true);
    }
  });

  it("every model stays within the size budget", () => {
    for (const car of modeledCars) {
      const size = statSync(join(PUBLIC_DIR, car.modelPath!)).size;
      expect(
        size,
        `${car.id}: ${car.modelPath} is ${size} bytes (> ${MODEL_SIZE_BUDGET_BYTES})`,
      ).toBeLessThanOrEqual(MODEL_SIZE_BUDGET_BYTES);
    }
  });
});

describe("model attribution (CC-BY compliance)", () => {
  it("every third-party model carries a complete credit", () => {
    for (const car of modeledCars) {
      const credit = car.modelCredit;
      expect(credit, `${car.id}: modelPath without modelCredit`).toBeDefined();
      if (!credit) continue;
      for (const field of ["title", "author", "source", "url", "license"] as const) {
        expect(credit[field], `${car.id}: empty credit ${field}`).toBeTruthy();
      }
      expect(credit.url, `${car.id}: credit url must be https`).toMatch(/^https:\/\//);
      if (credit.licenseUrl) {
        expect(credit.licenseUrl).toMatch(/^https:\/\//);
      }
    }
  });

  it("credited cars keep their source records in assets-src/cars", () => {
    for (const car of modeledCars) {
      if (!car.modelCredit) continue;
      const blend = join(__dirname, "..", "assets-src", "cars");
      expect(
        existsSync(blend),
        "assets-src/cars must exist to hold editable model sources",
      ).toBe(true);
    }
  });
});
