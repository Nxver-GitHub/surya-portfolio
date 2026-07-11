/**
 * GT Café exhibit system — content layer.
 *
 * The café doubles as a small motorsport museum: provenance-vetted, CC-licensed
 * 3D pieces (a rug-mounted show car, a helmet on a shelf, later more) are shown
 * as clickable "exhibits". Clicking one flies the camera in and raises a GT-style
 * plate with the piece's name, a plain-English flavour line, and its full CC
 * attribution.
 *
 * Adding a piece is a CONTENT-ONLY operation: append one typed entry to the
 * `exhibits` array below and drop its `.glb` under `public/models/`. No scene,
 * camera, or UI component changes are required — `ExhibitPiece`/`CameraRig`/
 * `CafeBrowser` all iterate this array.
 */

/** A world-space transform in the café glb's local coordinate space (glTF
 * Y-up, metres). Shared by every mount and by each exhibit's placement. */
export interface Transform3D {
  /** Position [x, y, z] in metres. */
  readonly position: readonly [number, number, number];
  /** Yaw about +Y in radians — orients the piece toward the room. */
  readonly rotationY: number;
  /** Uniform scale applied to the loaded glb. Defaults to 1 when omitted. */
  readonly scale?: number;
}

/**
 * A reserved display stage in the baked café scene. These are fixed anchor
 * points (from the Blender bake report) that an exhibit's `mount` builds on —
 * a piece picks a stage's position/orientation and adds its own scale/offset.
 * MOUNTS is documentation-as-data: it records where pieces are allowed to sit.
 */
export interface ExhibitMount {
  /** Human label for the stage (report/debug only). */
  readonly label: string;
  /** Anchor position [x, y, z] in metres, café-local space. */
  readonly position: readonly [number, number, number];
  /** Suggested facing (yaw about +Y, radians) so the piece reads toward the room. */
  readonly rotationY: number;
  /** Short note on the usable footprint, from the bake report. */
  readonly clearance: string;
}

/**
 * The café's reserved exhibit stages, taken from the glTF bake report
 * (Y-up, metres). Coordinates are authoritative; an exhibit's `mount` normally
 * copies a stage's `position`/`rotationY` and layers scale + any fine offset.
 */
export const MOUNTS = {
  /** Centre rug — the show-car stage. Long display axis runs along +X. */
  rugStage: {
    label: "Centre rug (show-car stage)",
    position: [0, 0.024, 0],
    rotationY: 0,
    clearance: "clear zone x∈[−2.2,2.2], z∈[−0.9,0.9]; long axis +X",
  },
  /** East wall plane x=6.44 — a wall-hung piece (e.g. a rear wing) facing −X. */
  wingWall: {
    label: "East wall mount",
    position: [6.44, 1.6, -1.2],
    rotationY: -Math.PI / 2,
    clearance: "on wall plane x=6.44; piece faces −X into the room",
  },
  /** Shelf on the motorsport corner — a helmet-sized piece. */
  helmetShelf: {
    label: "Motorsport-corner shelf",
    position: [6.32, 1.42, 1.5],
    rotationY: -Math.PI / 2,
    clearance: "~0.4m usable width",
  },
  /** Floor beside the sim rig — a floor-standing piece. */
  simRigFloor: {
    label: "Sim-rig floor zone",
    position: [5.6, 0.01, -2.7],
    rotationY: -Math.PI / 2,
    clearance: "zone 1.5m (X) × 2.0m (Z)",
  },
} as const satisfies Record<string, ExhibitMount>;

/** The reserved-stage keys, for typed references and iteration. */
export type MountId = keyof typeof MOUNTS;

/**
 * Attribution for a CC-licensed third-party model. Modelled on `modelCredit` in
 * content/cars.ts, plus `authorUrl` so the author is a link too — the exhibit
 * plate credits all three of title, author, and license as links.
 */
export interface ExhibitCredit {
  /** Model title as published (e.g. "Lancia Stratos HF"). */
  readonly title: string;
  /** Author / creator handle. */
  readonly author: string;
  /** Author's profile URL (https). */
  readonly authorUrl: string;
  /** Hosting source, e.g. "Sketchfab". */
  readonly source: string;
  /** The model's page URL (https). */
  readonly url: string;
  /** License name, e.g. "CC BY 4.0". */
  readonly license: string;
  /** License deed URL (https). */
  readonly licenseUrl: string;
}

/** A camera pose (position + look-at) in café-local space, for an override. */
export interface ExhibitCameraOverride {
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
}

/**
 * A museum exhibit: one CC-licensed glb placed at a mount, with the copy and
 * attribution shown when it's focused. Pure content — no behaviour lives here.
 */
