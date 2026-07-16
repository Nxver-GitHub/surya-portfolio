"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  Html,
  Lightformer,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import { Color, Vector3 } from "three";
import type { Group, Object3D } from "three";
import { warmCafeMaterials } from "./warmCafe";
import { menuBooks, type MenuBook } from "../../../content/menu-books";
import { exhibits, exhibitById, type Exhibit } from "../../../content/cafe-exhibits";
import { useReducedMotion } from "../garage/useReducedMotion";
import { ExhibitPiece } from "./ExhibitPiece";
import { CrtScreenFeed } from "./terminal/CrtScreenFeed";
import { CrtScreenSurface } from "./CrtScreenSurface";
import type { TerminalLine } from "./terminal/terminalLines";
import {
  CAMERA_BOUNDS,
  CRT_NODE_NAME,
  OVERVIEW_POSE,
  CRT_POSE,
  crtDockFallback,
  clampToRoom,
  crtDockPose,
  exhibitFramePose,
  tableFrontPose,
  type CameraPose,
  type ScreenBounds,
} from "./cameraPoses";

/** Contract: the café model lives here. Blender agent exports meshopt-
 * compressed glb to this public path; drei's loader decodes meshopt itself. */
const CAFE_MODEL_PATH = "/models/cafe.glb";

/** Camera-flight duration (ms). Longer than the 150–250ms UI motion is fine
 * for a scripted flight; same mechanical easing family, no bounce/overshoot. */
const FLIGHT_MS = 800;

/** The site's mechanical easing (cubic-bezier(0.16, 1, 0.3, 1)) as a scalar
 * ease for a 0→1 flight progress. A decelerating ease-out, no overshoot. */
function easeMechanical(t: number): number {
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  return 1 - Math.pow(1 - clamped, 3);
}

/** What the camera is currently framing. Books carry their anchor so the rig
 * derives the pose with one shared rule; crt/room use fixed poses. */
export type CafeFocus =
  | { kind: "room" }
  | { kind: "book"; bookId: string }
  | { kind: "crt" }
  | { kind: "exhibit"; exhibitId: string }
  // Free-roam: the user is driving the camera with WASD/arrows. No scripted
  // pose — the rig stops flying and lets the keyboard pan the eye + target.
  | { kind: "free" };

interface CafeModelProps {
  onCrtFound: (present: boolean) => void;
  onSelectCrt: () => void;
}

function CafeModel({ onCrtFound, onSelectCrt }: CafeModelProps) {
  // Throws to the SceneErrorBoundary if the glb is absent/malformed (the
  // proven path in this worktree until the real model lands at integration).
  const { scene } = useGLTF(CAFE_MODEL_PATH);

  // Evening-warmth pass on the baked materials (idempotent per cached scene):
  // tames the blown-white window panes and cool display glass toward a warm
  // dusk, and lays a gentle warm multiply over the rest. Runs in render like
  // GarageScene's prepareCar — the WeakMap guard makes repeat calls free.
  warmCafeMaterials(scene);

  // Resolve the CRT node once per loaded scene; degrade gracefully if absent.
  const crt = useMemo<Object3D | null>(
    () => scene.getObjectByName(CRT_NODE_NAME) ?? null,
    [scene],
  );

  // World-space collider position: today's glb keeps a flat node list, but a
  // future re-export could nest CRT_Terminal under a parent transform — local
  // position would then silently drift from the visible mesh.
  const crtWorldPos = useMemo<Vector3 | null>(() => {
    if (!crt) return null;
    scene.updateMatrixWorld(true);
    return crt.getWorldPosition(new Vector3());
  }, [crt, scene]);

  useEffect(() => {
    onCrtFound(crt !== null);
  }, [crt, onCrtFound]);

  // Lighting is baked in Blender (per CLAUDE.md), so render the scene as-is.
  // A transparent invisible collider over the CRT node carries the click, so
  // the raycast target is stable regardless of the node's own geometry.
  return (
    <>
      <primitive object={scene} />
      {crtWorldPos ? (
        <mesh
          position={crtWorldPos}
          onClick={(event) => {
            event.stopPropagation();
            onSelectCrt();
          }}
        >
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ) : null}
    </>
  );
}

