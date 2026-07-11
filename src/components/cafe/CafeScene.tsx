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
import { Vector3 } from "three";
import type { Group, Object3D } from "three";
import { menuBooks, type MenuBook } from "../../../content/menu-books";
import { exhibits, exhibitById, type Exhibit } from "../../../content/cafe-exhibits";
import { useReducedMotion } from "../garage/useReducedMotion";
import { ExhibitPiece } from "./ExhibitPiece";
import {
  CAMERA_BOUNDS,
  CRT_NODE_NAME,
  OVERVIEW_POSE,
  CRT_POSE,
  clampToRoom,
  exhibitFramePose,
  tableFrontPose,
  type CameraPose,
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
  | { kind: "exhibit"; exhibitId: string };

interface CafeModelProps {
  onCrtFound: (present: boolean) => void;
  onSelectCrt: () => void;
}

function CafeModel({ onCrtFound, onSelectCrt }: CafeModelProps) {
  // Throws to the SceneErrorBoundary if the glb is absent/malformed (the
  // proven path in this worktree until the real model lands at integration).
  const { scene } = useGLTF(CAFE_MODEL_PATH);

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
}

/** A floating, glowing stylized book that marks a Menu Book on a café table.
 * Uses the book's own enamel cover color. Clicking it selects that book. Bobs
 * gently unless reduced motion is set; hover/active shows an HTML label. */
function BookMarker({ book, isActive, onSelect, idle }: BookMarkerProps) {
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
  const emissive = lit ? 0.9 : 0.35;

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
      {/* book body — the audience's enamel cover color */}
      <mesh castShadow>
        <boxGeometry args={[0.26, 0.34, 0.05]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissive}
          roughness={0.5}
          metalness={0.1}
        />
      </mesh>
      {/* pages block, peeking from the fore-edge */}
      <mesh position={[0, 0, 0.028]}>
        <boxGeometry args={[0.22, 0.3, 0.012]} />
        <meshStandardMaterial color="#f4f2ef" roughness={0.9} />
      </mesh>
      {/* soft halo so the marker reads as "interactive" from across the room */}
      <pointLight
        color={color}
        intensity={lit ? 0.9 : 0.3}
        distance={1.6}
        position={[0, 0, 0.3]}
      />
      {/* Hover/active label — enhancement-only; the same info is mirrored in the
          2D UI for keyboard users, so this is never the sole source. */}
      {lit ? (
        <Html center distanceFactor={6} position={[0, 0.34, 0]} zIndexRange={[20, 0]}>
          <div
            style={{
              transform: "translateY(-100%)",
              whiteSpace: "nowrap",
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
}

/**
 * Drives the scripted camera flights. Keeps the base OrbitControls (so the user
 * can still orbit gently around whatever is focused) and, whenever the focus
 * changes, tweens both the camera position and the controls target from their
 * current values to the focus pose over FLIGHT_MS with mechanical easing.
 * Reduced motion → instant cut. Auto-rotate is on only in room view.
 */
function CameraRig({ focus, idle, reducedMotion }: CameraRigProps) {
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
  // State mirror of `playing` — gates OrbitControls so a mid-flight drag or
  // scroll can't write to the camera in the same frame as the tween.
  const [flying, setFlying] = useState(false);

  const pose = useMemo<CameraPose>(() => {
    // Fixed poses (CRT/overview) are authored inside the box; derived table/
    // exhibit poses are already clamped in cameraPoses. Clamp the eye here too
    // so every flight destination is provably inside the room.
    let raw: CameraPose;
    if (focus.kind === "crt") raw = CRT_POSE;
    else if (focus.kind === "book") {
      const book = menuBooks.find((b) => b.id === focus.bookId);
      raw = book ? tableFrontPose(book.anchor) : OVERVIEW_POSE;
    } else if (focus.kind === "exhibit") {
      const exhibit = exhibitById.get(focus.exhibitId);
      raw = exhibit ? exhibitFramePose(exhibit) : OVERVIEW_POSE;
    } else raw = OVERVIEW_POSE;
    return { position: clampToRoom(raw.position), target: raw.target };
  }, [focus]);

  // Begin (or, under reduced motion / on first mount, immediately complete) a
  // flight whenever the destination pose changes. A rapid focus change mid-
  // flight redirects from the current camera state and restarts the full
  // FLIGHT_MS — intentional: every flight reads as one complete move.
  useEffect(() => {
    const ctrl = controls.current;
    if (!ctrl) return;

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

  // Auto-rotate only when idling in room view and no flight is running.
  const autoRotate = idle && focus.kind === "room";

  // No declarative `target` prop: the rig owns the target imperatively (the
  // mount effect seeds it, flights tween it). Damping off — it would layer
  // OrbitControls' own smoothing on top of the hand-tweened flight.
  return (
    <OrbitControls
      ref={controls}
      enabled={!flying}
      enableDamping={false}
      autoRotate={autoRotate}
      autoRotateSpeed={0.5}
      enablePan={false}
      enableZoom
      minDistance={1.4}
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
}: CafeSceneProps) {
  const reducedMotion = useReducedMotion();
  const idle = !reducedMotion;

  // stable list references for the marker/exhibit maps
  const books = useMemo(() => menuBooks, []);
  const pieces = useMemo(() => exhibits, []);

  // Which exhibit id is hovered in-scene (drives its HTML name label). Local to
  // the scene — hover is a pure enhancement, not mirrored in the 2D UI.
  const [hoveredExhibitId, setHoveredExhibitId] = useState<string | null>(null);
  const onExhibitHover = useCallback((exhibit: Exhibit, hovered: boolean) => {
    setHoveredExhibitId((prev) =>
      hovered ? exhibit.id : prev === exhibit.id ? null : prev,
    );
  }, []);

  const activeExhibitId = focus.kind === "exhibit" ? focus.exhibitId : null;

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

      <CafeModel onCrtFound={onCrtFound} onSelectCrt={onSelectCrt} />

      {books.map((book) => (
        <BookMarker
          key={book.id}
          book={book}
          isActive={book.id === selectedId}
          onSelect={onSelect}
          idle={idle}
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

      <CameraRig focus={focus} idle={idle} reducedMotion={reducedMotion} />
    </Canvas>
  );
}

// Warm the café model after mount so navigating back doesn't reload it.
useGLTF.preload(CAFE_MODEL_PATH);
