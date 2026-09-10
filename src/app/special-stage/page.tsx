import type { Metadata } from "next";
import Link from "next/link";
import {
  caseStudyBySlug,
  specialStage,
  stageOrder,
  throughLine,
  type CaseStudy,
} from "../../../content/gtme";
import type { LiveryId } from "../../../content/liveries";
import { pavilions } from "../../../content/pavilions";
import { GtBackHeader, GtCrumb, GtTitle } from "@/components/gt/GtChrome";
import { LiveryStripe } from "@/components/livery/LiveryStripe";
import { ProvenanceDot, ProvenanceLegend } from "@/components/rally/ProvenanceDot";
import { SSDoorPlate, stageChromeParts } from "@/components/rally/SSDoorPlate";
import { FootageStrip } from "@/components/rally/StageVideoPlate";

/** The Special Stage pavilion's livery nod (blue/yellow WRC rally colours),
 * applied to card chrome only, like the other pavilions. */
const RALLY_LIVERY: LiveryId =
  pavilions.find((p) => p.slug === "special-stage")?.livery ?? "subaru555";

export const metadata: Metadata = {
  title: "Special Stage — Surya Pugazhenthi",
  description:
    "GTM engineering case studies: the five reason codes for an empty cell, proven across detection, segmentation and outbound over 2,932 companies, with every number carrying its source and the failures reported alongside the wins.",
  alternates: { canonical: "/special-stage" },
};

function StageCard({ stage }: { stage: CaseStudy }) {
  /** Two headline numbers per card; the full set lives on the stage page. */
  const headline = stage.metrics.slice(0, 2);
  /** "SS1 · RECON" becomes a stamped door plate plus the stage name. */
  const { code, name } = stageChromeParts(stage.chrome);

  return (
    <article className="group relative flex flex-col border border-steel bg-panel shadow-[2px_3px_0_rgba(0,0,0,0.7)]">
      <LiveryStripe livery={RALLY_LIVERY} className="absolute inset-x-0 top-0" />

      <div className="flex flex-1 flex-col gap-3 p-5 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            {code ? (
              <SSDoorPlate code={code} livery={RALLY_LIVERY} size="sm" />
            ) : null}
            <p className="font-display text-xs font-bold tracking-[0.18em] text-gt-bright uppercase">
              {name}
            </p>
          </div>
          <p className="font-display text-xs tracking-wide text-silver uppercase tabular-nums">
            {stage.window}
          </p>
        </div>

        <h2 className="ts-hard font-display text-lg leading-snug font-bold text-chrome">
          <Link
            href={`/special-stage/${stage.slug}`}
            transitionTypes={["nav-forward"]}
            data-sfx="confirm"
            className="outline-none after:absolute after:inset-0 group-hover:text-gt-bright focus-visible:ring-2 focus-visible:ring-gt-bright"
          >
            {stage.title}
          </Link>
        </h2>

        {stage.assertion ? (
          <p className="max-w-[52ch] font-title text-base text-ink italic">
            {stage.assertion}
          </p>
        ) : null}

        <dl className="mt-auto grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2">
          {headline.map((metric) => (
            <div
              key={metric.label}
              className="border border-steel bg-asphalt px-3 py-2"
            >
              <dt className="font-display text-xs tracking-[0.14em] text-silver uppercase">
                {metric.label}
              </dt>
              <dd className="ts-hard mt-0.5 flex items-center gap-1.5 font-display text-base font-bold break-words text-chrome">
                <span>{metric.value}</span>
                {metric.provenance === "session" ? <ProvenanceDot /> : null}
              </dd>
            </div>
          ))}
        </dl>

        <p
          aria-hidden="true"
          className="plate ts-hard mt-1 self-start px-3 py-1.5 font-display text-xs font-bold tracking-widest text-gt-bright uppercase group-hover:text-chrome"
        >
          Open stage
        </p>
      </div>
    </article>
  );
}

/**
 * The thesis card: Reason Codes carries the through line the whole page is
 * organised around, so it sits directly under the hero at full width, above
 * the rally it draws its proofs from.
 */