export interface Exhibit {
  /** Stable unique id (kebab-case), also the focus key. */
  readonly id: string;
  /** Display name shown on the plate and the hover label. */
  readonly name: string;
  /** Plain-English, factual one-liner (no game metaphor). */
  readonly flavor: string;
  /** Public glb path — must start with `/models/cafe-`. */
  readonly modelPath: string;
  /** Where and how the piece sits in the scene (built on a MOUNTS stage). */
  readonly mount: Transform3D;
  /**
   * How far the derived framing camera sits back from the piece, toward room
   * centre (metres). Tune per piece size: larger for a car, smaller for a
   * helmet. Ignored when `cameraOverride` is set. Defaults to a mid distance.
   */
  readonly frameDistance?: number;
  /** Fully-authored camera pose; when set, overrides the derived framing. */
  readonly cameraOverride?: ExhibitCameraOverride;
  /** CC attribution — required for every shipped piece. */
  readonly credit: ExhibitCredit;
}

/**
 * The exhibit roster. SHIPS EMPTY — the first real piece (the Lancia Stratos on
 * the rug) lands in a separate change. Copy the commented template below,
 * uncomment it, point `modelPath` at your committed `/models/cafe-<slug>.glb`,
 * and fill in the real credit; nothing else needs to change.
 *
 * Template (rugStage-mounted show car):
 *
 * {
 *   id: "stratos",
 *   name: "Lancia Stratos HF",
 *   flavor:
 *     "The wedge-shaped Group 4 rally weapon that won the WRC three years running (1974–76).",
 *   modelPath: "/models/cafe-stratos.glb",
 *   mount: {
 *     position: MOUNTS.rugStage.position,
 *     rotationY: MOUNTS.rugStage.rotationY,
 *     scale: 1,
 *   },
 *   frameDistance: 3.4,
 *   credit: {
 *     title: "Lancia Stratos HF",
 *     author: "Some Author",
 *     authorUrl: "https://sketchfab.com/someauthor",
 *     source: "Sketchfab",
 *     url: "https://sketchfab.com/3d-models/lancia-stratos-hf-xxxxxxxx",
 *     license: "CC BY 4.0",
 *     licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
 *   },
 * },
 */
export const exhibits: readonly Exhibit[] = [
  {
    id: "stratos",
    name: "Lancia Stratos HF",
    flavor:
      "The wedge-shaped Group 4 rally weapon that won the World Rally Championship three years running (1974–76).",
    modelPath: "/models/cafe-stratos.glb",
    mount: {
      // Rug show-car stage, parked ~15° off-axis, nose toward the window —
      // the overhang past the F1 clear zone lands on rug, clear of the tables.
      position: MOUNTS.rugStage.position,
      rotationY: 0.26,
    },
    frameDistance: 3.4,
    credit: {
      title: "Lancia Stratos HF - Rally - Alitalia Livery",
      author: "James Slater",
      authorUrl: "https://sketchfab.com/JamesSlater",
      source: "Sketchfab",
      url: "https://sketchfab.com/models/76dfbe905346419d817fa03d1e46e547",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    },
  },
  {
    id: "helmet",
    name: "Senna-Inspired F1 Helmet",
    flavor:
      "A modern Grand Prix helmet repainted in the yellow, green and blue colour language of Ayrton Senna.",
    modelPath: "/models/cafe-helmet.glb",
    mount: {
      // Motorsport-corner shelf. The glb is authored visor-facing −X (into the
      // room from the east wall), so no additional yaw is needed.
      position: MOUNTS.helmetShelf.position,
      rotationY: 0,
    },
    frameDistance: 1.1,
    credit: {
      title: "F1 Helmet ZhouGuanyu 24",
      author: "miopass",
      authorUrl: "https://sketchfab.com/miopass",
      source: "Sketchfab",
      url: "https://sketchfab.com/models/1124fa1f754645d7b9d54de84009d463",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    },
  },
  {
    id: "mp44-wheel",
    name: "MP4/4 Steering Wheel (1988)",
    flavor:
      "The three-spoke suede wheel of the 1988 McLaren MP4/4 — the car that won 15 of 16 grands prix that season.",
    modelPath: "/models/cafe-wheel.glb",
    mount: {
      // Same east-wall shelf run, beside the helmet's spot; authored face −X.
      position: [6.32, 1.42, 0.95],
      rotationY: 0,
    },
    frameDistance: 1.1,
    credit: {
      title: "MP4/4 Steering wheel (1988)",
      author: "kenkento.zapater",
      authorUrl: "https://sketchfab.com/kenkento.zapater",
      source: "Sketchfab",
      url: "https://sketchfab.com/models/bec20f3649c74cfcaa5a6fdddd7dea80",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    },
  },
];

/** Exhibit lookup by id, for the scene and UI to resolve a focus target. */
export const exhibitById: ReadonlyMap<string, Exhibit> = new Map(
  exhibits.map((e) => [e.id, e]),
);
