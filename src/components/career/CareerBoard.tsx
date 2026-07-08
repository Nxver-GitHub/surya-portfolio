"use client";

import { useState } from "react";
import { seasons, type Season } from "../../../content/career";
import { CarChip } from "./CarChip";
import { LockedChip } from "./LockedChip";
import { EventCard } from "./EventCard";
import { OrgLogo } from "./OrgLogo";

function seasonRefs(season: Season) {
  const cars = new Set<string>();
  const missions = new Set<string>();
  for (const e of season.events) {
    e.carIds?.forEach((c) => cars.add(c));
    e.missionIds?.forEach((m) => missions.add(m));
  }
  return { cars: [...cars], missions: [...missions] };
}

export function CareerBoard() {
  const [selected, setSelected] = useState<Season>(
    seasons[seasons.length - 1],
  );
  const refs = seasonRefs(selected);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
      {/* Seasons ladder */}
      <nav aria-label="Seasons" className="flex gap-2 lg:flex-col">
        {seasons.map((s) => {
          const isActive = s.id === selected.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelected(s)}
              aria-current={isActive ? "true" : undefined}
              className={`${
                isActive ? "plate-hot" : "plate"
              } flex-1 px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-chrome lg:flex-none`}
            >
              <span
                className={`ts-hard block font-display text-xs font-bold tracking-[0.2em] uppercase ${
                  isActive ? "text-white/80" : "text-gt-bright"
                }`}
              >
                {s.number}
              </span>
              <span className="flex items-center gap-2">
                {s.logo ? (
                  <OrgLogo logo={s.logo} org={s.name} size={22} />
                ) : null}
                <span
                  className={`ts-hard block font-display text-lg leading-tight font-bold tracking-wide uppercase ${
                    isActive ? "text-white" : "text-chrome"
                  }`}
                >
                  {s.name}
                </span>
              </span>
              <span
                className={`block text-xs ${isActive ? "text-white/70" : "text-silver"}`}
              >
                {s.period}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Events for the selected season */}
      <section aria-label={`${selected.number} events`} className="flex flex-col gap-4">
        {selected.events.map((e) => (
          <EventCard key={e.slug} event={e} />
        ))}
      </section>

      {/* Season context panel */}
      <aside className="hidden lg:block">
        <div className="border border-steel bg-panel p-4 shadow-[2px_3px_0_rgba(0,0,0,0.7)]">
          <h2 className="ts-hard font-display text-sm font-bold tracking-[0.2em] text-gt-bright uppercase">
            Season briefing
          </h2>
          <p className="mt-2 text-sm text-silver">{selected.summary}</p>

          {refs.cars.length > 0 ? (
            <div className="mt-4">
              <h3 className="font-display text-xs font-bold tracking-[0.18em] text-gt-bright uppercase">
                Cars unlocked
              </h3>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {refs.cars.map((c) => (
                  <CarChip key={c} carId={c} />
                ))}
              </div>
            </div>
          ) : null}

          {refs.missions.length > 0 ? (
            <div className="mt-4">
              <h3 className="font-display text-xs font-bold tracking-[0.18em] text-gt-bright uppercase">
                Missions cleared
              </h3>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {refs.missions.map((m) => (
                  <LockedChip key={m} label={m} unlocksWith="Missions" />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
