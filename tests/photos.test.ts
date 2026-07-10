import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  categories,
  photos,
  photosByCategory,
  photoById,
  type PhotoCategory,
} from "../content/photos";
import { carById } from "../content/cars";
import { missionById } from "../content/missions";
import { findEvent } from "../content/career";

const PUBLIC_DIR = join(__dirname, "..", "public");
const CATEGORY_IDS: readonly PhotoCategory[] = ["nature", "cars", "life"];

describe("scapes photos", () => {
  it("has at least nine photos", () => {
    expect(photos.length).toBeGreaterThanOrEqual(9);
  });

  it("has unique photo ids", () => {
    const ids = photos.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every photo a category within the union", () => {
    for (const p of photos) {
      expect(CATEGORY_IDS).toContain(p.category);
    }
  });

  it("gives every photo positive integer dimensions and a title", () => {
    for (const p of photos) {
      expect(Number.isInteger(p.width), p.id).toBe(true);
      expect(Number.isInteger(p.height), p.id).toBe(true);
      expect(p.width, p.id).toBeGreaterThan(0);
      expect(p.height, p.id).toBeGreaterThan(0);
      expect(p.title, p.id).toBeTruthy();
    }
  });

  it("points every src at a real file under public/scapes/", () => {
    for (const p of photos) {
      expect(p.src.startsWith("/scapes/"), `${p.id}: ${p.src}`).toBe(true);
      expect(existsSync(join(PUBLIC_DIR, p.src)), `${p.id}: ${p.src}`).toBe(
        true,
      );
    }
  });

  it("exercises varied aspect ratios (landscape, portrait, square)", () => {
    const ratios = photos.map((p) => p.width / p.height);
    expect(ratios.some((r) => r > 1.1)).toBe(true); // landscape
    expect(ratios.some((r) => r < 0.9)).toBe(true); // portrait
    expect(ratios.some((r) => Math.abs(r - 1) < 0.05)).toBe(true); // square
  });
});

describe("scapes categories", () => {
  it("defines exactly the three expected categories", () => {
    expect(categories.map((c) => c.id)).toEqual([...CATEGORY_IDS]);
  });

  it("gives every category a name, blurb, and ≥1 photo", () => {
    for (const c of categories) {
      expect(c.name, c.id).toBeTruthy();
      expect(c.blurb, c.id).toBeTruthy();
      expect(photosByCategory(c.id).length, c.id).toBeGreaterThanOrEqual(1);
    }
  });

  it("resolves every featured photo id to a photo in that category", () => {
    for (const c of categories) {
      const featured = photoById.get(c.featuredPhotoId);
      expect(featured, c.id).toBeDefined();
      expect(featured?.category, c.id).toBe(c.id);
    }
  });
});

describe("scapes cross-refs", () => {
  it("resolves every carId against a real car", () => {
    for (const p of photos) {
      if (p.carId) {
        expect(carById.has(p.carId), `${p.id} → ${p.carId}`).toBe(true);
      }
    }
  });

  it("resolves every missionId against a real mission", () => {
    for (const p of photos) {
      if (p.missionId) {
        expect(missionById.has(p.missionId), `${p.id} → ${p.missionId}`).toBe(
          true,
        );
      }
    }
  });

  it("resolves every careerEventId against a real career event", () => {
    for (const p of photos) {
      if (p.careerEventId) {
        expect(findEvent(p.careerEventId), `${p.id} → ${p.careerEventId}`).not.toBeNull();
      }
    }
  });

  it("cross-links at least two placeholders into other pavilions", () => {
    const linked = photos.filter(
      (p) => p.carId || p.missionId || p.careerEventId,
    );
    expect(linked.length).toBeGreaterThanOrEqual(2);
  });
});