function ThesisCard({ stage }: { stage: CaseStudy }) {
  const headline = stage.metrics.slice(0, 2);

  return (
    <article className="group relative border border-steel bg-panel shadow-[2px_3px_0_rgba(0,0,0,0.7)]">
      <LiveryStripe livery={RALLY_LIVERY} />
      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="font-display text-xs font-bold tracking-[0.22em] text-gt-bright uppercase">
            Through line · {stage.chrome}
          </p>
          <p className="font-display text-xs tracking-wide text-silver uppercase tabular-nums">
            {stage.window}
          </p>
        </div>

        <h2 className="ts-hard max-w-[38ch] font-display text-xl leading-snug font-bold text-chrome md:text-2xl">
          <Link
            href={`/special-stage/${stage.slug}`}
            transitionTypes={["nav-forward"]}
            data-sfx="confirm"
            className="outline-none after:absolute after:inset-0 group-hover:text-gt-bright focus-visible:ring-2 focus-visible:ring-gt-bright"
          >
            {stage.title}
          </Link>
        </h2>

        {stage.assertion ? (
          <p className="max-w-[56ch] font-title text-lg text-balance text-ink italic">
            {stage.assertion}
          </p>
        ) : null}

        <p className="max-w-[68ch] text-base text-ink leading-snug">
          {throughLine}
        </p>

        <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {headline.map((metric) => (
              <div
                key={metric.label}
                className="border border-steel bg-asphalt px-3 py-2"
              >
                <dt className="font-display text-xs tracking-[0.14em] text-silver uppercase">
                  {metric.label}
                </dt>
                <dd className="ts-hard mt-0.5 flex items-center gap-1.5 font-display text-base font-bold break-words text-chrome">
                  <span>{metric.value}</span>
                  {metric.provenance === "session" ? <ProvenanceDot /> : null}
                </dd>
              </div>
            ))}
          </dl>

          <p
            aria-hidden="true"
            className="plate ts-hard px-3 py-1.5 font-display text-xs font-bold tracking-widest text-gt-bright uppercase group-hover:text-chrome"
          >
            Open stage
          </p>
        </div>
      </div>
    </article>
  );
}

export default function SpecialStagePage() {
  const stages = stageOrder
    .map((slug) => caseStudyBySlug.get(slug))
    .filter((stage): stage is CaseStudy => stage !== undefined);
  const thesis = stages.find((stage) => stage.slug === "reason-codes");
  const rallyStages = stages.filter((stage) => stage.slug !== "reason-codes");

  return (
    <div className="console-page relative flex flex-1 flex-col px-5 py-6 md:px-10 md:py-8" data-pavilion="special-stage">
      <GtCrumb label="Special Stage" />

      <GtBackHeader href="/" label="World Map" />

      <main className="flex flex-1 flex-col pb-10">
        <div className="mt-10 md:mt-12">
          <GtTitle kicker={specialStage.caption}>Special Stage</GtTitle>

          <p className="ts-hard mt-4 max-w-[34ch] font-title text-2xl text-chrome md:text-3xl">
            {specialStage.headline}
          </p>

          <div className="mt-4 flex max-w-[68ch] flex-col gap-3">
            {specialStage.wedge.map((paragraph) => (
              <p key={paragraph} className="text-base text-ink leading-snug">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="plate mt-5 max-w-fit px-4 py-3">
            <ProvenanceLegend />
          </div>
        </div>

        {thesis ? (
          <section aria-label="Through line" className="mt-10">
            <ThesisCard stage={thesis} />
          </section>
        ) : null}

        <section aria-label="Stages" className="mt-10">
          <div className="flex items-baseline gap-3 border-b border-steel pb-2">
            <h2 className="ts-hard font-display text-2xl font-bold tracking-wide text-chrome uppercase">
              Stages
            </h2>
            <p className="text-sm text-ink">
              One rally, three stages, in the order it happened. The proofs.
            </p>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            {rallyStages.map((stage) => (
              <StageCard key={stage.slug} stage={stage} />
            ))}
          </div>
        </section>

        <FootageStrip footage={specialStage.footage} className="mt-9" />
      </main>
    </div>
  );
}
