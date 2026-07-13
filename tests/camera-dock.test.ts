import { describe, expect, it } from "vitest";
import {
  CAMERA_BOUNDS,
  crtDockFallback,
  crtDockPose,
} from "../src/components/cafe/cameraPoses";

/** Real-ish measured tube bounds (from the live bake). */
const SCREEN = {
  center: [-5.96, 1.05, -1.25] as const,
  width: 0.34,
  height: 0.26,
};

function eyeDistance(pose: { position: readonly number[] }): number {
  return pose.position[0] - SCREEN.center[0];
}

describe("crtDockPose — aspect-aware framing", () => {
  // Regression: a hardcoded 3:2 aspect made the tube overflow the frame
  // sideways on the 4:5 mobile panel — width must bind on narrow panels.
  it("docks farther back on portrait panels than on landscape", () => {
    const landscape = crtDockPose(SCREEN, 3 / 2);
    const portrait = crtDockPose(SCREEN, 4 / 5);
    expect(eyeDistance(portrait)).toBeGreaterThan(eyeDistance(landscape));
  });

  it("is head-on: eye straight out +X from the screen center, same y/z", () => {
    const pose = crtDockPose(SCREEN, 3 / 2);
    expect(eyeDistance(pose)).toBeGreaterThan(0);
    expect(pose.position[1]).toBeCloseTo(SCREEN.center[1]);
    expect(pose.position[2]).toBeCloseTo(SCREEN.center[2]);
    expect(pose.target).toEqual([...SCREEN.center]);
  });

  it("keeps the eye inside the room across extreme aspects", () => {
    for (const aspect of [0.4, 0.8, 1.5, 3]) {
      for (const pose of [crtDockPose(SCREEN, aspect), crtDockFallback(aspect)]) {
        const [x, y, z] = pose.position;
        expect(x).toBeGreaterThanOrEqual(CAMERA_BOUNDS.minX);
        expect(x).toBeLessThanOrEqual(CAMERA_BOUNDS.maxX);
        expect(y).toBeGreaterThanOrEqual(CAMERA_BOUNDS.minY);
        expect(y).toBeLessThanOrEqual(CAMERA_BOUNDS.maxY);
        expect(z).toBeGreaterThanOrEqual(CAMERA_BOUNDS.minZ);
        expect(z).toBeLessThanOrEqual(CAMERA_BOUNDS.maxZ);
      }
    }
  });
});
