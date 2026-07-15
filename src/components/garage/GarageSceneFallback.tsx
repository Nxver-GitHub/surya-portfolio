"use client";

import { liveries } from "../../../content/liveries";
import type { Car } from "../../../content/cars";

/**
 * Static stand-in when the WebGL bay can't render (no context, lost context,
 * malformed glb). Hero cars reuse their intro silhouette PNG as a CSS mask
 * tinted in the livery key — same technique as the boot montage — so the
 * pavilion keeps its automotive shape instead of collapsing to a blank panel.
 */
export function GarageSceneFallback({ car }: { car: Car }) {
  const livery = liveries[car.livery];
  const mask = car.modelPath ? `url(/intro/cars/${car.id}.png)` : undefined;
  return (
    <div className="flex h-full min-h-72 flex-col items-center justify-center gap-5 bg-[#0d0d0f] p-6 lg:min-h-96">
      {mask ? (
        <div
          aria-hidden="true"
          className="w-3/4 max-w-105"
          style={{
            aspectRatio: "1600 / 666",
            background: livery.key,
            WebkitMaskImage: mask,
            maskImage: mask,
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
            WebkitMaskSize: "contain",
            maskSize: "contain",
          }}
        />
      ) : (
        <div
          aria-hidden="true"
          className="h-2 w-3/4 max-w-105"
          style={{ background: livery.key }}
        />
      )}
      <p className="ts-hard font-display text-sm font-semibold tracking-widest text-silver uppercase">
        {car.name} — 3D view unavailable
      </p>
    </div>
  );
}
