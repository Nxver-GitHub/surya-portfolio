# GT Café — Blender source (v2, bright gallery rebuild)

`cafe.blend` is the source for `public/models/cafe.glb` (GT Café pavilion).

## Design
Bright automotive-gallery café (Motoring Coffee SF direction): cream walls, glossy
dark-green subway-tile backsplash behind a marble espresso bar, Noguchi-style paper
lantern clusters, warm wood plank floor, large deep-red persian rug dead-center
(reserved flat zone for a ~4.4 m vintage F1 car, long axis = X), south window wall
with daylight, five-table arc (W→E) with tented audience labels, green corduroy
swivel chairs + white sculptural stools, one stacked-racing-tire table with glass
top, CRT workstation nook on the west wall, motorsport corner on the east wall with
three reserved mounting spots (F1 rear wing @ wall, helmet @ shelf, sim rig @ floor).

- Room: 13 × 9 × 3.8 m. Floor Z=0 (Blender), origin at floor center. +X = east,
  +Y = north (bar wall). glTF export is Y-up: gl(x,y,z) = blender(x, z, −y).
- All lighting **baked** (Cycles COMBINED, 96 samples, GPU) with a warm sun through
  the south windows + bright sky world + interior fills (bake-only lights kept in
  the .blend, never exported).

## Textures (all packed; fake-user set)
| Image | Size | Contents |
|---|---|---|
| `T_CafeArch` | 2048 | walls, floor planks, ceiling, tile, mullions, sky/walk |
| `T_CafeFurn` | 2048 | bar, tables, chairs, stools, tire stack, desk, shelves, frames |
| `T_CafeProps` | 2048 | machine, cups, plants, lanterns, books, memorabilia |
| `T_CafeDecor` | 2048 | persian rug (top ~78%×50%) + 5 abstract art canvases |
| `T_CafeTents` | 1024 | 10 rows (front/back per tent), baked from `T_TentSrc` |
| `T_CRT` | 512 | CRT terminal body (screen stays live emissive) |
| `T_DecorSrc` / `T_TentSrc` | — | albedo sources for the decor/tent identity re-bakes |

## Export objects
`Cafe_Architecture`, `Cafe_Furniture`, `Cafe_Props`, `Cafe_Decor`, `Cafe_Glass`,
`CRT_Terminal` (exact name kept — raycast target; screen material `MAT_CRTScreen`
is live emissive green). Glass exports as emissive+alpha BLEND (renders without
scene lights). Everything else is Background-shader → `KHR_materials_unlit`.

## Rebuild pipeline
1. Edit geometry / materials. Sources for rug+art are painted into `T_DecorSrc`
   (numpy scripts) and tent labels rendered to `T_TentSrc` (temp ortho scene,
   Arial Narrow Bold, 10 rows bottom-up: FOUNDERS×2, ENGINEERS×2, VCS×2, OFF THE
   CLOCK×2, QUICK LAP×2).
2. **After ANY pixel edit or bake: `img.pack()` per image or edits silently revert.**
3. Manual matrix bake before joins: `o.data.transform(o.matrix_world);
   o.matrix_world.identity()` — never ops-join unbaked hierarchies.
4. Bake per group: add/select a `BakeTarget` image node in every material, active
   UV = `Atlas` (smart-projected; sky/walk islands shrunk 8%) or `UVMap` for the
   decor/tent identity bakes; `bpy.ops.object.bake(type='COMBINED')`, then pack.
5. Export GLB (selection = the 6 export objects only) →
   `pnpm dlx @gltf-transform/cli optimize <raw> public/models/cafe.glb --compress
   meshopt --texture-compress webp --join false --flatten false --simplify false`
   (never draco; join/flatten off preserves the `CRT_Terminal` node name).
6. Validate: GLB header + JSON chunk parses, `CRT_Terminal` node present, every
   texture resolves via `source` or `extensions.EXT_texture_webp.source`.

## Trademark safety
All liveries, memorabilia, art, and the tire are abstract/logo-free — no real
brand marks, wordmarks, or recognizable trademarked liveries.

Current build: 15,576 tris, 824 KB glb.
