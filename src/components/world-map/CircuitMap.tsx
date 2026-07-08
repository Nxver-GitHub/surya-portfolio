"use client";

import Link from "next/link";
import { useState } from "react";
import { openCount, pavilions, type Pavilion } from "../../../content/pavilions";
import { useLockedNotice } from "./useLockedNotice";

const LABEL_SIDE_CLASSES: Record<Pavilion["labelSide"], string> = {
  top: "bottom-full mb-2.5 left-1/2 -translate-x-1/2",
  bottom: "top-full mt-2.5 left-1/2 -translate-x-1/2",
  left: "right-full mr-3 top-1/2 -translate-y-1/2",
  right: "left-full ml-3 top-1/2 -translate-y-1/2",
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
      <div className="relative mx-auto w-full max-w-5xl grow" style={{ aspectRatio: "1000 / 560" }}>
        {/* Circuit ribbon — decorative */}
        <svg
          viewBox="0 0 1000 560"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d={CIRCUIT_PATH}
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth="14"
            strokeLinejoin="round"
          />
          <path
            d={CIRCUIT_PATH}
            fill="none"
            stroke="var(--color-track)"
            strokeWidth="3"
            strokeDasharray="14 12"
            strokeLinejoin="round"
          />
          {/* Start/finish line at Career */}
          <g transform="translate(150 130)">
            <rect x="-5" y="-24" width="10" height="14" fill="var(--color-paper)" />
            <rect x="-5" y="10" width="10" height="14" fill="var(--color-paper)" />
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
                <span className="block size-5 rounded-full border-4 border-accent bg-paper transition-transform duration-(--duration-snap) ease-(--ease-mech) group-hover:scale-125 group-focus-visible:scale-125 group-focus-visible:ring-2 group-focus-visible:ring-ink" />
                <span
                  className={`absolute whitespace-nowrap bg-ink px-2.5 py-1 font-display text-sm font-semibold tracking-widest text-track uppercase transition-colors duration-(--duration-snap) group-hover:bg-accent group-hover:text-paper group-focus-visible:bg-accent group-focus-visible:text-paper ${LABEL_SIDE_CLASSES[p.labelSide]}`}
                >
                  {p.name}
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
                <span className="block size-4 rounded-full border-4 border-ink/30 bg-track-deep group-focus-visible:ring-2 group-focus-visible:ring-ink" />
                <span
                  className={`absolute whitespace-nowrap border border-ink/25 bg-track px-2.5 py-1 font-display text-sm font-semibold tracking-widest text-ink/50 uppercase ${LABEL_SIDE_CLASSES[p.labelSide]}`}
                >
                  {p.name}
                </span>
                <span
                  role="status"
                  className={`pointer-events-none absolute bottom-full mb-8 whitespace-nowrap bg-accent px-2 py-0.5 font-display text-xs font-bold tracking-widest text-paper uppercase transition-opacity duration-(--duration-snap) ${
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
      <div className="mx-auto mt-6 flex w-full max-w-5xl items-center justify-between border-t-4 border-ink pt-3">
        <p className="font-display text-sm font-semibold tracking-widest uppercase">
          {active
            ? `${active.name} — ${active.caption}`
            : "Select a pavilion"}
        </p>
        <p className="font-display text-sm font-semibold tracking-widest text-ink-soft uppercase">
          {openCount}/{pavilions.length} pavilions open
        </p>
      </div>
    </div>
  );
}