interface BookMarkerProps {
  book: MenuBook;
  isActive: boolean;
  onSelect: (book: MenuBook) => void;
  idle: boolean;
  /** True when the camera is flown-in and framing THIS book. The in-scene label
   *  is suppressed then — the camera sits ~2.5m off so the label would balloon
   *  over the whole object, and the 2D FocusLabel plate already names it. */
  focused: boolean;
}

/** A floating, glowing stylized book that marks a Menu Book on a café table.
 * Uses the book's own enamel cover color. Clicking it selects that book. Bobs
 * gently unless reduced motion is set; hover/active shows an HTML label. */
function BookMarker({ book, isActive, onSelect, idle, focused }: BookMarkerProps) {
  const ref = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const { x, y, z } = book.anchor;
  const { color, label } = book.cover;

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    // idle bob + slow spin; frozen (but still lifted) under reduced motion
    ref.current.position.y = y + (idle ? Math.sin(t * 1.4 + x) * 0.06 : 0);
    if (idle) ref.current.rotation.y = t * 0.5;
  });

  const lit = isActive || hovered;
  // Unlit world (see warmCafe): the marker matches it with meshBasicMaterial and
  // fakes its "glow" purely through color. Resting sits a touch under the enamel
  // cover so it reads as a solid object; lit brightens past it for the interactive
  // pop the old emissive + halo used to carry. Memoized so the frame loop is free.
  const restColor = useMemo(() => new Color(color).multiplyScalar(0.8), [color]);
  const litColor = useMemo(() => new Color(color).multiplyScalar(1.5), [color]);
  const bodyColor = lit ? litColor : restColor;

  return (
    <group
      ref={ref}
      position={[x, y, z]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(book);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* book body — the audience's enamel cover color, unlit to match the world */}
      <mesh>
        <boxGeometry args={[0.26, 0.34, 0.05]} />
        <meshBasicMaterial color={bodyColor} toneMapped={false} />
      </mesh>
      {/* pages block, peeking from the fore-edge */}
      <mesh position={[0, 0, 0.028]}>
        <boxGeometry args={[0.22, 0.3, 0.012]} />
        <meshBasicMaterial color="#f4f2ef" />
      </mesh>
      {/* Hover/active label — enhancement-only; the same info is mirrored in the
          2D UI for keyboard users, so this is never the sole source. Suppressed
          while this book is the flown-in focus (label would fill the frame). */}
      {lit && !focused ? (
        <Html center distanceFactor={6} position={[0, 0.34, 0]} zIndexRange={[20, 0]}>
          <div
            style={{
              transform: "translateY(-100%)",
              // Wraps (rather than clipping via the canvas's overflow-hidden
              // box) so the longest Menu Book title — "The Agent Collection",
              // "Hackathon Grand Prix" — renders in full instead of cutting
              // mid-word.
              whiteSpace: "normal",
              maxWidth: 150,
              textAlign: "center",
              background: "#0a0a0b",
              border: `2px solid ${color}`,
              boxShadow: "2px 3px 0 rgba(0,0,0,0.7)",
              padding: "4px 8px",
              pointerEvents: "none",
              fontFamily: "var(--font-display, sans-serif)",
              textTransform: "uppercase",
            }}
          >
            <div
              style={{
                color,
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "0.18em",
              }}
            >
              {label}
            </div>
            <div style={{ color: "#e6e6e6", fontSize: 12, fontWeight: 700 }}>
              {book.title}
            </div>
          </div>
        </Html>
      ) : null}
    </group>
  );
}

