import { useGLTF } from "@react-three/drei";

/**
 * Warms a single car's glb into drei's loader cache. Lives in its own module
 * (rather than GarageScene.tsx) so CarBrowser — which statically imports it
 * for hover/focus preloading — doesn't drag the whole Canvas/R3F scene tree
 * into its bundle; GarageScene itself stays behind `next/dynamic`.
 */
export function preloadCarModel(path: string): void {
  useGLTF.preload(path);
}
