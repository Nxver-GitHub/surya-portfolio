"use client";

import { seasonRefs, seasons, type Season } from "../../../content/career";
import { CarChip } from "./CarChip";
import { MissionChip } from "./MissionChip";
import { EventCard } from "./EventCard";
import { OrgLogo } from "./OrgLogo";
import { CAREER_WARMTH_VARIANT, seasonTint } from "./warmth";

interface CareerBoardProps {
  selected: Season;
  onSelect: (season: Season) => void;
}

export function CareerBoard({ selected, onSelect }: CareerBoardProps) {
  const refs = seasonRefs(selected);
  // Variant B — "plate wash": the selected season card + the Season Briefing
  // rail take the season's warm field as their fill (content zone stays asphalt).
  const variantB = CAREER_WARMTH_VARIANT === "B";
  const tint = seasonTint(selected.id);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
      {/* Seasons ladder */}
      <nav aria-label="Seasons" className="flex gap-2 lg:flex-col">
        {seasons.map((s) => {
          const isActive = s.id === selected.id;
          const bWash = variantB && isActive;
          const cardTint = seasonTint(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s)}
              aria-current={isActive ? "true" : undefined}
              style={
                bWash ? { backgroundColor: cardTint.field } : undefined
              }
              className={`${
                bWash
                  ? "border border-asphalt/40 shadow-[1px_2px_0_rgba(0,0,0,0.8)]"
                  : isActive
                    ? "plate-hot"
                    : "plate"
              } flex-1 px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-chrome lg:flex-none`}
            >
              <span
                className={`block font-display text-xs font-bold tracking-[0.2em] uppercase ${
                  isActive ? "text-asphalt/80" : "ts-hard text-gt-bright"
                }`}
              >
                {s.number}
              </span>
              <span className="flex items-center gap-2">
                {s.logo ? (
                  <OrgLogo logo={s.logo} org={s.name} size={22} />
                ) : null}
                <span
                  className={`block font-display text-lg leading-tight font-bold tracking-wide uppercase ${
                    isActive ? "text-asphalt" : "ts-hard text-chrome"
                  }`}
                >
                  {s.name}
                </span>
              </span>
              <span
                className={`block text-xs ${isActive ? "text-asphalt/70" : "text-silver"}`}
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
        <div
          style={variantB ? { backgroundColor: tint.field } : undefined}
          className={`p-4 shadow-[2px_3px_0_rgba(0,0,0,0.7)] ${
            variantB ? "border border-asphalt/40" : "border border-steel bg-panel"
          }`}
        >
          <h2
            className={`font-display text-sm font-bold tracking-[0.2em] uppercase ${
              variantB ? "text-asphalt" : "ts-hard text-gt-bright"
            }`}
          >
            Season briefing
          </h2>
          <p
            className={`mt-2 text-sm leading-snug ${variantB ? "text-asphalt/90" : "text-ink"}`}
          >
            {selected.summary}
          </p>

          {refs.cars.length > 0 ? (
            <div className="mt-4">
              <h3
                className={`font-display text-xs font-bold tracking-[0.18em] uppercase ${
                  variantB ? "text-asphalt" : "text-gt-bright"
                }`}
              >
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
              <h3
                className={`font-display text-xs font-bold tracking-[0.18em] uppercase ${
                  variantB ? "text-asphalt" : "text-gt-bright"
                }`}
              >
                Missions cleared
              </h3>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {refs.missions.map((m) => (
                  <MissionChip key={m} missionId={m} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
