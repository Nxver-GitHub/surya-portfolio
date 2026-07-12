/**
 * Camera choreography poses for the GT Café — the GT7-style scripted moves.
 *
 * A "pose" is a camera position plus the point it looks at, both in the café
 * glb's local coordinate space. The scene tweens between poses (see the
 * CameraRig in CafeScene): overview → a table for a book, or → the desk for the
 * CRT terminal, and back to overview via the "Room view" control.
 *
 * PLACEHOLDER coordinates: the overview pose mirrors the Canvas entrance camera
 * and the CRT pose is a marked stand-in. The Blender agent rebuilds the glb and
 * the orchestrator replaces these constants (and the per-book `anchor`s in
 * content/menu-books.ts) with values read from the real baked scene. The table-
 * front rule below is derived, not hardcoded, so it needs no per-table update.
 */

import type { BookAnchor } from "../../../content/menu-books";
import type { Exhibit } from "../../../content/cafe-exhibits";

/** A camera position + the world point it aims at (café-local space). */
export interface CameraPose {
  /** Camera position [x, y, z]. */
  readonly position: readonly [number, number, number];
  /** Point the camera looks at [x, y, z]. */
  readonly target: readonly [number, number, number];
}

/**
 * Interior containment box for the camera EYE (café-local metres). The room is
 * ~13×3.8×9m with walls at ±6.5 (x), floor/ceiling 0–3.8 (y), ±4.5 (z); this
 * box holds a 0.3m margin off every surface. Clamping the eye here every frame
 * keeps the camera inside the building — OrbitControls recomputes its spherical
 * from the clamped position next frame, so it slides along a wall instead of
 * passing through it. maxDistance stays generous; this box is the real boundary.
 */
export const CAMERA_BOUNDS = {
  minX: -6.2,
  maxX: 6.2,
  minY: 0.5,
  maxY: 3.4,
  minZ: -4.2,
  maxZ: 4.2,
} as const;

