import { ImageResponse } from "next/og";
import { loadSerifFont } from "@/lib/og-fonts";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * GT-orange rounded-square plate with a black serif "S", echoing the
 * IntroMonogram enamel badge at favicon scale. Kept to a single bold glyph
 * (no rim/kick detail) so it still reads at 16px in a browser tab.
 */
export default async function Icon() {
  const font = await loadSerifFont();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ef8100",
          borderRadius: 7,
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Source Serif 4",
            fontWeight: 700,
            fontSize: 22,
            lineHeight: 1,
            color: "#0a0a0b",
          }}
        >
          S
        </div>
      </div>
    ),
    { ...size, fonts: [font] },
  );
}
