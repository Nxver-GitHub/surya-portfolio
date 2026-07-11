import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { MOUNTS, exhibits, exhibitById } from "../content/cafe-exhibits";

const PUBLIC_DIR = join(__dirname, "..", "public");

/** Café interior bounds (glTF Y-up, metres) from the bake report — every mount
 * (and every reserved MOUNTS stage) must sit inside the room, on/above the
 * floor. Generous by design so it fails only on a genuine off-scene placement. */
const ROOM = { maxX: 6.5, maxZ: 4.5 } as const;

function withinRoom(position: readonly [number, number, number]): boolean {
  const [x, y, z] = position;
  return (
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    Number.isFinite(z) &&
    Math.abs(x) <= ROOM.maxX &&
    Math.abs(z) <= ROOM.maxZ &&
    y >= 0
  );
}

describe("café exhibits — roster invariants", () => {
  it("has unique exhibit ids", () => {
    const ids = exhibits.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    // exhibitById mirrors the roster exactly.
    expect(exhibitById.size).toBe(ids.length);
    for (const e of exhibits) {
      expect(exhibitById.get(e.id)).toBe(e);
    }
  });

  it("names every exhibit with a plain-English flavour line", () => {
    for (const e of exhibits) {
      expect(e.name, e.id).toBeTruthy();
      expect(e.flavor, e.id).toBeTruthy();
    }
  });
});

describe("café exhibits — model files", () => {
  it("points every modelPath at a committed /models/cafe-*.glb", () => {
    for (const e of exhibits) {
      expect(e.modelPath, `${e.id}: modelPath`).toMatch(/^\/models\/cafe-/);
      expect(e.modelPath).toMatch(/\.glb$/);
      const p = join(PUBLIC_DIR, e.modelPath);
      expect(existsSync(p), `${e.id}: missing ${e.modelPath}`).toBe(true);
    }
  });
});

describe("café exhibits — placement", () => {
  it("mounts every exhibit within room bounds with a finite rotation", () => {
    for (const e of exhibits) {
      expect(
        withinRoom(e.mount.position),
        `${e.id}: mount ${JSON.stringify(e.mount.position)} out of room`,
      ).toBe(true);
      expect(Number.isFinite(e.mount.rotationY), `${e.id}: rotationY`).toBe(true);
      if (e.mount.scale !== undefined) {
        expect(Number.isFinite(e.mount.scale), `${e.id}: scale`).toBe(true);
        expect(e.mount.scale, `${e.id}: scale > 0`).toBeGreaterThan(0);
      }
    }
  });

  it("keeps any camera override finite and in room bounds", () => {
    for (const e of exhibits) {
      if (!e.cameraOverride) continue;
      for (const key of ["position", "target"] as const) {
        const v = e.cameraOverride[key];
        for (const n of v) {
          expect(Number.isFinite(n), `${e.id}: cameraOverride.${key}`).toBe(true);
        }
      }
      expect(
        withinRoom(e.cameraOverride.position),
        `${e.id}: override camera out of room`,
      ).toBe(true);
    }
  });

  it("gives a positive, finite frameDistance when one is set", () => {
    for (const e of exhibits) {
      if (e.frameDistance === undefined) continue;
      expect(Number.isFinite(e.frameDistance), `${e.id}: frameDistance`).toBe(
        true,
      );
      expect(e.frameDistance, `${e.id}: frameDistance > 0`).toBeGreaterThan(0);
    }
  });
});

describe("café exhibits — CC attribution", () => {
  it("gives every exhibit a complete credit with https URLs", () => {
    for (const e of exhibits) {
      const c = e.credit;
      expect(c, `${e.id}: credit`).toBeDefined();
      for (const field of [
        "title",
        "author",
        "authorUrl",
        "source",
        "url",
        "license",
        "licenseUrl",
      ] as const) {
        expect(c[field], `${e.id}: empty credit ${field}`).toBeTruthy();
      }
      for (const urlField of ["authorUrl", "url", "licenseUrl"] as const) {
        expect(c[urlField], `${e.id}: ${urlField} must be https`).toMatch(
          /^https:\/\//,
        );
      }
    }
  });
});

describe("café exhibits — reserved mounts", () => {
  it("keeps every MOUNTS stage inside room bounds", () => {
    for (const [key, mount] of Object.entries(MOUNTS)) {
      expect(withinRoom(mount.position), `MOUNTS.${key} out of room`).toBe(true);
      expect(Number.isFinite(mount.rotationY), `MOUNTS.${key}: rotationY`).toBe(
        true,
      );
    }
  });
});
