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

Current build: 15,576 tris, 816 KB glb. The five wall-art canvases in
`T_DecorSrc` are gallery motorsport posters (numpy-painted, 4× supersampled):
Monaco circuit ribbon, Le Mans dusk endurance, Gulf colour study, Group-B
tricolour wedge, Martini stripe study — pure shape/colour, no text/logos. The
rug (top ~78%×50% of `T_CafeDecor`) is preserved byte-for-byte across re-bakes:
the decor identity-bake result is spliced into the shipped `T_CafeDecor` only at
the five art UV rects, never over rug texels.

## Motorsport-corner exhibits (`wing.blend`, `simrig.blend`)
Two self-contained exhibit pieces for the east-wall motorsport corner. Both
follow the café's **Background-shader → `KHR_materials_unlit`** convention: a
neutral bright-gallery light rig (bake-only, deleted before export) is baked
COMBINED into ONE 1024 atlas, then every material becomes an unlit Background
sampling that atlas via `UVMap` — matching the room's baked value range. Same
export recipe as the café: `@gltf-transform optimize … --compress meshopt
--texture-compress webp --join false --flatten false --simplify false` (never
draco; join/flatten off preserves the single root node name). **Recalc normals
outside before baking** — inward-flipped faces bake pure black.

- **`wing.blend` → `public/models/cafe-wing.glb`** — Group C / GT1-style
  single-element endurance rear wing (wall display). One `Cafe_Wing` node,
  664 tris, 42 KB. glTF Y-up; display face toward −X; SPAN along Z (~1.51 m);
  cleat plate back flush on x=0; vertically centred at y=0. W×H×D ≈
  1.51 × 0.32 × 0.32 m. Carbon airfoil + two endplates with a Gulf-orange
  accent band + twin swan-neck pylons on a slim dark wall cleat. Site mounts at
  `MOUNTS.wingWall` (6.44, 1.6, −1.2). Suggested `frameDistance` ≈ 2.0.
- **`simrig.blend` → `public/models/cafe-simrig.glb`** — modern sim-racing rig
  (floor display). One `Cafe_SimRig` node, 880 tris, 78 KB. glTF Y-up; origin at
  footprint centre on the floor (sits on y=0); driver faces −X (rotationY 0 puts
  the monitor back toward the east wall, seat reads three-quarter from the room).
  Footprint 1.48 (X) × 1.90 (Z) m, height 1.22 m. 8020-style anodised frame,
  black bucket seat with a red livery accent stripe, 3-pedal tray, wheel-base +
  round suede wheel, ~32″ monitor with a faint blue screen tint on a
  frame-mounted stand, thin floor mat. Site mounts at `MOUNTS.simRigFloor`
  (5.6, 0.01, −2.7). Suggested `frameDistance` ≈ 2.4.
