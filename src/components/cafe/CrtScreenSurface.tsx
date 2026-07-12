"use client";

/**
 * CrtScreenSurface — the interactive scene half of the café terminal (E11).
 *
 * Where {@link CrtScreenFeed} paints a low-res *texture* mirror of the terminal
 * onto the CRT's screen material for the room view, this component renders the
 * REAL terminal DOM (passed as `children`) onto the physical screen plane via a
 * drei `<Html transform>` when the camera is docked to the monitor. It:
 *
 *  1. Locates the screen mesh exactly like CrtScreenFeed — the `MAT_CRTScreen`
 *     material under the `CRT_Terminal` node — and measures its world-space
 *     center + dimensions.
 *  2. Reports the search result up (`onFound`) so the 2D shell can fall back to
 *     the overlay if the mesh is missing, and reports the measured bounds
 *     (`onBounds`) so CafeScene can derive the exact head-on dock pose.
 *  3. When `docked`, anchors an `<Html transform>` at the screen plane (screen
 *     faces +X, so the DOM is rotated to lie in the Y/Z plane facing +X) with a
 *     tiny epsilon offset so it never z-fights the mesh, sized to the screen's
 *     real world dimensions and glassed into a phosphor "tube".
 *
 * The terminal DOM itself is built by another agent and handed in as `children`;
 * this component owns only the 3D placement, sizing, and CRT tube chrome.
 */

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import {
  Box3,
  Euler,
  Mesh,
  Vector3,
  type Material,
  type Object3D,
} from "three";
import type { ScreenBounds } from "./cameraPoses";

/** The screen material authored in the café glb (per the Blender report). */
const SCREEN_MATERIAL_NAME = "MAT_CRTScreen";
/** The CRT node the screen lives under. */
const CRT_NODE_NAME = "CRT_Terminal";

/**
 * THE ONE TUNABLE (orchestrator's final knob).
 *
 * The CSS pixel HEIGHT of the terminal DOM element rendered on the tube. Width
 * is derived from the measured screen aspect ratio, and the drei `transform`
 * distanceFactor is derived from this + the measured world height so the DOM
 * always maps 1:1 onto the real screen face — see `SIZING MATH` below. Lower =
 * bigger text (fewer CSS px stretched across the same world size); higher =
 * more terminal rows visible but smaller glyphs.
 *
 * SIZING MATH (drei Html transform):
 *   drei maps the inner element by `1 / ((distanceFactor || 10) / 400)`, i.e.
 *   `worldSize = cssPx × distanceFactor / 400`. To make a `cssPx`-tall element
 *   cover a screen of measured world height `H`:
 *       distanceFactor = 400 × H / SCREEN_CSS_HEIGHT
 *   Legibility: at the docked pose the screen fills CRT_DOCK_FILL (0.78) of a
 *   ~1000px-tall panel ⇒ ~780 device px tall. Each CSS px therefore renders
 *   across ~780 / SCREEN_CSS_HEIGHT device px. With SCREEN_CSS_HEIGHT = 480,
 *   16px CSS text ≈ 16 × 780/480 ≈ 26 device px — comfortably ≥16.
 */
export const SCREEN_CSS_HEIGHT = 480;

/** Epsilon push of the DOM plane along +X so it floats just off the mesh face
 *  and never z-fights the phosphor material. ~5mm reads as flush. */
const SCREEN_EPSILON = 0.005;

/** Find the first mesh in `root` whose material is named `name` (mirrors the
 *  exact lookup CrtScreenFeed uses, so both target the same face). */
function findMeshByMaterialName(root: Object3D, name: string): Mesh | null {
  let found: Mesh | null = null;
  root.traverse((obj) => {
    if (found) return;
    if (obj instanceof Mesh) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      if (mats.some((m) => m && (m as Material).name === name)) {
        found = obj;
      }
    }
  });
  return found;
}

/** Measure a mesh's world-space center + face dimensions. The screen faces +X,
 *  so its extent lives in Y (height) and Z (width); the X extent is the plane's
 *  negligible depth. Pure read — never mutates the scene. */
function measureScreen(mesh: Mesh, scene: Object3D): ScreenBounds | null {
  scene.updateMatrixWorld(true);
  const box = new Box3().setFromObject(mesh);
  if (box.isEmpty()) return null;
  const center = new Vector3();
  const size = new Vector3();
  box.getCenter(center);
  box.getSize(size);
  return {
    center: [center.x, center.y, center.z],
    // width along Z, height along Y (the +X-facing plane's own axes).
    width: size.z,
    height: size.y,
  };
}

