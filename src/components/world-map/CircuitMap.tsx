"use client";

import Link from "next/link";
import { pavilions, type Pavilion } from "../../../content/pavilions";
import { LicenseBadge } from "../gt/LicenseBadge";
import { useLockedNotice } from "./useLockedNotice";

const LABEL_SIDE_CLASSES: Record<Pavilion["labelSide"], string> = {
  top: "bottom-full mb-2 left-1/2 -translate-x-1/2 items-center",
  bottom: "top-full mt-2 left-1/2 -translate-x-1/2 items-center",
  left: "right-full mr-3 top-1/2 -translate-y-1/2 items-end",
  right: "left-full ml-3 top-1/2 -translate-y-1/2 items-start",
};

const CIRCUIT_PATH =
  "M 150 130 L 560 130 Q 630 130 665 185 L 745 290 Q 775 330 745 372 " +
  "L 660 462 Q 630 498 570 498 L 300 498 Q 230 498 214 434 L 186 330 " +
  "Q 175 290 205 261 Q 236 231 206 196 L 178 166 Q 150 152 150 130 Z";

export function CircuitMap() {
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
          <path
            d={CIRCUIT_PATH}
            fill="none"
            stroke="#3c3f44"
            strokeWidth="18"
            strokeLinejoin="round"
          />
          <path
            d={CIRCUIT_PATH}
            fill="none"
            stroke="#1b1d20"
            strokeWidth="13"
            strokeLinejoin="round"
          />
          <path
            d={CIRCUIT_PATH}
            fill="none"
            stroke="var(--color-gt)"
            strokeWidth="2"
            strokeDasharray="12 14"
            strokeLinejoin="round"
            opacity="0.75"
          />
          {/* start/finish checkers at Career */}
          <g transform="translate(150 130)">
            <rect x="-3" y="-9" width="6" height="6" fill="#f2f0ec" />
            <rect x="-3" y="3" width="6" height="6" fill="#f2f0ec" />
            <rect x="-9" y="-3" width="6" height="6" fill="#f2f0ec" />
            <rect x="3" y="-3" width="6" height="6" fill="#f2f0ec" />
          </g>
        </svg>

        {/* Pavilion nodes: GT2 enamel badges with name plates */}
        {pavilions.map((p) => {
          const open = p.status === "open";
          const inner = (
            <>
              <LicenseBadge
                glyph={p.glyph}
                livery={p.livery}
                size={52}
                muted={!open}
                className={
                  open
                    ? "transition-transform duration-(--duration-snap) ease-(--ease-mech) group-hover:scale-110 group-focus-visible:scale-110"
                    : ""
                }
              />
              <span
                className={`ts-hard mt-1 font-display text-sm font-bold tracking-wider whitespace-nowrap uppercase ${
                  open
                    ? "text-chrome group-hover:text-gt-bright group-focus-visible:text-gt-bright"
                    : "text-silver/80"
                }`}
              >
                {p.name}
              </span>
              <span
                className={`mt-0.5 line-clamp-2 w-[22ch] text-center font-display text-xs leading-tight font-medium text-balance ${
                  open ? "text-silver" : "text-silver/70"
                }`}
              >
                {p.caption}
              </span>
            </>
          );

          return (
            <div
              key={p.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${p.map.x}%`, top: `${p.map.y}%` }}
            >
              {open ? (
                <Link
                  transitionTypes={["nav-forward"]}
                  href={`/${p.slug}`}
                  data-sfx="confirm"
                  className={`group absolute flex flex-col outline-none focus-visible:ring-2 focus-visible:ring-gt-bright ${LABEL_SIDE_CLASSES[p.labelSide]}`}
                >
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  aria-disabled="true"
                  aria-label={`${p.name} — locked, unlocks soon`}
                  onClick={() => notify(p.id)}
                  className={`group absolute flex cursor-not-allowed flex-col outline-none focus-visible:ring-2 focus-visible:ring-gt-bright ${LABEL_SIDE_CLASSES[p.labelSide]} ${
                    noticedId === p.id ? "locked-shake" : ""
                  }`}
                >
                  {inner}
                  <span
                    role="status"
                    className={`ts-hard pointer-events-none absolute -top-7 bg-accent px-2 py-0.5 font-display text-xs font-bold tracking-wider whitespace-nowrap text-white uppercase transition-opacity duration-(--duration-snap) ${
                      noticedId === p.id ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {noticedId === p.id ? "Unlocks soon" : ""}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
