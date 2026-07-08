"use client";

import Link from "next/link";
import { liveries } from "../../../content/liveries";
import { openCount, pavilions } from "../../../content/pavilions";
import { LiveryStripe } from "../livery/LiveryStripe";
import { useLockedNotice } from "./useLockedNotice";

/** Mobile world map: stacked menu panels with livery edge decals. */
export function PavilionList() {
  const { noticedId, notify } = useLockedNotice();

  return (
    <nav aria-label="Pavilions" className="flex flex-col gap-2.5">
      {pavilions.map((p) =>
        p.status === "open" ? (
          <Link
            key={p.id}
            href={`/${p.slug}`}
            className="panel clip-cut group flex items-stretch outline-none transition-colors duration-(--duration-snap) ease-(--ease-mech) hover:border-track focus-visible:ring-2 focus-visible:ring-track"
          >
            <LiveryStripe livery={p.livery} direction="vertical" />
            <span className="flex flex-1 flex-col px-4 py-3.5">
              <span className="font-display text-2xl font-bold tracking-wide text-chrome italic uppercase group-hover:text-track">
                {p.name}
              </span>
              <span className="text-sm text-silver">{p.caption}</span>
            </span>
            <span
              className="self-center pr-4 font-display text-xl font-bold italic"
              style={{ color: liveries[p.livery].key }}
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        ) : (
          <button
            key={p.id}
            type="button"
            aria-disabled="true"
            aria-label={`${p.name} — locked, unlocks soon`}
            onClick={() => notify(p.id)}
            className={`panel clip-cut flex items-stretch text-left opacity-75 outline-none focus-visible:ring-2 focus-visible:ring-track ${
              noticedId === p.id ? "locked-shake" : ""
            }`}
          >
            <LiveryStripe livery={p.livery} direction="vertical" muted />
            <span className="flex flex-1 flex-col px-4 py-3.5">
              <span className="font-display text-2xl font-semibold tracking-wide text-silver italic uppercase">
                {p.name}
              </span>
              <span className="text-sm text-silver/70">{p.caption}</span>
            </span>
            <span className="self-center border border-accent/70 px-2 py-0.5 font-display text-xs font-bold tracking-widest text-silver italic uppercase mr-4">
              {noticedId === p.id ? "Unlocks soon" : "Locked"}
            </span>
          </button>
        ),
      )}
      <p className="mt-2 text-center font-display text-xs font-semibold tracking-widest text-silver italic uppercase">
        {openCount}/{pavilions.length} pavilions open
      </p>
    </nav>
  );
}
