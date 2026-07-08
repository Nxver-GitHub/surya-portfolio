"use client";

import Link from "next/link";
import { useState } from "react";
import { liveries } from "../../../content/liveries";
import {
  openCount,
  pavilions,
  type Pavilion,
} from "../../../content/pavilions";
import { LiveryStripe } from "../livery/LiveryStripe";
import { useLockedNotice } from "./useLockedNotice";

const LABEL_SIDE_CLASSES: Record<Pavilion["labelSide"], string> = {
  top: "bottom-full mb-3 left-1/2 -translate-x-1/2",
  bottom: "top-full mt-3 left-1/2 -translate-x-1/2",
  left: "right-full mr-3.5 top-1/2 -translate-y-1/2",
  right: "left-full ml-3.5 top-1/2 -translate-y-1/2",
};

const CIRCUIT_PATH =
  "M 150 130 L 560 130 Q 630 130 665 185 L 745 290 Q 775 330 745 372 " +
  "L 660 462 Q 630 498 570 498 L 300 498 Q 230 498 214 434 L 186 330 " +
  "Q 175 290 205 261 Q 236 231 206 196 L 178 166 Q 150 152 150 130 Z";

export function CircuitMap() {
  const [active, setActive] = useState<Pavilion | null>(null);
  const { noticedId, notify } = useLockedNotice();

  return (
    <div className="flex h-full flex-col">
      <div
        className="relative mx-auto w-full max-w-5xl grow"
        style={{ aspectRatio: "1000 / 560" }}
      >
        {/* Night circuit ribbon — decorative */}
        <svg
          viewBox="0 0 1000 560"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
          focusable="false"
        >
          {/* kerb edge */}
          <path
            d={CIRCUIT_PATH}
            fill="none"
            stroke="#43484f"
            strokeWidth="18"
            strokeLinejoin="round"
          />
          {/* tarmac */}
          <path
            d={CIRCUIT_PATH}
            fill="none"
            stroke="#212429"
            strokeWidth="13"
            strokeLinejoin="round"
          />
          {/* centerline */}
          <path
            d={CIRCUIT_PATH}
            fill="none"
            stroke="var(--color-track)"
            strokeWidth="2"
            strokeDasharray="12 14"
            strokeLinejoin="round"
            opacity="0.7"
          />
          {/* start/finish checkers at Career */}
          <g transform="translate(150 130)">
            <rect x="-3" y="-9" width="6" height="6" fill="#e8e6e1" />
            <rect x="-3" y="3" width="6" height="6" fill="#e8e6e1" />
            <rect x="-9" y="-3" width="6" height="6" fill="#e8e6e1" />
            <rect x="3" y="-3" width="6" height="6" fill="#e8e6e1" />
          </g>
        </svg>

        {/* Pavilion nodes — real controls overlaid on the ribbon */}
        {pavilions.map((p) => (
          <div
            key={p.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.map.x}%`, top: `${p.map.y}%` }}
          >
            {p.status === "open" ? (
              <Link
                href={`/${p.slug}`}
                onMouseEnter={() => setActive(p)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(p)}
                onBlur={() => setActive(null)}
                className="group relative flex items-center justify-center outline-none"
              >
                <span
                  className="block size-4 rounded-full border-2 bg-chrome transition-transform duration-(--duration-snap) ease-(--ease-mech) group-hover:scale-125 group-focus-visible:scale-125 group-focus-visible:ring-2 group-focus-visible:ring-track"
                  style={{ borderColor: liveries[p.livery].key }}
                />
                <span
                  className={`panel clip-cut absolute flex flex-col whitespace-nowrap transition-colors duration-(--duration-snap) group-hover:border-track ${LABEL_SIDE_CLASSES[p.labelSide]}`}
                >
                  <LiveryStripe livery={p.livery} />
                  <span className="px-3 py-1 font-display text-base font-bold tracking-wide text-chrome italic uppercase group-hover:text-track group-focus-visible:text-track">
                    {p.name}
                  </span>
                </span>
              </Link>
            ) : (
              <button
                type="button"
                aria-disabled="true"
                aria-label={`${p.name} — locked, unlocks soon`}
                onMouseEnter={() => setActive(p)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(p)}
                onBlur={() => setActive(null)}
                onClick={() => notify(p.id)}
                className={`group relative flex cursor-not-allowed items-center justify-center outline-none ${
                  noticedId === p.id ? "locked-shake" : ""
                }`}
              >
                <span className="block size-3 rounded-full border-2 border-steel bg-panel group-focus-visible:ring-2 group-focus-visible:ring-track" />
                <span
                  className={`panel clip-cut absolute flex flex-col whitespace-nowrap opacity-70 ${LABEL_SIDE_CLASSES[p.labelSide]}`}
                >
                  <LiveryStripe livery={p.livery} muted />
                  <span className="px-3 py-1 font-display text-base font-semibold tracking-wide text-silver italic uppercase">
                    {p.name}
                  </span>
                </span>
                <span
                  role="status"
                  className={`pointer-events-none absolute bottom-full mb-10 whitespace-nowrap bg-accent px-2 py-0.5 font-display text-sm font-bold tracking-wider text-chrome italic uppercase transition-opacity duration-(--duration-snap) ${
                    noticedId === p.id ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {noticedId === p.id ? "Unlocks soon" : ""}
                </span>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Console status bar */}
      <div className="panel clip-cut mx-auto mt-6 flex w-full max-w-5xl items-center justify-between px-4 py-2.5">
        <p className="font-display text-base font-bold tracking-wide italic uppercase">
          {active ? (
            <>
              <span style={{ color: liveries[active.livery].key }}>
                {active.name}
              </span>
              <span className="text-silver"> — {active.caption}</span>
            </>
          ) : (
            <span className="text-silver">Select a pavilion</span>
          )}
        </p>
        <p className="font-display text-sm font-semibold tracking-widest text-track italic uppercase">
          {openCount}/{pavilions.length} open
        </p>
      </div>
    </div>
  );
}
