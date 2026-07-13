"use client";

/**
 * CrtScreenFeed — the live mirror on the in-scene CRT monitor (E11).
 *
 * When the terminal session has content and the DOM surface does NOT own the
 * tube (mobile close-up, room view after a session), this paints the last few
 * scrollback lines onto a low-res CanvasTexture and shows it on a thin quad
 * floated a few millimetres in front of the CRT's screen face.
 *
 * Why a quad instead of retexturing the mesh: `MAT_CRTScreen` is authored as a
 * flat emissive color, so the face's UVs are degenerate — mapping a texture
 * onto the mesh samples a single texel and renders a blank screen. The overlay
 * quad brings its own 0..1 UVs, keeps the original emissive glowing untouched
 * behind it, and unmounts cleanly (no material swap/restore bookkeeping).
 *
 * Graceful degradation: if the screen mesh can't be found, it falls back to
 * brightening the CRT node's emissive so the monitor still "wakes", and
 * reports the fallback via a console note — never throws.
 *
 * Mounted by CafeScene with `active` + `lines`. The overlay is set dressing;
 * the canvas is small (320px wide) and repaints at most ~4 fps.
 */

import { useEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import {
  Box3,
  CanvasTexture,
  LinearFilter,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector3,
  type Material,
  type MeshBasicMaterial,
  type Object3D,
} from "three";
import type { TerminalLine } from "./terminalLines";

/** The screen material authored in the café glb (per the Blender report). */
const SCREEN_MATERIAL_NAME = "MAT_CRTScreen";
/** The CRT node the screen lives under. */
const CRT_NODE_NAME = "CRT_Terminal";
/** Low-res feed canvas (set dressing). Landscape to suit the CRT face. */
const CANVAS_W = 320;
const CANVAS_H = 240;
/** Update the texture at most ~4 fps. */
const UPDATE_INTERVAL_MS = 250;
/** How many trailing lines to show on the tiny screen. */
const FEED_LINES = 8;
/** How far the quad floats off the screen face (metres). Kept below the Html
 * surface's 0.005 epsilon so the DOM always wins when both are near. */
const QUAD_EPSILON = 0.004;

/** Find the first mesh in `root` whose material is named `name`. */
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

/** Paint the given lines onto a canvas context (green-on-black, small). Pure
 * side effect on the passed context — no React state involved. */
function paintFeed(
  canvas: HTMLCanvasElement,
  lines: readonly TerminalLine[],
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#02160b";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const shown = lines.slice(-FEED_LINES);
  ctx.font = "14px ui-monospace, monospace";
  ctx.textBaseline = "top";
  let y = 10;
  for (const line of shown) {
    ctx.fillStyle =
      line.tone === "error"
        ? "#ff9d6b"
        : line.tone === "reply"
          ? "#7dff9b"
          : line.tone === "system"
            ? "#4fbf6c"
            : "#c8ffd6";
    // ~35 chars of 14px monospace fit the 300px paintable width.
    const text =
      line.text.length > 34 ? `${line.text.slice(0, 33)}…` : line.text;
    ctx.fillText(text, 10, y);
    y += 20;
    if (y > CANVAS_H - 14) break;
  }
  // scanline wash for the CRT feel
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  for (let sy = 0; sy < CANVAS_H; sy += 3) {
    ctx.fillRect(0, sy, CANVAS_W, 1);
  }
}

interface CrtScreenFeedProps {
  /** Whether the feed should be live (session content + DOM not on the tube). */
  active: boolean;
  /** The current scrollback lines to mirror. */
  lines: readonly TerminalLine[];
}

/** Bundle the canvas + its texture, created once for the component's lifetime. */
interface FeedSurface {
  canvas: HTMLCanvasElement;
  texture: CanvasTexture;
}

function createFeedSurface(): FeedSurface | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  return { canvas, texture };
}

/** World placement of the screen face: center + width (Z), height (Y) and
 * bulge depth (X) — CRT faces are modeled with curvature, so the quad must
 * clear the FRONT of the bulge, not the bbox center. */
interface FeedPlacement {
  readonly center: readonly [number, number, number];
  readonly width: number;
  readonly height: number;
  readonly depth: number;
}