interface CameraRigProps {
  focus: CafeFocus;
  idle: boolean;
  reducedMotion: boolean;
  /** True while docked to the CRT (terminal is the live surface): the rig flies
   *  to the head-on dock pose instead of the desk-front CRT_POSE, and orbit is
   *  disabled just as during a flight. */
  docked: boolean;
  /** Measured screen bounds (from CrtScreenSurface) — when present the dock pose
   *  is derived from them; when null the hardcoded CRT_DOCK_FALLBACK is used. */
  screenBounds: ScreenBounds | null;
  /** Live set of held free-roam keys (lowercased: w/a/s/d + arrow names). A ref
   *  so key presses drive useFrame without re-rendering the scene. */
  roamKeys: React.RefObject<Set<string>>;
  /** The scene is engaged (hovered/focused): auto-rotate pauses so the idle spin
   *  doesn't fight the user looking around or roaming. */
  engaged: boolean;
}

/** Free-roam translation speed (metres/second) for WASD/arrow movement. */
const ROAM_SPEED = 3.2;

/**
 * Drives the scripted camera flights. Keeps the base OrbitControls (so the user
 * can still orbit gently around whatever is focused) and, whenever the focus
 * changes, tweens both the camera position and the controls target from their
 * current values to the focus pose over FLIGHT_MS with mechanical easing.
 * Reduced motion → instant cut. Auto-rotate is on only in room view.
 */
