import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/og-fonts";
import { OG_SIZE, OgCard } from "@/lib/og-template";
import { pavilions } from "../../../content/pavilions";

const pavilion = pavilions.find((p) => p.slug === "cafe")!;

export const alt = `${pavilion.name} — Surya Pugazhenthi`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const fonts = await loadOgFonts();
  return new ImageResponse(
    (
      <OgCard
        title={pavilion.name}
        tagline={pavilion.caption}
        liveryId={pavilion.livery}
      />
    ),
    { ...OG_SIZE, fonts },
  );
}
