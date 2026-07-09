import Link from "next/link";
import type { Car } from "../../../content/cars";
import { MissionChip } from "../career/MissionChip";
import { LiveryStripe } from "../livery/LiveryStripe";
import { VideoLightbox } from "./VideoLightbox";

function SpecLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-display text-xs font-bold tracking-[0.18em] text-gt-bright uppercase">
      {children}
    </h3>
  );
}

export function SpecSheet({ car }: { car: Car }) {
  if (car.status === "locked") {
    return (
      <div className="border border-steel bg-panel p-5 shadow-[2px_3px_0_rgba(0,0,0,0.7)]">
        <p className="ts-hard font-display text-lg font-bold tracking-widest text-silver uppercase">
          Classified entry
        </p>
        <p className="mt-2 text-sm text-silver">
          A new machine is being built in a closed workshop. Specs release
          when it rolls out.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-steel bg-panel shadow-[2px_3px_0_rgba(0,0,0,0.7)]">
      <LiveryStripe livery={car.livery} />
      <div className="flex flex-col gap-4 p-5">
        <div>
          <p className="ts-hard font-display text-2xl font-bold tracking-wide text-chrome uppercase">
            {car.name}
          </p>
          {car.chassis ? (
            <p className="text-sm text-silver">{car.chassis}</p>
          ) : (
            <p className="text-sm text-silver">3D model in production</p>
          )}
        </div>

        {car.tagline ? <p className="text-sm text-silver">{car.tagline}</p> : null}

        <div className="grid grid-cols-2 gap-2">
          <div className="border border-steel px-2.5 py-1.5">
            <SpecLabel>Class</SpecLabel>
            <p className="ts-hard text-sm text-chrome">{car.carClass}</p>
          </div>
          <div className="border border-steel px-2.5 py-1.5">
            <SpecLabel>Raced</SpecLabel>
            <p className="ts-hard text-sm text-chrome">{car.raced}</p>
          </div>
        </div>

        {car.performance ? (
          <div>
            <SpecLabel>Performance</SpecLabel>
            <ul className="mt-1.5 flex list-none flex-col gap-1.5">
              {car.performance.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm text-silver">
                  <span aria-hidden="true" className="mt-0.5 font-display text-xs font-black text-gt-bright">
                    ▸
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {car.drivetrain ? (
          <div>
            <SpecLabel>Drivetrain</SpecLabel>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {car.drivetrain.map((t) => (
                <span
                  key={t}
                  className="border border-steel px-2 py-0.5 font-display text-xs font-semibold tracking-wider text-chrome uppercase"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {car.lapRecord ? (
          <div>
            <SpecLabel>Lap record</SpecLabel>
            <p className="ts-hard mt-1 text-sm text-chrome">{car.lapRecord}</p>
          </div>
        ) : null}

        {car.team ? (
          <div>
            <SpecLabel>Crew</SpecLabel>
            <ul className="mt-1.5 flex list-none flex-col gap-1 text-sm text-silver">
              {car.team.map((m) => (
                <li key={m.name}>
                  <span className="text-chrome">{m.name}</span> — {m.role}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {car.careerEventSlug ? (
            <Link
              href={`/career/${car.careerEventSlug}`}
              className="plate ts-hard px-3 py-1.5 font-display text-sm font-bold tracking-widest text-gt-bright uppercase outline-none hover:text-chrome focus-visible:ring-2 focus-visible:ring-gt-bright"
            >
              View replay
            </Link>
          ) : null}
          {car.links?.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="plate ts-hard px-3 py-1.5 font-display text-sm font-bold tracking-widest text-gt-bright uppercase outline-none hover:text-chrome focus-visible:ring-2 focus-visible:ring-gt-bright"
            >
              {l.label} ↗
            </Link>
          ))}
          {car.missionId ? (
            <MissionChip missionId={car.missionId} />
          ) : null}
        </div>

        {car.media?.video ? (
          <div>
            <SpecLabel>Onboard footage</SpecLabel>
            <div className="mt-1.5">
              <VideoLightbox
                src={car.media.video.src}
                poster={car.media.video.poster}
                note={car.media.video.note}
                title={car.name}
              />
            </div>
          </div>
        ) : null}

        {car.media?.deck ? (
          <a
            href={car.media.deck.src}
            download
            className="plate ts-hard self-start px-3 py-1.5 font-display text-sm font-bold tracking-widest text-gt-bright uppercase outline-none hover:text-chrome focus-visible:ring-2 focus-visible:ring-gt-bright"
          >
            {car.media.deck.label} ⬇
          </a>
        ) : null}
      </div>
    </div>
  );
}
