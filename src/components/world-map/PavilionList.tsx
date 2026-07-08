"use client";

import Link from "next/link";
import { openCount, pavilions } from "../../../content/pavilions";
import { useLockedNotice } from "./useLockedNotice";

/** Mobile world map: R4-style full-width stacked menu rows. */
export function PavilionList() {
  const { noticedId, notify } = useLockedNotice();

  return (
    <nav aria-label="Pavilions" className="flex flex-col gap-2">
      {pavilions.map((p) =>
        p.status === "open" ? (
          <Link
            key={p.id}
            href={`/${p.slug}`}
            className="group flex items-center justify-between border-4 border-ink bg-paper px-4 py-4 outline-none transition-transform duration-(--duration-snap) ease-(--ease-mech) focus-visible:ring-2 focus-visible:ring-accent active:translate-x-1"
          >
            <span className="flex flex-col">
              <span className="font-display text-xl font-bold tracking-wider uppercase">
                {p.name}
              </span>
              <span className="text-sm text-ink-soft">{p.caption}</span>
            </span>
            <span
              className="font-display text-lg font-bold text-accent"
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
            className={`flex items-center justify-between border-4 border-ink/20 px-4 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ink ${
              noticedId === p.id ? "locked-shake" : ""
            }`}
          >
            <span className="flex flex-col">
              <span className="font-display text-xl font-bold tracking-wider text-ink/40 uppercase">
                {p.name}
              </span>
              <span className="text-sm text-ink/40">{p.caption}</span>
            </span>
            <span className="border-2 border-accent px-2 py-0.5 font-display text-xs font-bold tracking-widest text-ink/70 uppercase">
              {noticedId === p.id ? "Unlocks soon" : "Locked"}
            </span>
          </button>
        ),
      )}
      <p className="mt-2 text-center font-display text-xs font-semibold tracking-widest text-ink-soft uppercase">
        {openCount}/{pavilions.length} pavilions open
      </p>
    </nav>
  );
}
