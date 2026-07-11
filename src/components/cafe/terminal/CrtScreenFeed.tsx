"use client";

/**
 * CrtScreenFeed — the "hybrid" scene half of the café terminal (E11).
 *
 * When the 2D terminal is active, this paints the last few scrollback lines onto
 * a low-res CanvasTexture and applies it to the CRT's screen material
 * (`MAT_CRTScreen`, a mesh inside the `CRT_Terminal` node) so the in-scene
 * monitor shows a live, green-on-black mirror of the conversation. On close it
 * restores the screen's original material. The overlay is the product; this is
 * set dressing, so the canvas is small (≤320px wide) and updates at most ~4 fps.
 *
 * Graceful degradation: if the screen material/mesh can't be found (e.g. the glb
 * predates the named material), it falls back to brightening the CRT node's
 * emissive so the monitor still "wakes", and reports the fallback via a console
 * note — never throws, never blocks the terminal.
 *
 * Mounted by CafeScene with `active` + `lines`. Purely a scene effect: no DOM
 * output, no user interaction here.
 */

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import {
  CanvasTexture,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
  type Material,
  type Object3D,
} from "three";
import type { TerminalLine } from "./terminalLines";

/** The screen material authored in the café glb (per the Blender report). */
const SCREEN_MATERIAL_NAME = "MAT_CRTScreen";
/** The CRT node the screen lives under. */
const CRT_NODE_NAME = "CRT_Terminal";
/** Low-res feed canvas (set dressing). Portrait-ish to suit a CRT face. */
const CANVAS_W = 320;
const CANVAS_H = 240;
/** Update the texture at most ~4 fps. */
const UPDATE_INTERVAL_MS = 250;
/** How many trailing lines to show on the tiny screen. */
const FEED_LINES = 8;

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
    const text =
      line.text.length > 40 ? `${line.text.slice(0, 39)}…` : line.text;
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
  /** Whether the terminal overlay is open (drives wake/restore). */
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
  texture.flipY = true;
  return { canvas, texture };
}

export function CrtScreenFeed({ active, lines }: CrtScreenFeedProps) {
  const scene = useThree((state) => state.scene);

  // The canvas + texture are mutable, non-render objects (a Three texture is
  // imperatively updated), so they live in a ref — the sanctioned escape hatch —
  // created once on first use. This keeps the React Compiler lint rules happy:
  // refs are explicitly allowed to be mutated outside render.
  const surfaceRef = useRef<FeedSurface | null>(null);
  if (surfaceRef.current === null) {
    surfaceRef.current = createFeedSurface();
  }

  // Swap bookkeeping so we can restore exactly what we replaced.
  const targetMeshRef = useRef<Mesh | null>(null);
  const originalMaterialRef = useRef<Material | Material[] | null>(null);
  const feedMaterialRef = useRef<MeshBasicMaterial | null>(null);
  const emissiveTargetsRef = useRef<
    { material: MeshStandardMaterial; original: number }[]
  >([]);
  const lastUpdateRef = useRef(0);
  const activeSwapRef = useRef(false);

  // Wake on activate: swap in the feed material (or fall back to emissive).
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!active || !surface) return;
    const { canvas, texture } = surface;

    const crtNode = scene.getObjectByName(CRT_NODE_NAME);
    const searchRoot = crtNode ?? scene;
    const mesh = findMeshByMaterialName(searchRoot, SCREEN_MATERIAL_NAME);

    if (mesh) {
      targetMeshRef.current = mesh;
      originalMaterialRef.current = mesh.material;
      const feed = new MeshBasicMaterial({ map: texture, toneMapped: false });
      feedMaterialRef.current = feed;
      mesh.material = feed;
      activeSwapRef.current = true;
      paintFeed(canvas, lines);
      texture.needsUpdate = true;
    } else {
      if (typeof console !== "undefined") {
        console.warn(
          `[CrtScreenFeed] '${SCREEN_MATERIAL_NAME}' not found; using emissive-pulse fallback.`,
        );
      }
      const targets: { material: MeshStandardMaterial; original: number }[] = [];
      searchRoot.traverse((obj) => {
        if (obj instanceof Mesh) {
          const mats = Array.isArray(obj.material)
            ? obj.material
            : [obj.material];
          for (const m of mats) {
            if (m instanceof MeshStandardMaterial) {
              targets.push({ material: m, original: m.emissiveIntensity });
              m.emissiveIntensity = Math.max(m.emissiveIntensity, 1.2);
            }
          }
        }
      });
      emissiveTargetsRef.current = targets;
    }

    return () => {
      const mesh2 = targetMeshRef.current;
      if (mesh2 && originalMaterialRef.current) {
        mesh2.material = originalMaterialRef.current;
      }
      feedMaterialRef.current?.dispose();
      feedMaterialRef.current = null;
      targetMeshRef.current = null;
      originalMaterialRef.current = null;
      activeSwapRef.current = false;

      for (const { material, original } of emissiveTargetsRef.current) {
        material.emissiveIntensity = original;
      }
      emissiveTargetsRef.current = [];
    };
    // `lines` intentionally excluded — the wake effect seeds the first paint;
    // ongoing repaints are handled by the throttled effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, scene]);

  // Throttled repaint as the lines change while active (~4 fps). Only paints on
  // the material-swap path (the fallback has no texture to update).
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!active || !surface || !activeSwapRef.current) return;
    const now = Date.now();
    if (now - lastUpdateRef.current < UPDATE_INTERVAL_MS) return;
    lastUpdateRef.current = now;
    paintFeed(surface.canvas, lines);
    surface.texture.needsUpdate = true;
  }, [active, lines]);

  // Dispose the texture on unmount.
  useEffect(() => {
    return () => {
      surfaceRef.current?.texture.dispose();
    };
  }, []);

  return null;
}
