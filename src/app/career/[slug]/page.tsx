import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allEventSlugs, findEvent } from "../../../../content/career";
import { GtCrumb, GtTitle, LozengeLink } from "@/components/gt/GtChrome";
import { LockedChip } from "@/components/career/LockedChip";
import { LiveryStripe } from "@/components/livery/LiveryStripe";

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return allEventSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const found = findEvent(slug);
  if (!found) return {};
  return {
    title: `${found.event.title} — Career — Surya Pugazhenthi`,
    description: `${found.event.role} at ${found.event.org} (${found.event.dates}): ${found.event.result}.`,
  };
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-steel bg-panel px-3 py-2">
      <dt className="font-display text-xs font-bold tracking-[0.18em] text-gt-bright uppercase">
        {label}
      </dt>
      <dd className="ts-hard text-sm text-chrome">{value}</dd>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="ts-hard font-display text-base font-bold tracking-[0.2em] text-gt-bright uppercase">
      {children}
    </h2>
  );
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const found = findEvent(slug);
  if (!found) notFound();
  const { season, event } = found;

  return (
    <div className="relative flex flex-1 flex-col px-5 py-6 md:px-10 md:py-8">
      <GtCrumb label={season.number} />

      <header>
        <LozengeLink href="/career">
          <span aria-hidden="true">←</span> Career
        </LozengeLink>
      </header>

      <main className="flex flex-1 flex-col pb-10">
        <div className="mt-10 md:mt-12">
          <GtTitle kicker={`${season.number} · ${season.name}`}>
            {event.title}
          </GtTitle>
        </div>

        <dl className="mt-8 grid max-w-3xl grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <MetaField label="Track" value={event.org} />
          <MetaField label="Team" value={event.role} />
          <MetaField label="Stint" value={event.dates} />
          <MetaField label="Result" value={event.result} />
        </dl>

        <article className="mt-8 max-w-3xl border border-steel bg-panel shadow-[2px_3px_0_rgba(0,0,0,0.7)]">
          <LiveryStripe livery="marlboro" />
          <div className="flex flex-col gap-6 p-6">
            <section>
              <SectionHeading>Briefing</SectionHeading>
              <p className="mt-2 text-silver">{event.story.problem}</p>
            </section>
            <section>
              <SectionHeading>On track</SectionHeading>
              <ul className="mt-2 flex list-none flex-col gap-2">
                {event.story.actions.map((action, i) => (
                  <li key={i} className="flex gap-2.5 text-silver">
                    <span
                      aria-hidden="true"
                      className="mt-1 font-display text-xs font-black text-gt-bright"
                    >
                      ▸
                    </span>
                    {action}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <SectionHeading>Result</SectionHeading>
              <p className="ts-hard mt-2 text-chrome">{event.story.results}</p>
            </section>
          </div>
        </article>

        {(event.links?.length || event.carIds?.length || event.missionIds?.length) ? (
          <div className="mt-6 flex max-w-3xl flex-wrap items-center gap-2">
            {event.links?.map((l) => (
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
            {event.carIds?.map((c) => (
              <LockedChip key={c} label={c} unlocksWith="Garage" />
            ))}
            {event.missionIds?.map((m) => (
              <LockedChip key={m} label={m} unlocksWith="Missions" />
            ))}
          </div>
        ) : null}
      </main>
    </div>
  );
}
