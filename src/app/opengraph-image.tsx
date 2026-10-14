import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/lib/og-fonts";
import { OG_SIZE, OgCard } from "@/lib/og-template";

export const alt =
  "Surya Pugazhenthi — Product Builder, CS Alum @ UCSC";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const fonts = await loadOgFonts();
  return new ImageResponse(
    (
      <OgCard
        title="SURYA PUGAZHENTHI"
        tagline="Product Builder · CS Alum @ UCSC"
      />
    ),
    { ...OG_SIZE, fonts },
  );
}