export function CrtScreenFeed({ active, lines }: CrtScreenFeedProps) {
  const scene = useThree((state) => state.scene);

  // Canvas + texture are mutable non-render objects — a lazily-initialized ref
  // (the sanctioned escape hatch). Render NEVER reads it; the texture reaches
  // the material imperatively in the attach effect below, and all painting
  // happens in effects, where ref access and mutation are allowed.
  const surfaceRef = useRef<FeedSurface | null>(null);
  if (surfaceRef.current == null) {
    surfaceRef.current = createFeedSurface();
  }

  const lastUpdateRef = useRef(0);
  const emissiveTargetsRef = useRef<
    { material: MeshStandardMaterial; original: number }[]
  >([]);

  // Locate + measure the screen face. Keyed on `active`: the feed only ever
  // activates after the model is loaded (a session needs the clickable CRT),
  // so this never races the suspending model. Pure scene-graph read.
  const placement = useMemo<FeedPlacement | null>(() => {
    if (!active) return null;
    const crtNode = scene.getObjectByName(CRT_NODE_NAME);
    const searchRoot = crtNode ?? scene;
    const mesh = findMeshByMaterialName(searchRoot, SCREEN_MATERIAL_NAME);
    if (!mesh) return null;
    const box = new Box3().setFromObject(mesh);
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    return {
      center: [center.x, center.y, center.z],
      width: size.z,
      height: size.y,
      depth: size.x,
    };
  }, [scene, active]);

  // Fallback when the mesh is missing: brighten the CRT node's emissive so the
  // monitor still reads as "on" while the feed is active; restore on close.
  useEffect(() => {
    if (!active || placement) return;
    if (typeof console !== "undefined") {
      console.warn(
        `[CrtScreenFeed] '${SCREEN_MATERIAL_NAME}' not found; using emissive-pulse fallback.`,
      );
    }
    const searchRoot = scene.getObjectByName(CRT_NODE_NAME) ?? scene;
    const targets: { material: MeshStandardMaterial; original: number }[] = [];
    searchRoot.traverse((obj) => {
      if (obj instanceof Mesh) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (m instanceof MeshStandardMaterial) {
            targets.push({ material: m, original: m.emissiveIntensity });
            m.emissiveIntensity = Math.max(m.emissiveIntensity, 1.2);
          }
        }
      }
    });
    emissiveTargetsRef.current = targets;
    return () => {
      for (const { material, original } of emissiveTargetsRef.current) {
        material.emissiveIntensity = original;
      }
      emissiveTargetsRef.current = [];
    };
  }, [active, placement, scene]);

  // Attach the canvas texture to the quad's material imperatively — render
  // never touches the surface ref. Until this runs (one commit later), the
  // material's dark base color stands in, so there's no white flash.
  const materialRef = useRef<MeshBasicMaterial | null>(null);
  useEffect(() => {
    const surface = surfaceRef.current;
    const material = materialRef.current;
    if (!active || !placement || !surface || !material) return;
    material.map = surface.texture;
    material.color.set("#ffffff");
    material.needsUpdate = true;
  }, [active, placement]);

  // First paint on activation (throttle-free), then throttled repaints as the
  // lines change (~4 fps — it's set dressing, the panel is the product).
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!active || !placement || !surface) return;
    const now = Date.now();
    if (now - lastUpdateRef.current < UPDATE_INTERVAL_MS) return;
    lastUpdateRef.current = now;
    paintFeed(surface.canvas, lines);
    surface.texture.needsUpdate = true;
  }, [active, placement, lines]);

  // Dispose the texture on unmount.
  useEffect(() => {
    return () => {
      surfaceRef.current?.texture.dispose();
    };
  }, []);

  if (!active || !placement) return null;

  // A thin quad floated just off the screen face. The face's own UVs are
  // degenerate (flat emissive material), so the quad brings its own — and the
  // emissive glow stays alive behind it. Plane normal +Z → rotate to +X.
  return (
    <group
      position={[
        // Clear the FRONT of the (possibly bulged) face, not its bbox center.
        placement.center[0] + placement.depth / 2 + QUAD_EPSILON,
        placement.center[1],
        placement.center[2],
      ]}
      rotation={[0, Math.PI / 2, 0]}
    >
      <mesh>
        <planeGeometry args={[placement.width, placement.height]} />
        {/* Dark base until the attach effect wires the canvas texture in. */}
        <meshBasicMaterial ref={materialRef} color="#02160b" toneMapped={false} />
      </mesh>
    </group>
  );
}
