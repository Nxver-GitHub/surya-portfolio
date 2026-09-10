"use client";

import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";

/** A small framebuffer gives existing 3D scenes real console-era raster edges.
 * DOM overlays, including the café terminal, keep their native resolution. */
export function ConsoleResolution() {
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const dpr = useThree((state) => state.viewport.dpr);
  const setDpr = useThree((state) => state.setDpr);
  useLayoutEffect(() => {
    if (width <= 0 || height <= 0) return;
    const desired = Math.min(1, 480 / width, 360 / height);
    if (Math.abs(dpr - desired) > 0.001) setDpr(desired);
  }, [width, height, dpr, setDpr]);
  return null;
}
