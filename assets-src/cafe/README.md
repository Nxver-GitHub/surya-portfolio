# GT Café — Blender source

`cafe.blend` is the source for `public/models/cafe.glb` (Sprint: GT Café pavilion).

- Warm automotive-café interior, 10m x 8m x 3.5m, floor at Z=0, origin at floor center.
- All lighting is **baked** (Cycles COMBINED, 96 samples) into four packed atlases:
  `T_CafeArch` / `T_CafeFurn` / `T_CafeProps` (2048px) + `T_CRT` (512px).
- Export objects: `Cafe_Architecture`, `Cafe_Furniture`, `Cafe_Props`, `CRT_Terminal`
  (CRT is kept separate for raycast-by-name; its screen is a live emissive material).
- Materials on export are unlit (Background shader → `KHR_materials_unlit`); no lights
  are exported — re-bake in this file if geometry changes.
- Rebuild pipeline: export GLB (selection only) →
  `pnpm dlx @gltf-transform/cli optimize <raw> public/models/cafe.glb --compress meshopt --texture-compress webp --join false --flatten false --simplify false`
  (never draco; keep join/flatten off to preserve the `CRT_Terminal` node name).
- All memorabilia (wheels, helmet, prints, model cars) uses abstract shapes/colors only —
  no real brand logos, wordmarks, or liveries.