function clampScalar(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * Clamp a camera eye position into {@link CAMERA_BOUNDS}, returning a new tuple
 * (never mutates the input). Used both to keep flight destinations honest and,
 * in-scene, to contain the live camera every frame. Pure.
 */
export function clampToRoom(
  position: readonly [number, number, number],
): [number, number, number] {
  return [
    clampScalar(position[0], CAMERA_BOUNDS.minX, CAMERA_BOUNDS.maxX),
    clampScalar(position[1], CAMERA_BOUNDS.minY, CAMERA_BOUNDS.maxY),
    clampScalar(position[2], CAMERA_BOUNDS.minZ, CAMERA_BOUNDS.maxZ),
  ];
}

/** A pose with its eye clamped into the interior box (target left as-authored,
 * since the look-at point may legitimately sit on a wall the eye faces). */
function clampPose(pose: CameraPose): CameraPose {
  return { position: clampToRoom(pose.position), target: pose.target };
}

/**
 * Overview / "room view": the entrance hero framing. Kept in sync with the
 * Canvas `camera` prop and the base OrbitControls target so returning to the
 * room lands exactly where the scene opened.
 *
 * Baked-scene hero framing: from the west-southwest looking across the rug's
 * F1 stage toward the bar and the motorsport corner. Target stays at room
 * center so the idle orbit sweeps the whole gallery.
 */
export const OVERVIEW_POSE: CameraPose = {
  position: [-4.9, 1.9, 3.8],
  target: [0, 0.95, 0],
} as const;

/**
 * Desk-front pose for the CRT terminal (the `CRT_Terminal` node in the glb).
 *
 * Baked-scene desk-front framing from the Blender report: eye pulled back into
 * the seating arc, looking down slightly onto the screen (which faces +X).
 * E11's interactive terminal inherits this exact pose.
 */
export const CRT_POSE: CameraPose = {
  position: [-4.85, 1.45, -0.7],
  target: [-6.15, 0.95, -1.35],
} as const;

/**
 * World-space bounds of the CRT screen plane, as located by CrtScreenSurface
 * (the `MAT_CRTScreen` mesh under `CRT_Terminal`). The screen faces +X (its
 * outward normal points into the room, toward increasing x), so its own extent
 * lives in Y (height) and Z (width); `x` is the plane's depth position.
 */
export interface ScreenBounds {
  /** Screen-plane center in world space [x, y, z]. */
  readonly center: readonly [number, number, number];
  /** Screen face width along Z (metres). */
  readonly width: number;
  /** Screen face height along Y (metres). */
  readonly height: number;
}

/**
 * Fraction of the 3:2 scene panel's HEIGHT the screen should fill when docked.
 * 0.78 lands inside the requested 70–80% window and leaves the model's bezel /
 * desk reading around the live surface rather than a full-bleed rectangle.
 */
export const CRT_DOCK_FILL = 0.78;

/**
 * The Canvas camera's vertical field of view (degrees). MUST match the `fov`
 * CafeScene sets on its `<Canvas camera>` (currently 60) — the dock distance is
 * derived from it, so if that changes this must change with it.
 */
export const CRT_DOCK_FOV_DEG = 60;

/**
 * Aspect ratio (width / height) of the scene panel the docked view fills. The
 * CafeBrowser panel is 3:2 on desktop (`lg:aspect-[3/2]`); the horizontal fov
 * derives from the vertical fov and this ratio, so the fit picks whichever of
 * width/height is binding.
 */
export const CRT_DOCK_PANEL_ASPECT = 3 / 2;

/**
 * Head-on docked pose for the interactive terminal: the camera sits directly in
 * front of the screen plane along its +X normal, at the screen's own y/z, pulled
 * back just far enough that the screen fills {@link CRT_DOCK_FILL} of the panel
 * height at {@link CRT_DOCK_FOV_DEG}. Pure — derives everything from the passed
 * bounds, then clamps the eye into {@link CAMERA_BOUNDS}.
 *
 * Distance math (fit the binding dimension): at distance `d` the camera sees a
 * world height `visibleH = 2·d·tan(vFov/2)` and width `visibleW = visibleH·AR`
 * (AR = {@link CRT_DOCK_PANEL_ASPECT}). We want each screen dimension to reach
 * `fill` of its frame dimension, so:
 *     dHeight = screenH / (2·fill·tan(vFov/2))
 *     dWidth  = screenW / (2·fill·tan(vFov/2)·AR)
 * and take `d = max(dHeight, dWidth)` — the larger distance guarantees BOTH the
 * full width and full height stay on-frame (whichever fills first governs). The
 * eye is placed at `center + [+d, 0, 0]` (head-on, into the room). clampToRoom
 * then guarantees the eye never crosses minX; for the real ~0.2–0.3m-tall CRT
 * face the raw eye sits ~0.2–0.35m off the screen — comfortably inside minX =
 * −6.2 (eye x ≈ −5.8…−5.9) — so the clamp is a safety net, not the governing
 * value. A physically larger measured screen pushes the eye proportionally
 * further back (distance scales linearly with screen size).
 */
export function crtDockPose(screen: ScreenBounds): CameraPose {
  const [cx, cy, cz] = screen.center;
  const halfFov = (CRT_DOCK_FOV_DEG * Math.PI) / 180 / 2;
  const tanHalf = Math.tan(halfFov);
  const denom = 2 * CRT_DOCK_FILL * tanHalf;
  const distHeight = screen.height / denom;
  const distWidth = screen.width / (denom * CRT_DOCK_PANEL_ASPECT);
  // The larger distance keeps the whole face on-frame (bezel margin around it).
  const dist = Math.max(distHeight, distWidth) || 0.6;

  return clampPose({
    // Eye: straight out along +X from the screen center (head-on), same y/z.
    position: [cx + dist, cy, cz],
    // Look dead-center at the screen plane.
    target: [cx, cy, cz],
  });
}

/**
 * Hardcoded fallback dock pose, derived from {@link CRT_POSE} for when the
 * screen mesh can't be measured (missing/renamed material). Uses the CRT_POSE
 * target as the screen center and a nominal ~0.3m screen height so the framing
 * still reads as "sat at the monitor". Kept as a constant so CafeScene needs no
 * bounds to fall back cleanly.
 */
export const CRT_DOCK_FALLBACK: CameraPose = crtDockPose({
  center: CRT_POSE.target,
  width: 0.4,
  height: 0.3,
});

/**
 * Table-front derivation constants. One rule frames all five books: stand the
 * camera back from the anchor toward room center (so tables on the room's left
 * are viewed from the room's interior), lifted to eye height, looking at the
 * book. No per-table tuning — moving an anchor moves its framing with it.
 */

/** Room center the camera backs away from, so it always faces inward. */
export const ROOM_CENTER: readonly [number, number, number] = [0, 0.95, 0];
/** How far the camera sits back from the anchor, toward room center (metres). */
export const TABLE_BACK_OFFSET = 1.35;
/** How far above the anchor the camera floats, for a seated-eye framing. */
export const TABLE_UP_OFFSET = 0.55;

/**
 * Derive the table-front pose for a book from its anchor. Position = anchor
 * pushed `TABLE_BACK_OFFSET` toward `ROOM_CENTER` (on the floor plane) and
 * lifted `TABLE_UP_OFFSET`; target = the anchor itself. Pure and deterministic,
 * so the same rule holds for every book and stays correct after re-anchoring.
 */
export function tableFrontPose(anchor: BookAnchor): CameraPose {
  const toCenterX = ROOM_CENTER[0] - anchor.x;
  const toCenterZ = ROOM_CENTER[2] - anchor.z;
  const length = Math.hypot(toCenterX, toCenterZ) || 1;
  const unitX = toCenterX / length;
  const unitZ = toCenterZ / length;

  return clampPose({
    position: [
      anchor.x + unitX * TABLE_BACK_OFFSET,
      anchor.y + TABLE_UP_OFFSET,
      anchor.z + unitZ * TABLE_BACK_OFFSET,
    ],
    target: [anchor.x, anchor.y, anchor.z],
  });
}

/** The name of the glb node the CRT click raycasts for (getObjectByName). */
export const CRT_NODE_NAME = "CRT_Terminal";

/**
 * Default stand-back distance for an exhibit's derived framing (metres), used
 * when the exhibit sets no `frameDistance`. Mid-range: closer than a car needs,
 * further than a helmet — real pieces should tune `frameDistance` to their size.
 */
export const EXHIBIT_FRAME_DISTANCE = 2.6;
/** How far above the piece's mount the framing camera floats (metres). */
export const EXHIBIT_UP_OFFSET = 0.7;

/**
 * Derive the framing pose for an exhibit. If the exhibit carries a
 * `cameraOverride`, that pose wins verbatim. Otherwise this applies the same
 * back-toward-room-center rule as {@link tableFrontPose}: stand the camera off
 * the piece toward {@link ROOM_CENTER} by `frameDistance` (default
 * {@link EXHIBIT_FRAME_DISTANCE}), lift it {@link EXHIBIT_UP_OFFSET}, and look
 * at the piece. Pure and deterministic — moving a mount moves its framing with
 * it, so no per-exhibit camera tuning is needed for the common case.
 */
export function exhibitFramePose(exhibit: Exhibit): CameraPose {
  if (exhibit.cameraOverride) {
    return clampPose({
      position: exhibit.cameraOverride.position,
      target: exhibit.cameraOverride.target,
    });
  }

  const [px, py, pz] = exhibit.mount.position;
  const distance = exhibit.frameDistance ?? EXHIBIT_FRAME_DISTANCE;

  const toCenterX = ROOM_CENTER[0] - px;
  const toCenterZ = ROOM_CENTER[2] - pz;
  const length = Math.hypot(toCenterX, toCenterZ) || 1;
  const unitX = toCenterX / length;
  const unitZ = toCenterZ / length;

  return clampPose({
    position: [px + unitX * distance, py + EXHIBIT_UP_OFFSET, pz + unitZ * distance],
    target: [px, py, pz],
  });
}
