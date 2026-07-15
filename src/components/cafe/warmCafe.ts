import type {
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
} from "three";
import { Color } from "three";

/**
 * Runtime evening-warmth pass for the baked café glb.
 *
 * The café ships KHR_materials_unlit baked textures (colors come straight from
 * the bake) rendered under a `flat` NoToneMapping canvas — so the only levers
 * we have at runtime are the material colors themselves. Out of Blender the
 * room reads bright-daytime: the window panes carry a cool blue-white emissive
 * that blows to pure white, and the display glass glows cool. This pass repaints
 * only those offenders toward a warm dusk and lays a very gentle warm multiply
 * over the rest for cohesion — WITHOUT flattening the bake into brown mud.
 *
 * Everything here is idempotent per cached scene (WeakMap-guarded, mirroring
 * GarageScene's prepareCar) and mutates only per-material color/emissive — it
 * disposes nothing and shares nothing across scenes.
 */

/** All tunables in one block — adjust by eye, not by touching the traversal. */
const WARMTH = {
  /**
   * Gentle dusk multiply laid over every baked (unlit) surface for cohesion.
   * Keep close to white — heavier values murk the bake into brown. Trims blue
   * a touch more than green/red so the whole room drifts to lamplight, not day.
   */
  globalTint: new Color(1.0, 0.89, 0.75),
  /**
   * Window panes: kill the blown blue-white daylight. Repaint the emissive to a
   * warm amber-grey at roughly half the old luminance so the glass reads as a
   * warm evening exterior behind it, not a lightbox. (old emissive ≈ 0.7–0.88.)
   */
  windowEmissive: new Color(0.42, 0.29, 0.17),
  /** Warm the near-transparent pane tint itself toward amber. */
  windowColorTint: new Color(1.0, 0.84, 0.6),
  /**
   * Display-case glass glows cool white — warm it and pull the glow well down
   * so the exhibits inside stay the focus and the cases read as glass, not lamps.
   */
  glassEmissive: new Color(0.3, 0.25, 0.18),
} as const;

/** Named materials in the café glb (see the glb inventory). */
const MAT = {
  window: "MAT_GlassWindow",
  glassCase: "MAT_GlassCase",
  glassTop: "MAT_GlassTop",
  crtScreen: "MAT_CRTScreen",
} as const;

/** One-shot guard so a re-mount of the drei-cached scene never double-applies. */
const warmed = new WeakMap<object, true>();

function warmMaterial(material: Material): void {
  switch (material.name) {
    case MAT.crtScreen:
      // The live terminal tube — leave it hot.
      return;
    case MAT.window: {
      const std = material as MeshStandardMaterial;
      std.emissive.copy(WARMTH.windowEmissive);
      std.emissiveIntensity = 1;
      std.color.multiply(WARMTH.windowColorTint);
      return;
    }
    case MAT.glassCase:
    case MAT.glassTop: {
      const std = material as MeshStandardMaterial;
      std.emissive.copy(WARMTH.glassEmissive);
      return;
    }
    default: {
      // Baked/unlit surface: gentle warm dusk multiply on the base color, which
      // (for MeshBasicMaterial) tints the whole baked texture.
      const basic = material as MeshBasicMaterial;
      if (basic.color) basic.color.multiply(WARMTH.globalTint);
    }
  }
}

/**
 * Warm the café scene toward evening in place. Idempotent per cached scene.
 */
export function warmCafeMaterials(scene: Object3D): void {
  if (warmed.has(scene)) return;
  scene.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material;
    if (Array.isArray(mat)) mat.forEach(warmMaterial);
    else if (mat) warmMaterial(mat);
  });
  warmed.set(scene, true);
}