interface CrtScreenSurfaceProps {
  /** True while the camera is docked to the monitor (terminal is the surface).
   *  Only then is the DOM mounted; from room view the texture feed handles it. */
  docked: boolean;
  /** Fires once the mesh search resolves (true = screen located, false = not);
   *  the 2D shell uses `false` to fall back to the overlay. */
  onFound?: (found: boolean) => void;
  /** Reports the measured screen bounds so CafeScene can derive the dock pose.
   *  Fires with `null` when the mesh is missing. */
  onBounds?: (bounds: ScreenBounds | null) => void;
  /** The terminal DOM to render on the tube (built by the 2D-shell agent). */
  children?: React.ReactNode;
  /** Bumps whenever docking (re)begins, so the tube can replay its power-on. */
  powerKey?: number;
  /** Skip the power-on wake animation (reduced motion). */
  reducedMotion?: boolean;
  /** Bumps once the café model has actually loaded. This component mounts as a
   *  SIBLING of the suspending model, so its first search can run against a
   *  still-empty scene graph — this prop re-keys the search after the meshes
   *  are attached. */
  sceneRevision?: number;
}

/**
 * Renders the live terminal onto the physical CRT face when docked. Isolated,
 * data-driven, and lazy: nothing DOM-side mounts until `docked` is true.
 */
export function CrtScreenSurface({
  docked,
  onFound,
  onBounds,
  children,
  powerKey = 0,
  reducedMotion = false,
  sceneRevision = 0,
}: CrtScreenSurfaceProps) {
  const scene = useThree((state) => state.scene);

  // Resolve + measure the screen mesh. Pure read of the R3F scene graph — but
  // NOT once-per-mount: this component is a sibling of the suspending model,
  // so the first pass can see an empty graph. `sceneRevision` bumps when the
  // model reports in, re-keying the search. Null when the mesh is absent.
  const bounds = useMemo<ScreenBounds | null>(() => {
    void sceneRevision; // re-key: the graph mutates without changing identity
    const crtNode = scene.getObjectByName(CRT_NODE_NAME);
    const searchRoot = crtNode ?? scene;
    const mesh = findMeshByMaterialName(searchRoot, SCREEN_MATERIAL_NAME);
    return mesh ? measureScreen(mesh, scene) : null;
  }, [scene, sceneRevision]);

  // Report the resolution up to the 2D shell (found → keep on the tube; not
  // found → fall back to the overlay) and hand CafeScene the measured bounds
  // for the dock pose. This is the sanctioned effect use: syncing derived state
  // out to an external consumer, not driving our own render.
  useEffect(() => {
    onFound?.(bounds !== null);
    onBounds?.(bounds);
  }, [bounds, onFound, onBounds]);

  // Derive the element pixel width from the measured aspect ratio, and the
  // drei transform distanceFactor from the measured world height (see the
  // SIZING MATH note on SCREEN_CSS_HEIGHT). Memoized off the measured bounds.
  const layout = useMemo(() => {
    if (!bounds || bounds.height <= 0 || bounds.width <= 0) return null;
    const cssHeight = SCREEN_CSS_HEIGHT;
    const cssWidth = Math.round(cssHeight * (bounds.width / bounds.height));
    // worldSize = cssPx × distanceFactor / 400  ⇒  factor = 400 × world / cssPx.
    const distanceFactor = (400 * bounds.height) / cssHeight;
    // Anchor: screen center pushed epsilon along +X (the outward normal) so the
    // DOM floats just in front of the phosphor and can't z-fight it.
    const anchor: [number, number, number] = [
      bounds.center[0] + SCREEN_EPSILON,
      bounds.center[1],
      bounds.center[2],
    ];
    return { cssWidth, cssHeight, distanceFactor, anchor };
  }, [bounds]);

  if (!docked || !layout) return null;

  // The screen faces +X. drei's Html transform defaults to facing +Z; rotating
  // +90° about Y brings the DOM's outward normal from +Z round to +X. (−90°
  // points it INTO the wall — the room then sees the back face, mirrored.)
  const faceX = new Euler(0, Math.PI / 2, 0);
  const tubeClass = reducedMotion ? "crt-tube" : "crt-tube crt-tube--waking";

  return (
    <group position={layout.anchor} rotation={faceX}>
      <Html
        transform
        center
        distanceFactor={layout.distanceFactor}
        // Keep the DOM from stealing orbit/scroll behind it; the terminal's own
        // interactive elements re-enable pointer events on themselves.
        pointerEvents="auto"
        zIndexRange={[30, 0]}
      >
        <div
          // `powerKey` in the React key restarts the CSS power-on each dock.
          key={`crt-power-${powerKey}`}
          className={tubeClass}
          style={{
            width: layout.cssWidth,
            height: layout.cssHeight,
          }}
        >
          {children ?? (
            // Placeholder phosphor text for standalone visual checks — the real
            // terminal DOM replaces this via `children` at integration.
            <pre className="crt-tube__placeholder" aria-hidden="true">
              {"CAFE-OS v2.2 — cold start\n"}
              {"mounting /paddock ... ok\n"}
              {"loading portfolio index ... ok\n"}
              {"terminal ready. type 'help'.\n"}
              {"> _"}
            </pre>
          )}
        </div>
      </Html>
    </group>
  );
}
