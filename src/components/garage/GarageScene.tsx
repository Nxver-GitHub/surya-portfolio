"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect } from "react";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import {
  Box3,
  MathUtils,
  MeshLambertMaterial,
  Vector3,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type PerspectiveCamera,
} from "three";
import { liveries } from "../../../content/liveries";
import { cars, type Car } from "../../../content/cars";
import { runOnIdle } from "../../lib/runOnIdle";
import { useReducedMotion } from "./useReducedMotion";

/** Normalized car length in scene units — every model fits the same stage. */
const CAR_LENGTH = 2.8;
/** Bounding-sphere fill factor; the sphere generously overshoots the body
 *  (diagonal + empirical canvas margin), so >1 here still keeps the car
 *  safely inside frame at every turntable angle — tuned visually to land
 *  the body at ~70% of frame width. */
const FRAME_FILL = 1.15;
/** Low front-three-quarter hero direction (stays inside the polar clamps). */
const HERO_DIR = new Vector3(1, 0.28, 1).normalize();

/** Placeholder kart shown until a car's Blender model lands. */
function PlaceholderCar({ color, accent }: { color: string; accent: string }) {
  return (
    <group position={[0, 0.32, 0]}>
      {/* body */}
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[2.4, 0.36, 1.1]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* cabin */}
      <mesh position={[-0.15, 0.52, 0]}>
        <boxGeometry args={[1.1, 0.34, 0.9]} />
        <meshLambertMaterial color={accent} />
      </mesh>
      {/* nose wedge */}
      <mesh position={[1.28, 0.1, 0]} rotation={[0, 0, -0.18]}>
        <boxGeometry args={[0.5, 0.22, 1.05]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* spoiler */}
      <mesh position={[-1.25, 0.62, 0]}>
        <boxGeometry args={[0.18, 0.05, 1.15]} />
        <meshLambertMaterial color={accent} />
      </mesh>
      <mesh position={[-1.25, 0.45, 0.45]}>
        <boxGeometry args={[0.14, 0.3, 0.06]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh position={[-1.25, 0.45, -0.45]}>
        <boxGeometry args={[0.14, 0.3, 0.06]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* wheels */}
      {(
        [
          [0.85, 0, 0.58],
          [0.85, 0, -0.58],
          [-0.85, 0, 0.58],
          [-0.85, 0, -0.58],
        ] as const
      ).map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.28, 0.28, 0.22, 12]} />
          <meshLambertMaterial color="#1c1c1e" />
        </mesh>
      ))}
    </group>
  );
}

/** The kart's hand-modeled bounds (it never goes through the glb fit path). */
const KART_FIT = { radius: 1.55, centerY: 0.5 };

/**
 * Swap a PBR material for a Lambert one carrying over the readable surface
 * qualities (base color, texture, glass transparency). Gouraud-like shading is
 * the PS1 mandate — the café ships baked/unlit, the kart ships Lambert, and
 * the hero cars must live in the same world. Originals are disposed.
 */
function toLambert(material: Material): MeshLambertMaterial {
  const src = material as MeshStandardMaterial;
  const out = new MeshLambertMaterial({
    map: src.map ?? null,
    transparent: src.transparent,
    opacity: src.opacity,
    side: src.side,
  });
  if (src.color) out.color.copy(src.color);
  material.dispose();
  return out;
}

interface Fit {
  scale: number;
  position: readonly [number, number, number];
  centerY: number;
  radius: number;
}

const fitCache = new WeakMap<object, Fit>();

/**
 * One-time per glb: Lambert-convert the cached drei scene, then measure it.
 * Every model gets normalized from its own measured bounds — exporters
 * disagree on origin and scale, so no fixed constants survive contact with a
 * second glb. Lives outside the component because it intentionally mutates
 * the drei-cached scene (idempotent via the WeakMap).
 */
function prepareCar(scene: import("three").Object3D): Fit {
  const cached = fitCache.get(scene);
  if (cached) return cached;

  scene.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(toLambert)
      : toLambert(mesh.material);
  });

  const box = new Box3().setFromObject(scene);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const scale = CAR_LENGTH / Math.max(size.x, size.z);
  const fit: Fit = {
    scale,
    position: [-center.x * scale, -box.min.y * scale, -center.z * scale],
    centerY: (center.y - box.min.y) * scale,
    radius: (size.length() / 2) * scale,
  };
  fitCache.set(scene, fit);
  return fit;
}

