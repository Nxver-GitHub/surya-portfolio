import { ImageResponse } from "next/og";
import { loadSerifFont } from "@/lib/og-fonts";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Same mark as icon.tsx, scaled up for the iOS home-screen tile. */
export default async function AppleIcon() {
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
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Source Serif 4",
            fontWeight: 700,
            fontSize: 124,
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
