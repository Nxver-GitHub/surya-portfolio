"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { liveries } from "../../../content/liveries";
import type { Car } from "../../../content/cars";
import { useReducedMotion } from "./useReducedMotion";

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

function CarModel({ path }: { path: string }) {
  const { scene } = useGLTF(path);
  // Blender exports at real-world size (~4.2m); normalize to scene scale
  return <primitive object={scene} scale={0.58} />;
}

export function GarageScene({ car }: { car: Car }) {
  const livery = liveries[car.livery];
  const accent = livery.bars[1] ?? "#f4f2ef";
  const reducedMotion = useReducedMotion();

  return (
    <Canvas
      camera={{ position: [4.6, 2.1, 4.6], fov: 38 }}
      dpr={[1, 1.75]}
      className="touch-none"
    >
      <color attach="background" args={["#0d0d0f"]} />
      <fog attach="fog" args={["#0d0d0f", 9, 16]} />

      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 3]} intensity={1.1} />
      <directionalLight position={[-5, 3, -2]} intensity={0.35} color="#ffb000" />

      {/* concrete floor + subtle grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[7, 48]} />
        <meshLambertMaterial color="#17181b" />
      </mesh>
      <gridHelper args={[14, 28, "#2c2e33", "#222429"]} position={[0, 0, 0]} />

      {car.modelPath ? (
        <CarModel path={car.modelPath} />
      ) : (
        <PlaceholderCar color={livery.key} accent={accent} />
      )}

      <OrbitControls
        target={[0, 0.45, 0]}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.9}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 3.2}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}
