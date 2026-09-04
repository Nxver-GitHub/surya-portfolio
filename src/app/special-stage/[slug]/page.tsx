import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  caseStudyBySlug,
  stageOrder,
  type CaseStudy,
  type StageArtifact,
  type StageSection,
  type StageSlug,
} from "../../../../content/gtme";
import type { LiveryId } from "../../../../content/liveries";
import { pavilions } from "../../../../content/pavilions";
import { GtCrumb, LozengeLink } from "@/components/gt/GtChrome";
import { LiveryStripe } from "@/components/livery/LiveryStripe";
import { Chevron } from "@/components/rally/Chevron";
import { HandCheckBoard } from "@/components/rally/HandCheckBoard";
import { ProvenanceDot, ProvenanceLegend } from "@/components/rally/ProvenanceDot";
import { SectionFigure } from "@/components/rally/SectionFigure";
import { StageVideoPlate } from "@/components/rally/StageVideoPlate";
import { TimingBoard } from "@/components/rally/TimingBoard";

const RALLY_LIVERY: LiveryId =
  pavilions.find((p) => p.slug === "special-stage")?.livery ?? "subaru555";

/**
 * The recce board is a second view of one specific section's data, so it is
 * mounted directly beneath that section rather than appended to the page.
 */
const HAND_CHECK_STAGE: StageSlug = "pace-notes";
const HAND_CHECK_AFTER_SECTION = "Thirty accounts, checked by hand";

interface StagePageProps {
  params: Promise<{ slug: string }>;
}

function findStage(slug: string): CaseStudy | undefined {
  return caseStudyBySlug.get(slug as StageSlug);
}

export function generateStaticParams() {
  return stageOrder.map((slug) => ({ slug }));
}

/** First sentences of the lede, to roughly a meta-description length. */
function summarize(lede: readonly string[]): string {
  const sentences = (lede[0] ?? "").split(/(?<=\.)\s+/);
  const picked: string[] = [];
  for (const sentence of sentences) {
    picked.push(sentence);
    if (picked.join(" ").length >= 100) break;
  }
  return picked.join(" ");
}

export async function generateMetadata({
  params,
}: StagePageProps): Promise<Metadata> {
  const { slug } = await params;
  const stage = findStage(slug);
  if (!stage) return {};
  return {
    title: `${stage.title} — Special Stage — Surya Pugazhenthi`,
    description: summarize(stage.lede),
    alternates: { canonical: `/special-stage/${slug}` },
  };
}

function ChromeCaption({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-display text-xs font-bold tracking-[0.22em] text-gt-bright uppercase">
      {children}
    </p>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="ts-hard font-display text-xl font-bold tracking-wide text-chrome uppercase">
      {children}
    </h2>
  );
}

function PullQuote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="ts-hard max-w-[62ch] border border-steel bg-panel px-4 py-3 font-title text-lg text-chrome italic">
      {children}
    </blockquote>
  );
}

function Prose({ body }: { body: readonly string[] }) {
  return (
    <>
      {body.map((paragraph) => (
        <p
          key={paragraph}
          className="max-w-[68ch] text-base text-ink leading-snug"
        >
          {paragraph}
        </p>
      ))}
    </>
  );
}

/** A content section in the page's normal voice. */
function StoryBlock({ section }: { section: StageSection }) {
  return (
    <section className="mt-8 flex flex-col gap-3">
      {section.chrome ? <ChromeCaption>{section.chrome}</ChromeCaption> : null}
      <SectionHeading>{section.heading}</SectionHeading>
      <Prose body={section.body} />
      <SectionFigure figure={section.figure} />
      {section.quotes?.map((quote) => (
        <PullQuote key={quote}>{quote}</PullQuote>
      ))}
      {section.video ? <StageVideoPlate video={section.video} /> : null}
    </section>
  );
}

/**
 * The same section shape inside a stamped plate, under a red stamp and the
 * red title rule with its diagonal kick. The failures are not tucked away,
 * they just read as a filed incident.
 *
 * Spacing is deliberately tight: a chevron divider sits directly above this
 * block on the page and owns the gap.
 */
