import type { Metadata } from "next";
import Link from "next/link";
import { missionPacks, type Mission } from "../../../content/missions";
import { carById } from "../../../content/cars";
import { pavilions } from "../../../content/pavilions";
import type { LiveryId } from "../../../content/liveries";
import { LiveryStripe } from "@/components/livery/LiveryStripe";
import { OrgLogo } from "@/components/career/OrgLogo";
import { GtCrumb, GtTitle, LozengeLink } from "@/components/gt/GtChrome";
import { Glyph } from "@/components/gt/Glyph";

/** The Missions pavilion's livery nod (Jägermeister DTM orange/green), applied
 * to card/section chrome like the other pavilions. */
const MISSIONS_LIVERY: LiveryId =
  pavilions.find((p) => p.slug === "missions")?.livery ?? "jager";

export const metadata: Metadata = {
  title: "Missions — Surya Pugazhenthi",
  description:
    "Hackathons and competitions: CruzHacks 2025, SlugAI Pitch Competition, Locus Agentic Payments, EF Marketing Agents — all podium finishes.",
};

const STAMP_STYLES: Record<Mission["stamp"], string> = {
  CLEARED: "border-gt-bright text-gt-bright",
  "IN PROGRESS": "border-silver text-silver",
  RETIRED: "border-accent text-accent",
};

function MissionCard({ mission }: { mission: Mission }) {
  const car = mission.carId ? carById.get(mission.carId) : undefined;

  return (
    <article className="relative flex flex-col border border-steel bg-panel shadow-[2px_3px_0_rgba(0,0,0,0.7)]">
      <LiveryStripe
        livery={MISSIONS_LIVERY}
        className="absolute inset-x-0 top-0"
        muted={mission.stamp === "RETIRED"}
      />
      <span
        aria-label={`Status: ${mission.stamp.toLowerCase()}`}
        className={`ts-hard absolute top-3 right-3 -rotate-6 border-2 px-2 py-0.5 font-display text-sm font-black tracking-[0.2em] uppercase ${STAMP_STYLES[mission.stamp]}`}
      >
        {mission.stamp}
      </span>

      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3 pr-24">
          <OrgLogo logo={mission.logo} org={mission.host} size={32} />
          <div>
            <h3 className="ts-hard font-display text-lg leading-tight font-bold tracking-wide text-chrome uppercase">
              {mission.name}
            </h3>
            <p className="text-xs text-silver">
              {mission.host} · {mission.date}
            </p>
          </div>
        </div>

        <div>
          <h4 className="font-display text-xs font-bold tracking-[0.18em] text-gt-bright uppercase">
            Objective
          </h4>
          <p className="mt-1 text-sm text-silver">{mission.objective}</p>
        </div>

        <div>
          <h4 className="font-display text-xs font-bold tracking-[0.18em] text-gt-bright uppercase">
            Constraints
          </h4>
          <ul className="mt-1 flex list-none flex-col gap-1">
            {mission.constraints.map((c, i) => (
              <li key={i} className="flex gap-2 text-sm text-silver">
                <span
                  aria-hidden="true"
                  className="mt-0.5 font-display text-xs font-black text-gt-bright"
                >
                  ▸
                </span>
                {c}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-display text-xs font-bold tracking-[0.18em] text-gt-bright uppercase">
            Outcome
          </h4>
          <p className="ts-hard mt-1 text-sm text-chrome">{mission.outcome}</p>
        </div>

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {car ? (
            <Link
              href={`/garage?car=${car.id}`}
              className="plate ts-hard inline-flex items-center gap-1.5 px-3 py-1.5 font-display text-xs font-bold tracking-widest text-gt-bright uppercase outline-none hover:text-chrome focus-visible:ring-2 focus-visible:ring-gt-bright"
            >
              <Glyph kind="car" /> {car.name}
            </Link>
          ) : null}
          {mission.careerEventSlug ? (
            <Link
              href={`/career/${mission.careerEventSlug}`}
              className="plate ts-hard px-3 py-1.5 font-display text-xs font-bold tracking-widest text-gt-bright uppercase outline-none hover:text-chrome focus-visible:ring-2 focus-visible:ring-gt-bright"
            >
              View replay
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function MissionsPage() {
  return (
    <div className="relative flex flex-1 flex-col px-5 py-6 md:px-10 md:py-8">
      <GtCrumb label="Missions" />

      <header>
        <LozengeLink href="/">
          <span aria-hidden="true">←</span> World Map
        </LozengeLink>
      </header>

      <main className="flex flex-1 flex-col pb-10">
        <div className="mt-10 md:mt-12">
          <GtTitle kicker="Special events">Missions</GtTitle>
          <p className="mt-3 max-w-2xl text-base text-silver">
            Time-boxed races: hackathons, pitch competitions, and challenges.
            Each mission links to the machine it produced.
          </p>
        </div>

        {missionPacks.map((pack) => (
          <section key={pack.id} aria-label={pack.name} className="mt-10">
            <div className="flex items-baseline gap-3 border-b border-steel pb-2">
              <h2 className="ts-hard font-display text-2xl font-bold tracking-wide text-chrome uppercase">
                {pack.name}
              </h2>
              <p className="text-sm text-silver">{pack.description}</p>
            </div>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {pack.missions.map((m) => (
                <MissionCard key={m.id} mission={m} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
