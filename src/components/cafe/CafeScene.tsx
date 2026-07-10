"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import type { Group, Mesh } from "three";
import { menuBooks, type MenuBook } from "../../../content/menu-books";
import { liveries } from "../../../content/liveries";
import { useReducedMotion } from "../garage/useReducedMotion";

/** Contract: the café model lives here. Blender agent exports meshopt-
 * compressed glb to this public path; drei's loader decodes meshopt itself. */
const CAFE_MODEL_PATH = "/models/cafe.glb";

/** Warsteiner gold — the pavilion accent, reused for the book markers' glow. */
const MARKER_KEY = liveries.warsteiner.key;

function CafeModel() {
  // Throws to the SceneErrorBoundary if the glb is absent/malformed (the
  // proven path in this worktree until the real model lands at integration).
  const { scene } = useGLTF(CAFE_MODEL_PATH);
  // Lighting is baked in Blender (per CLAUDE.md), so render the scene as-is.
  return <primitive object={scene} />;
}

interface BookMarkerProps {
  book: MenuBook;
  isActive: boolean;
  onSelect: (book: MenuBook) => void;
  idle: boolean;
}

/** A floating, glowing stylized book that marks a Menu Book on a café table.
 * Clicking it selects that book. Bobs gently unless reduced motion is set. */
function BookMarker({ book, isActive, onSelect, idle }: BookMarkerProps) {
  const ref = useRef<Group>(null);
  const coverRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { x, y, z } = book.anchor;

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    // idle bob + slow spin; frozen (but still lifted) under reduced motion
    ref.current.position.y = y + (idle ? Math.sin(t * 1.4 + x) * 0.06 : 0);
    if (idle) ref.current.rotation.y = t * 0.5;
  });

  const emissive = isActive || hovered ? 0.9 : 0.35;

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
      {/* book body */}
      <mesh ref={coverRef} castShadow>
        <boxGeometry args={[0.26, 0.34, 0.05]} />
        <meshStandardMaterial
          color={MARKER_KEY}
          emissive={MARKER_KEY}
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
        color={MARKER_KEY}
        intensity={isActive || hovered ? 0.9 : 0.3}
        distance={1.6}
        position={[0, 0, 0.3]}
      />
    </group>
  );
}

interface CafeSceneProps {
  selectedId: string;
  onSelect: (book: MenuBook) => void;
}

/**
 * The lazy, client-only 3D café. Loads the baked-lighting café glb, adds a
 * warm procedural environment for any un-baked surfaces, and floats a clickable
 * book marker at each Menu Book's anchor. Selection is shared with the semantic
 * BookList, so clicking a marker and clicking a tab drive the same state.
 *
 * The canvas is enhancement-only (aria-hidden): every action here is mirrored
 * by the keyboard-navigable BookList, so nothing is 3D-exclusive.
 */
export function CafeScene({ selectedId, onSelect }: CafeSceneProps) {
  const reducedMotion = useReducedMotion();
  const idle = !reducedMotion;

  // stable list reference for the marker map
  const books = useMemo(() => menuBooks, []);

  return (
    <Canvas
      aria-hidden="true"
      camera={{ position: [0, 2.2, 5.2], fov: 42 }}
      dpr={[1, 1.75]}
      shadows
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

      <CafeModel />

      {books.map((book) => (
        <BookMarker
          key={book.id}
          book={book}
          isActive={book.id === selectedId}
          onSelect={onSelect}
          idle={idle}
        />
      ))}

      <OrbitControls
        target={[0, 0.9, 0]}
        autoRotate={idle}
        autoRotateSpeed={0.5}
        enablePan={false}
        enableZoom
        minDistance={3.5}
        maxDistance={7}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}

// Warm the café model after mount so navigating back doesn't reload it.
useGLTF.preload(CAFE_MODEL_PATH);
