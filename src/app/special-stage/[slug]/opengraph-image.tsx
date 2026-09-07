import { ImageResponse } from "next/og";
import { caseStudyBySlug, stageOrder, type StageSlug } from "../../../../content/gtme";
import { pavilions } from "../../../../content/pavilions";
import { loadOgFonts } from "@/lib/og-fonts";
import { OG_SIZE, OgCard } from "@/lib/og-template";

const RALLY_LIVERY =
  pavilions.find((p) => p.slug === "special-stage")?.livery ?? "subaru555";

/** Serif-friendly display names; the chrome strings are all-caps UI text. */
const DISPLAY_NAMES: Record<StageSlug, string> = {
  "reason-codes": "Reason Codes",
  recon: "Recon",
  "pace-notes": "Pace Notes",
  "the-stage": "The Stage",
};

export const alt = "Special Stage — Surya Pugazhenthi";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return stageOrder.map((slug) => ({ slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const stage = caseStudyBySlug.get(slug as StageSlug);
  const fonts = await loadOgFonts();

  return new ImageResponse(
    (
      <OgCard
        title={stage ? DISPLAY_NAMES[stage.slug] : "Special Stage"}
        tagline={stage?.assertion ?? stage?.title ?? "GTM engineering case studies"}
        liveryId={RALLY_LIVERY}
      />
    ),
    { ...OG_SIZE, fonts },
  );
}