function CameraRig({
  focus,
  idle,
  reducedMotion,
  docked,
  screenBounds,
  roamKeys,
  engaged,
}: CameraRigProps) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const camera = useThree((state) => state.camera);

  // Flight state, kept in refs so useFrame reads without re-subscribing.
  const fromPos = useRef(new Vector3());
  const fromTarget = useRef(new Vector3());
  const toPos = useRef(new Vector3());
  const toTarget = useRef(new Vector3());
  const elapsed = useRef(0);
  const playing = useRef(false);
  const mounted = useRef(false);
  // Scratch vectors for the roam math (per-instance; the rig is a singleton).
  const roamFwd = useRef(new Vector3());
  const roamRight = useRef(new Vector3());
  const roamMove = useRef(new Vector3());
  // State mirror of `playing` — gates OrbitControls so a mid-flight drag or
  // scroll can't write to the camera in the same frame as the tween.
  const [flying, setFlying] = useState(false);

  // Live canvas aspect — the dock pose must fit the REAL panel (4:5 portrait
  // on phones, 3:2 on desktop), not a hardcoded ratio. Re-renders on resize.
  const panelAspect = useThree((state) => state.size.width / state.size.height);

  const pose = useMemo<CameraPose | null>(() => {
    // Free-roam owns the camera directly (no scripted destination) — return null
    // so the flight effect leaves the eye where the keys put it.
    if (focus.kind === "free") return null;
    // Fixed poses (CRT/overview) are authored inside the box; derived table/
    // exhibit poses are already clamped in cameraPoses. Clamp the eye here too
    // so every flight destination is provably inside the room.
    let raw: CameraPose;
    if (focus.kind === "crt") {
      // Docked → head-on dock pose (derived from the measured screen when we
      // have it, else the hardcoded fallback). Not docked → the desk-front
      // CRT_POSE approach framing.
      if (docked) {
        raw = screenBounds
          ? crtDockPose(screenBounds, panelAspect)
          : crtDockFallback(panelAspect);
      } else {
        raw = CRT_POSE;
      }
    } else if (focus.kind === "book") {
      const book = menuBooks.find((b) => b.id === focus.bookId);
      raw = book ? tableFrontPose(book.anchor) : OVERVIEW_POSE;
    } else if (focus.kind === "exhibit") {
      const exhibit = exhibitById.get(focus.exhibitId);
      // In-place pieces (the rug show car) present their plate without a
      // flight — no destination, the camera stays where the visitor left it.
      if (exhibit?.inPlaceFocus) return null;
      raw = exhibit ? exhibitFramePose(exhibit) : OVERVIEW_POSE;
    } else raw = OVERVIEW_POSE;
    return { position: clampToRoom(raw.position), target: raw.target };
  }, [focus, docked, screenBounds, panelAspect]);

  // Begin (or, under reduced motion / on first mount, immediately complete) a
  // flight whenever the destination pose changes. A rapid focus change mid-
  // flight redirects from the current camera state and restarts the full
  // FLIGHT_MS — intentional: every flight reads as one complete move.
  useEffect(() => {
    const ctrl = controls.current;
    if (!ctrl) return;

    // Free-roam: no destination — cancel any flight (ref only; useFrame syncs
    // the `flying` state off `playing` so OrbitControls re-enables) and hand
    // control to the keys.
    if (!pose) {
      playing.current = false;
      return;
    }

    toPos.current.set(pose.position[0], pose.position[1], pose.position[2]);
    toTarget.current.set(pose.target[0], pose.target[1], pose.target[2]);

    if (reducedMotion || !mounted.current) {
      // Instant cut: reduced motion always; first mount seeds the controls
      // target imperatively (no declarative `target` prop — it would re-apply
      // on re-renders and stomp the tweened value mid-flight).
      mounted.current = true;
      camera.position.copy(toPos.current);
      ctrl.target.copy(toTarget.current);
      ctrl.update();
      playing.current = false;
      setFlying(false);
      return;
    }

    fromPos.current.copy(camera.position);
    fromTarget.current.copy(ctrl.target);
    elapsed.current = 0;
    playing.current = true;
    setFlying(true);
  }, [pose, reducedMotion, camera]);

  useFrame((_, delta) => {
    const ctrl = controls.current;
    if (!ctrl) return;

    // Sync the flight-gate state off the ref: entering free-roam clears
    // `playing` without a setState (that's banned in effects), so re-enable
    // OrbitControls here the next frame.
    if (!playing.current && flying) setFlying(false);

    if (playing.current) {
      // Accumulate clamped frame deltas so a tab-throttled or very long first
      // frame can't collapse the whole flight into a single snap.
      elapsed.current += Math.min(delta, 0.1) * 1000;
      const raw = elapsed.current / FLIGHT_MS;
      const eased = easeMechanical(raw);

      camera.position.lerpVectors(fromPos.current, toPos.current, eased);
      ctrl.target.lerpVectors(fromTarget.current, toTarget.current, eased);
      ctrl.update();

      if (raw >= 1) {
        playing.current = false;
        setFlying(false);
      }
    }

    // Free-roam: WASD/arrows pan the eye + target together across the floor
    // plane. Only when not flying and not docked (the terminal owns the keys
    // then). Movement is relative to where the camera looks, projected flat.
    const keys = roamKeys.current;
    if (keys && keys.size > 0 && !playing.current && !docked && focus.kind !== "crt") {
      const fwd =
        (keys.has("w") || keys.has("arrowup") ? 1 : 0) -
        (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
      const strafe =
        (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
        (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
      if (fwd !== 0 || strafe !== 0) {
        // Forward = eye→target on the floor plane; right = forward × up.
        roamFwd.current.set(
          ctrl.target.x - camera.position.x,
          0,
          ctrl.target.z - camera.position.z,
        );
        if (roamFwd.current.lengthSq() < 1e-6) roamFwd.current.set(0, 0, -1);
        roamFwd.current.normalize();
        roamRight.current.set(-roamFwd.current.z, 0, roamFwd.current.x);
        roamMove.current
          .set(0, 0, 0)
          .addScaledVector(roamFwd.current, fwd)
          .addScaledVector(roamRight.current, strafe);
        if (roamMove.current.lengthSq() > 0) {
          roamMove.current
            .normalize()
            .multiplyScalar(ROAM_SPEED * Math.min(delta, 0.1));
          // Method calls only (camera is a hook value — no property assignment).
          // roamMove has y=0, so this pans on the floor plane. The per-frame
          // clamp block below keeps the eye inside the room.
          camera.position.add(roamMove.current);
          // Pan the target with the eye, clamped into the room so you can't aim
          // the pivot out through a wall.
          ctrl.target.add(roamMove.current);
          ctrl.target.setX(
            Math.min(CAMERA_BOUNDS.maxX, Math.max(CAMERA_BOUNDS.minX, ctrl.target.x)),
          );
          ctrl.target.setZ(
            Math.min(CAMERA_BOUNDS.maxZ, Math.max(CAMERA_BOUNDS.minZ, ctrl.target.z)),
          );
          ctrl.update();
        }
      }
    }

    // Contain the camera EYE inside the room every frame — both mid-flight and
    // during free orbit / auto-rotate. Clamp AFTER OrbitControls (auto-rotate)
    // and the flight lerp have written this frame's position, so nothing can
    // push the eye through a wall. If clamping moved the eye, re-run the
    // controls so its spherical is recomputed from the clamped point (it then
    // slides along the wall next frame instead of passing through).
    const { x, y, z } = camera.position;
    const cx = x < CAMERA_BOUNDS.minX ? CAMERA_BOUNDS.minX : x > CAMERA_BOUNDS.maxX ? CAMERA_BOUNDS.maxX : x;
    const cy = y < CAMERA_BOUNDS.minY ? CAMERA_BOUNDS.minY : y > CAMERA_BOUNDS.maxY ? CAMERA_BOUNDS.maxY : y;
    const cz = z < CAMERA_BOUNDS.minZ ? CAMERA_BOUNDS.minZ : z > CAMERA_BOUNDS.maxZ ? CAMERA_BOUNDS.maxZ : z;
    if (cx !== x || cy !== y || cz !== z) {
      camera.position.set(cx, cy, cz);
      if (!playing.current) ctrl.update();
    }
  });

  // Auto-rotate only when idling in room view, no flight is running, and the
  // user isn't engaging the scene (hovering/roaming) — the idle spin must never
  // fight the user trying to look around or drive with the keys.
  const autoRotate = idle && focus.kind === "room" && !engaged;

  // No declarative `target` prop: the rig owns the target imperatively (the
  // mount effect seeds it, flights tween it). Damping off — it would layer
  // OrbitControls' own smoothing on top of the hand-tweened flight.
  return (
    <OrbitControls
      ref={controls}
      // Disabled during a scripted flight AND while docked — a docked terminal
      // is a fixed head-on read; orbiting would fight the DOM plane and re-open
      // walls behind the monitor. The per-frame clamp block still runs.
      enabled={!flying && !docked}
      enableDamping={false}
      autoRotate={autoRotate}
      autoRotateSpeed={0.5}
      enablePan={false}
      enableZoom
      // The docked eye sits ~0.3m off the CRT face — far inside the room-view
      // zoom floor. ctrl.update() enforces these even while disabled, so the
      // floor must relax during a dock or it shoves the camera back to 1.4m.
      minDistance={docked ? 0.1 : 1.4}
      maxDistance={6.6}
      minPolarAngle={1.05}
      maxPolarAngle={Math.PI / 2.05}
    />
  );
}

interface CafeSceneProps {
  selectedId: string;
  focus: CafeFocus;
  onSelect: (book: MenuBook) => void;
  onSelectCrt: () => void;
  onCrtFound: (present: boolean) => void;
  /** Focus an exhibit (from an in-scene click). */
  onSelectExhibit: (exhibit: Exhibit) => void;
  /** Reports an exhibit's glb load result, so the UI lists only live pieces. */
  onExhibitAvailability: (exhibit: Exhibit, available: boolean) => void;
  /** True while the 2D terminal overlay is open — wakes the CRT screen feed. */
  terminalActive?: boolean;
  /** The terminal scrollback to mirror onto the CRT screen (set dressing). */
  terminalLines?: readonly TerminalLine[];
  /** The live terminal DOM to render on the physical CRT face when docked. When
   *  present (and the CRT is focused and the screen mesh is found), the camera
   *  docks head-on and this renders on the tube via CrtScreenSurface. */
  screenContent?: React.ReactNode;
  /** Fires once the screen-mesh search resolves (true = found). The 2D shell
   *  uses `false` to keep the terminal in its overlay instead of the tube. */
  onScreenSurface?: (found: boolean) => void;
  /** Reports the measured CRT screen bounds so the 2D shell can size the
   *  in-monitor terminal overlay to the screen's real aspect ratio. */
  onScreenBounds?: (bounds: ScreenBounds | null) => void;
  /** Live held-key set for WASD/arrow free-roam (owned by the 2D shell so the
   *  same keydown gating that protects the tablist lives next to it). */
  roamKeys: React.RefObject<Set<string>>;
  /** Scene is hovered/focused — pauses the idle auto-rotate. */
  engaged: boolean;
}

/**
 * The lazy, client-only 3D café. Loads the baked-lighting café glb, adds a warm
 * procedural environment for any un-baked surfaces, floats a clickable marker at
 * each Menu Book's anchor, and runs GT7-style scripted camera flights via the
 * CameraRig (table-front per book, desk-front for the CRT, back to room view).
 *
 * The canvas is enhancement-only (aria-hidden): every action here is mirrored by
 * the keyboard-navigable BookList and the 2D controls, so nothing is 3D-only.
 */
export function CafeScene({
  selectedId,
  focus,
  onSelect,
  onSelectCrt,
  onCrtFound,
  onSelectExhibit,
  onExhibitAvailability,
  terminalActive = false,
  terminalLines = [],
  screenContent = null,
  onScreenSurface,
  onScreenBounds,
  roamKeys,
  engaged,
}: CafeSceneProps) {
  const reducedMotion = useReducedMotion();
  const idle = !reducedMotion;
  const focusedBookId = focus.kind === "book" ? focus.bookId : null;

  // stable list references for the marker/exhibit maps
  const books = useMemo(() => menuBooks, []);
  const pieces = useMemo(() => exhibits, []);

  // Screen-surface state: whether the CRT screen mesh was located, and its
  // measured world bounds (drives the head-on dock pose). Both are reported up
  // from CrtScreenSurface once its mesh search resolves.
  const [screenFound, setScreenFound] = useState(false);
  const [screenBounds, setScreenBounds] = useState<ScreenBounds | null>(null);

  // CrtScreenSurface mounts as a sibling of the suspending model, so its first
  // mesh search can see an empty graph. CafeModel reports in (onCrtFound) only
  // after the glb is attached — bump a revision then to re-key the search.
  const [modelRevision, setModelRevision] = useState(0);
  const handleCrtFound = useCallback(
    (present: boolean) => {
      setModelRevision((rev) => rev + 1);
      onCrtFound?.(present);
    },
    [onCrtFound],
  );

  // Notify the 2D shell exactly once per resolution so it can fall back to the
  // overlay when the mesh is absent. Wrap the parent callback so a null-mesh
  // report still threads a definitive `false`.
  const handleScreenFound = useCallback(
    (found: boolean) => {
      setScreenFound(found);
      onScreenSurface?.(found);
    },
    [onScreenSurface],
  );
  const handleScreenBounds = useCallback(
    (bounds: ScreenBounds | null) => {
      setScreenBounds(bounds);
      onScreenBounds?.(bounds);
    },
    [onScreenBounds],
  );

  // Two docking notions since the mobile rework:
  //  - camDocked: the CAMERA flies head-on to the tube and orbit locks —
  //    whenever the CRT is focused and the screen mesh is known. On phones
  //    this is the whole cinematic (the DOM terminal lives in the 2D panel;
  //    the texture mirror keeps the tube alive in-frame).
  //  - htmlDocked: the real terminal DOM additionally owns the screen face
  //    (desktop in-monitor mode; requires screenContent to be handed in).
  const camDocked = focus.kind === "crt" && screenFound;
  const htmlDocked = camDocked && screenContent != null;

  // Power-on key: bump each time the DOM takes the tube so it replays its
  // phosphor wake. Increment on the false→true edge of `htmlDocked`.
  const [powerKey, setPowerKey] = useState(0);
  const wasDockedRef = useRef(false);
  useEffect(() => {
    if (htmlDocked && !wasDockedRef.current) setPowerKey((k) => k + 1);
    wasDockedRef.current = htmlDocked;
  }, [htmlDocked]);

  // Which exhibit id is hovered in-scene (drives its HTML name label). Local to
  // the scene — hover is a pure enhancement, not mirrored in the 2D UI.
  const [hoveredExhibitId, setHoveredExhibitId] = useState<string | null>(null);
  const onExhibitHover = useCallback((exhibit: Exhibit, hovered: boolean) => {
    setHoveredExhibitId((prev) =>
      hovered ? exhibit.id : prev === exhibit.id ? null : prev,
    );
  }, []);

  const activeExhibitId = focus.kind === "exhibit" ? focus.exhibitId : null;

  // Exhibits mount with the room and suspend into the same boundary, so the
  // café reveals as one furnished scene — no pieces popping in seconds later.
  // Their glbs are preloaded at module scope alongside the room model.

  return (
    <Canvas
      aria-hidden="true"
      // Entrance hero view = the overview pose; the scene ships
      // KHR_materials_unlit so `flat` (NoToneMapping) keeps baked colors true.
      camera={{
        position: [
          OVERVIEW_POSE.position[0],
          OVERVIEW_POSE.position[1],
          OVERVIEW_POSE.position[2],
        ],
        fov: 60,
      }}
      flat
      dpr={[1, 1.75]}
      className="touch-none"
    >
      {/* warm ambient wash — café interior, not a studio */}
      <ambientLight intensity={0.6} color="#ffe6c0" />
      <directionalLight
        position={[3, 6, 4]}
        intensity={0.7}
        color="#ffd9a0"
        castShadow
      />

      {/* procedural env for reflections on any un-baked chrome/glass, built
          from Lightformers locally (no HDRI fetch, CSP-safe) — mirrors the
          Garage scene's approach with warmer, café-toned lights. */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.6} color="#ffdca8" scale={[8, 2, 1]} position={[0, 5, 0]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.2} color="#c9a54a" scale={[5, 1.6, 1]} position={[4, 1.6, 2]} target={[0, 0.6, 0]} />
        <Lightformer form="rect" intensity={0.4} color="#3a2f1e" scale={[10, 10, 1]} position={[0, -2, 0]} target={[0, 0, 0]} />
      </Environment>

      <CafeModel onCrtFound={handleCrtFound} onSelectCrt={onSelectCrt} />

      {/* Hybrid CRT screen feed: mirrors the 2D terminal onto the in-scene
          monitor while the overlay is open; restores the screen on close.
          Suppressed while docked — the live DOM surface (CrtScreenSurface) then
          owns the screen face, and both would fight over `mesh.material`. */}
      {/* Texture mirror runs whenever the DOM doesn't own the tube — including
          the mobile close-up, where it IS the live screen. */}
      <CrtScreenFeed
        active={terminalActive && !htmlDocked}
        lines={terminalLines}
      />

      {/* Interactive terminal surface: locates + measures the screen mesh, and
          when docked renders the real terminal DOM on the physical CRT face. */}
      <CrtScreenSurface
        docked={htmlDocked}
        onFound={handleScreenFound}
        onBounds={handleScreenBounds}
        powerKey={powerKey}
        reducedMotion={reducedMotion}
        sceneRevision={modelRevision}
      >
        {screenContent}
      </CrtScreenSurface>

      {books.map((book) => (
        <BookMarker
          key={book.id}
          book={book}
          isActive={book.id === selectedId}
          onSelect={onSelect}
          idle={idle}
          focused={book.id === focusedBookId}
        />
      ))}

      {pieces.map((exhibit) => (
        <ExhibitPiece
          key={exhibit.id}
          exhibit={exhibit}
          isActive={exhibit.id === activeExhibitId}
          hovered={exhibit.id === hoveredExhibitId}
          onSelect={onSelectExhibit}
          onHoverChange={onExhibitHover}
          onAvailability={onExhibitAvailability}
        />
      ))}

      <CameraRig
        focus={focus}
        idle={idle}
        reducedMotion={reducedMotion}
        docked={camDocked}
        screenBounds={screenBounds}
        roamKeys={roamKeys}
        engaged={engaged}
      />
    </Canvas>
  );
}

// Warm the café model after mount so navigating back doesn't reload it, and
// start every exhibit glb fetching in parallel with the room so the furnished
// scene is ready in one reveal.
useGLTF.preload(CAFE_MODEL_PATH);
for (const exhibit of exhibits) {
  useGLTF.preload(exhibit.modelPath);
}