function IncidentBlock({ section }: { section: StageSection }) {
  return (
    <section className="plate mt-3">
      <div className="flex flex-col gap-3 p-5">
        {section.chrome ? (
          <p className="ts-hard -rotate-1 self-start bg-accent px-2 py-0.5 font-display text-xs font-black tracking-[0.2em] text-white uppercase">
            {section.chrome}
          </p>
        ) : null}
        <div className="max-w-fit">
          <SectionHeading>{section.heading}</SectionHeading>
          <div className="gt-rule mt-2 mr-3" />
        </div>
        <Prose body={section.body} />
        <SectionFigure figure={section.figure} />
        {section.quotes?.map((quote) => (
          <PullQuote key={quote}>{quote}</PullQuote>
        ))}
        {section.video ? <StageVideoPlate video={section.video} /> : null}
      </div>
    </section>
  );
}

function ArtifactFigure({ artifact }: { artifact: StageArtifact }) {
  return (
    <figure className="border border-steel bg-panel">
      <LiveryStripe livery={RALLY_LIVERY} />
      <div className="p-5">
        <h3 className="ts-hard font-display text-base font-bold tracking-wide text-chrome uppercase">
          {artifact.label}
        </h3>

        {artifact.kind === "image" && artifact.src ? (
          <div className="mt-3 overflow-x-auto border border-steel">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={artifact.src}
              alt={artifact.caption}
              width={1300}
              height={840}
              className="block h-auto w-[1300px] max-w-none"
            />
          </div>
        ) : null}

        {artifact.kind === "code" && artifact.code ? (
          <pre className="mt-3 overflow-x-auto border border-steel bg-asphalt p-4 font-mono text-sm text-ink">
            <code>{artifact.code}</code>
          </pre>
        ) : null}
      </div>
      <figcaption className="border-t border-steel px-5 py-3 text-sm text-silver leading-snug">
        {artifact.caption}
      </figcaption>
    </figure>
  );
}

