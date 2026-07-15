"use client";

import Link from "next/link";
import { pavilions } from "../../../content/pavilions";
import { LicenseBadge } from "../gt/LicenseBadge";
import { useLockedNotice } from "./useLockedNotice";

/** Mobile world map: GT2 plate-button rows with enamel badges. */
export function PavilionList() {
  const { noticedId, notify } = useLockedNotice();

  return (
    <nav aria-label="Pavilions" className="flex flex-col gap-3">
      {pavilions.map((p) =>
        p.status === "open" ? (
          <Link
            key={p.id}
            href={`/${p.slug}`}
            data-sfx="confirm"
            className="plate group flex items-center gap-4 px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-gt-bright"
          >
            <LicenseBadge glyph={p.glyph} livery={p.livery} size={48} />
            <span className="flex flex-1 flex-col">
              <span className="ts-hard font-display text-xl font-bold tracking-wider text-chrome uppercase group-hover:text-gt-bright">
                {p.name}
              </span>
              <span className="text-sm text-silver">{p.caption}</span>
            </span>
            <span
              className="ts-hard font-display text-xl font-black text-gt-bright"
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
            className={`plate flex cursor-not-allowed items-center gap-4 px-4 py-3 text-left opacity-80 outline-none [border-color:var(--color-steel)] [box-shadow:inset_0_0_0_2px_#0d0d0e,inset_0_0_0_3px_var(--color-steel),1px_2px_0_rgba(0,0,0,0.8)] focus-visible:ring-2 focus-visible:ring-gt-bright ${
              noticedId === p.id ? "locked-shake" : ""
            }`}
          >
            <LicenseBadge glyph={p.glyph} livery={p.livery} size={48} muted />
            <span className="flex flex-1 flex-col">
              <span className="ts-hard font-display text-xl font-bold tracking-wider text-silver uppercase">
                {p.name}
              </span>
              <span className="text-sm text-silver/70">{p.caption}</span>
            </span>
            <span className="ts-hard border border-accent px-2 py-0.5 font-display text-xs font-bold tracking-widest text-chrome uppercase">
              {noticedId === p.id ? "Unlocks soon" : "Locked"}
            </span>
          </button>
        ),
      )}
    </nav>
  );
}