/**
 * Positions the camera so the car's bounding sphere fits BOTH the vertical
 * and the aspect-derived horizontal fov — portrait phones crop vertically-fit
 * framing otherwise. Re-runs on resize.
 */
function FitRig({ radius, centerY }: { radius: number; centerY: number }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);

  useLayoutEffect(() => {
    const vHalf = MathUtils.degToRad(camera.fov) / 2;
    const hHalf = Math.atan(Math.tan(vHalf) * (size.width / size.height));
    const distance = radius / Math.sin(Math.min(vHalf, hHalf)) / FRAME_FILL;
    camera.position
      .copy(HERO_DIR)
      .multiplyScalar(distance)
      .add(new Vector3(0, centerY, 0));
    camera.lookAt(0, centerY, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, radius, centerY]);

  return null;
}

function BayControls({
  centerY,
  reducedMotion,
}: {
  centerY: number;
  reducedMotion: boolean;
}) {
  return (
    <OrbitControls
      target={[0, centerY, 0]}
      autoRotate={!reducedMotion}
      autoRotateSpeed={0.5}
      enablePan={false}
      enableZoom={false}
      minPolarAngle={Math.PI / 3.2}
      maxPolarAngle={Math.PI / 2.05}
    />
  );
}

function CarModel({ path, reducedMotion }: { path: string; reducedMotion: boolean }) {
  const { scene } = useGLTF(path);
  const fit = prepareCar(scene);

  return (
    <>
      <group position={fit.position as [number, number, number]} scale={fit.scale}>
        <primitive object={scene} />
      </group>
      {/* lives inside the suspense-gated subtree so the one-frame bake
          happens after the model exists; remounts (rebakes) per car */}
      <CarShadow />
      <FitRig radius={fit.radius} centerY={fit.centerY} />
      <BayControls centerY={fit.centerY} reducedMotion={reducedMotion} />
    </>
  );
}

function CarShadow() {
  return (
    <ContactShadows
      position={[0, 0.01, 0]}
      opacity={0.75}
      scale={7}
      blur={0.7}
      far={1.6}
      resolution={512}
      frames={1}
    />
  );
}

export function GarageScene({ car }: { car: Car }) {
  const livery = liveries[car.livery];
  const accent = livery.bars[1] ?? "#f4f2ef";
  const reducedMotion = useReducedMotion();

  // Warm the remaining hero models only once the browser is truly idle (or
  // after an 8s ceiling on browsers without requestIdleCallback), so the
  // active car's own load never competes with the rest of the garage. List
  // hovers/focuses (see CarBrowser's preloadCarModel calls) usually win this
  // race for whichever car the visitor is about to pick.
  useEffect(() => {
    return runOnIdle(() => {
      for (const c of cars) {
        if (c.modelPath && c.id !== car.id) useGLTF.preload(c.modelPath);
      }
    }, 8000);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- warm once on mount
  }, []);

  return (
    <Canvas
      camera={{ position: [4.1, 1.9, 4.1], fov: 38 }}
      dpr={[1, 1.75]}
      className="touch-none"
      flat
    >
      <color attach="background" args={["#0d0d0f"]} />
      <fog attach="fog" args={["#0d0d0f", 10, 20]} />

      {/* Lambert-only rig — flat era shading needs no env map to reflect */}
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 6, 3]} intensity={1.4} />
      <directionalLight position={[-5, 3, -2]} intensity={0.5} color="#ffb000" />

      {/* concrete floor + subtle grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[7, 48]} />
        <meshLambertMaterial color="#17181b" />
      </mesh>
      <gridHelper args={[14, 28, "#2c2e33", "#222429"]} position={[0, 0, 0]} />

      {car.modelPath ? (
        <CarModel path={car.modelPath} reducedMotion={reducedMotion} />
      ) : (
        <>
          <PlaceholderCar color={livery.key} accent={accent} />
          <CarShadow />
          <FitRig radius={KART_FIT.radius} centerY={KART_FIT.centerY} />
          <BayControls centerY={KART_FIT.centerY} reducedMotion={reducedMotion} />
        </>
      )}
    </Canvas>
  );
}