export default async function StagePage({ params }: StagePageProps) {
  const { slug } = await params;
  const stage = findStage(slug);
  if (!stage) notFound();

  const index = stageOrder.indexOf(stage.slug);
  const previous = index > 0 ? findStage(stageOrder[index - 1]) : undefined;
  const next =
    index < stageOrder.length - 1 ? findStage(stageOrder[index + 1]) : undefined;

  return (
    <div className="relative flex flex-1 flex-col px-5 py-6 md:px-10 md:py-8">
      <GtCrumb label={stage.chrome} />

      <header>
        <LozengeLink href="/special-stage">
          <span aria-hidden="true">←</span> Special Stage
        </LozengeLink>
      </header>

      <main className="flex flex-1 flex-col pb-10">
        <div className="mt-10 md:mt-12">
          <TimingBoard
            chrome={stage.chrome}
            window={stage.window}
            livery={RALLY_LIVERY}
            className="max-w-[68ch]"
          />
          <div className="mt-5 max-w-[46ch]">
            <h1 className="gt-title text-3xl text-chrome md:text-4xl">
              {stage.title}
            </h1>
            <div className="gt-rule mt-2 mr-3" />
          </div>
        </div>

        {stage.assertion ? (
          <p className="ts-hard mt-4 max-w-[46ch] font-title text-xl text-chrome">
            {stage.assertion}
          </p>
        ) : null}

        <div className="mt-4 flex flex-col gap-3">
          <Prose body={stage.lede} />
          {stage.pullQuote ? <PullQuote>{stage.pullQuote}</PullQuote> : null}
          {stage.video ? <StageVideoPlate video={stage.video} /> : null}
        </div>

        {stage.careerEventSlug ? (
          <div className="mt-5">
            <Link
              href={`/career/${stage.careerEventSlug}`}
              transitionTypes={["nav-forward"]}
              data-sfx="confirm"
              className="plate ts-hard inline-block px-3 py-1.5 font-display text-xs font-bold tracking-widest text-gt-bright uppercase outline-none hover:text-chrome focus-visible:ring-2 focus-visible:ring-gt-bright"
            >
              Career entry: AlphaForge
            </Link>
          </div>
        ) : null}

        <Chevron className="mt-9" />
        <section className="mt-3 flex flex-col gap-3">
          <ChromeCaption>Stage log</ChromeCaption>
          <SectionHeading>Build log</SectionHeading>
          <ol className="flex flex-col gap-3">
            {stage.buildLog.map((entry) => (
              <li
                key={`${entry.date}-${entry.title}`}
                className="plate flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-5"
              >
                <p className="font-display text-xs font-bold tracking-[0.18em] text-gt-bright uppercase sm:w-[9ch] sm:shrink-0 sm:pt-1">
                  {entry.date}
                </p>
                <div className="flex flex-col gap-1">
                  <h3 className="ts-hard font-display text-base font-bold tracking-wide text-chrome">
                    {entry.title}
                  </h3>
                  <p className="max-w-[64ch] text-base text-ink leading-snug">
                    {entry.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <Chevron className="mt-9" />
        <section className="mt-3 flex flex-col gap-3">
          <ChromeCaption>Timing sheet</ChromeCaption>
          <SectionHeading>Metrics</SectionHeading>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stage.metrics.map((metric) => (
              <div
                key={metric.label}
                className="plate flex flex-col gap-1 px-4 py-3"
              >
                <dt className="font-display text-xs font-bold tracking-[0.16em] text-silver uppercase">
                  {metric.label}
                </dt>
                <dd>
                  <span className="ts-hard flex items-center gap-2 font-display text-xl font-black break-words text-chrome">
                    <span>{metric.value}</span>
                    {metric.provenance === "session" ? <ProvenanceDot /> : null}
                  </span>
                  {metric.detail ? (
                    <span className="mt-1 block text-sm text-ink leading-snug">
                      {metric.detail}
                    </span>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
          <ProvenanceLegend />
        </section>

        {stage.sections.map((section) => (
          <Fragment key={section.heading}>
            <StoryBlock section={section} />
            {stage.slug === HAND_CHECK_STAGE &&
            section.heading === HAND_CHECK_AFTER_SECTION ? (
              <HandCheckBoard />
            ) : null}
          </Fragment>
        ))}

        {/* Rally blue and yellow here: the incident block already carries a red
            stamp and a red rule, so a red chevron would double up on it. */}
        <Chevron variant="livery" livery={RALLY_LIVERY} className="mt-9" />
        <IncidentBlock section={stage.failures} />

        <StoryBlock section={stage.debrief} />

        {stage.artifacts.length ? (
          <>
            <Chevron className="mt-9" />
            <section className="mt-3 flex flex-col gap-3">
              <ChromeCaption>Service park</ChromeCaption>
              <SectionHeading>Artifacts</SectionHeading>
              <div className="flex flex-col gap-5">
                {stage.artifacts.map((artifact) => (
                  <ArtifactFigure key={artifact.label} artifact={artifact} />
                ))}
              </div>
            </section>
          </>
        ) : null}

        <nav
          aria-label="Stages"
          className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-steel pt-5"
        >
          {previous ? (
            <Link
              href={`/special-stage/${previous.slug}`}
              transitionTypes={["nav-back"]}
              data-sfx="back"
              aria-label={`Previous stage: ${previous.title}`}
              className="plate ts-hard px-3 py-1.5 font-display text-xs font-bold tracking-widest text-gt-bright uppercase outline-none hover:text-chrome focus-visible:ring-2 focus-visible:ring-gt-bright"
            >
              <span aria-hidden="true">←</span> {previous.chrome}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/special-stage/${next.slug}`}
              transitionTypes={["nav-forward"]}
              data-sfx="confirm"
              aria-label={`Next stage: ${next.title}`}
              className="plate ts-hard px-3 py-1.5 font-display text-xs font-bold tracking-widest text-gt-bright uppercase outline-none hover:text-chrome focus-visible:ring-2 focus-visible:ring-gt-bright"
            >
              {next.chrome} <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </main>
    </div>
  );
}
