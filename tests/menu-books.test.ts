import { describe, expect, it } from "vitest";
import {
  bookTypeOrder,
  menuBooks,
  menuBookById,
  taskHref,
  type BookType,
  type MenuBookTask,
} from "../content/menu-books";
import { carById } from "../content/cars";
import { missionById } from "../content/missions";
import { licenseById, type LicenseTierId } from "../content/licenses";
import { findEvent } from "../content/career";
import { categoryById, type PhotoCategory } from "../content/photos";

const BOOK_TYPES: readonly BookType[] = ["collection", "tournament", "misc"];
const TIER_IDS: readonly LicenseTierId[] = ["B", "A", "IB", "IA", "S"];
const CATEGORY_IDS: readonly PhotoCategory[] = ["nature", "cars", "life"];

/** Resolve whether a task's target grounds in real content. */
function targetResolves(target: MenuBookTask["target"]): boolean {
  switch (target.kind) {
    case "career":
      return findEvent(target.eventSlug) !== null;
    case "garage":
      return carById.has(target.carId);
    case "missions":
      return target.missionId === undefined || missionById.has(target.missionId);
    case "scapes":
      return (
        target.category === undefined || categoryById.has(target.category)
      );
    case "license":
      return target.tierId === undefined || licenseById.has(target.tierId);
  }
}

describe("menu books — structure", () => {
  it("authors four to six books", () => {
    expect(menuBooks.length).toBeGreaterThanOrEqual(4);
    expect(menuBooks.length).toBeLessThanOrEqual(6);
  });

  it("has unique book ids", () => {
    const ids = menuBooks.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has globally unique task ids", () => {
    const taskIds = menuBooks.flatMap((b) => b.tasks.map((t) => t.id));
    expect(new Set(taskIds).size).toBe(taskIds.length);
  });

  it("gives every book a type within the union", () => {
    for (const b of menuBooks) {
      expect(BOOK_TYPES, b.id).toContain(b.type);
    }
  });

  it("covers all three book types across the set", () => {
    const present = new Set(menuBooks.map((b) => b.type));
    for (const type of bookTypeOrder) {
      expect(present, `missing book type: ${type}`).toContain(type);
    }
  });

  it("gives every book a title, audience, and blurb", () => {
    for (const b of menuBooks) {
      expect(b.title, b.id).toBeTruthy();
      expect(b.audience, b.id).toBeTruthy();
      expect(b.blurb, b.id).toBeTruthy();
    }
  });

  it("gives every book two to five tasks, each with copy", () => {
    for (const b of menuBooks) {
      expect(b.tasks.length, b.id).toBeGreaterThanOrEqual(2);
      expect(b.tasks.length, b.id).toBeLessThanOrEqual(5);
      for (const t of b.tasks) {
        expect(t.label, `${b.id}/${t.id}`).toBeTruthy();
        expect(t.description, `${b.id}/${t.id}`).toBeTruthy();
      }
    }
  });

  it("gives every book a finite numeric anchor", () => {
    for (const b of menuBooks) {
      for (const axis of ["x", "y", "z"] as const) {
        expect(Number.isFinite(b.anchor[axis]), `${b.id}.${axis}`).toBe(true);
      }
    }
  });

  it("indexes every book in menuBookById", () => {
    for (const b of menuBooks) {
      expect(menuBookById.get(b.id), b.id).toBe(b);
    }
  });
});

describe("menu books — task targets resolve against real content", () => {
  it("resolves every task target to real content", () => {
    for (const b of menuBooks) {
      for (const t of b.tasks) {
        expect(
          targetResolves(t.target),
          `${b.id}/${t.id} → ${JSON.stringify(t.target)}`,
        ).toBe(true);
      }
    }
  });

  it("keeps optional target ids inside their unions when present", () => {
    for (const b of menuBooks) {
      for (const t of b.tasks) {
        const target = t.target;
        if (target.kind === "license" && target.tierId) {
          expect(TIER_IDS, `${b.id}/${t.id}`).toContain(target.tierId);
        }
        if (target.kind === "scapes" && target.category) {
          expect(CATEGORY_IDS, `${b.id}/${t.id}`).toContain(target.category);
        }
      }
    }
  });

  it("builds a plausible route for every task", () => {
    for (const b of menuBooks) {
      for (const t of b.tasks) {
        const href = taskHref(t.target);
        expect(href.startsWith("/"), `${b.id}/${t.id}: ${href}`).toBe(true);
      }
    }
  });
});
