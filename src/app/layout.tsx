import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { SoundProvider } from "@/components/sound/SoundProvider";
import { SoundBar } from "@/components/sound/SoundBar";
import { PageWipe } from "@/components/gt/PageWipe";
import { ControllerMode } from "@/components/controller/ControllerMode";
import { StewardsNotice } from "@/components/anticheat/StewardsNotice";
import { CrtLayer } from "@/components/crt/CrtLayer";
import { OptionsMenu } from "@/components/options/OptionsMenu";
import { PageViewBeacon } from "@/components/analytics/PageViewBeacon";
import { SITE_URL } from "@/lib/site";
import { pixel, saira, satoshi, sourceSerif } from "./fonts";
import "./globals.css";

const TITLE =
  "Surya Pugazhenthi — Builder, Venture Associate @ 16VC, CS Alum @ UCSC";
const DESCRIPTION =
  "Portfolio of Surya Pugazhenthi: UCSC computer science alum, builder of AI and web projects, hackathon regular, and venture associate at 16VC in the Bay Area.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    siteName: "Surya Pugazhenthi",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-crt="subtle"
      className={`${pixel.variable} ${satoshi.variable} ${saira.variable} ${sourceSerif.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <SoundProvider>
          <PageWipe>{children}</PageWipe>
          {/* The music deck: one fixed bar along the bottom edge of every
              screen. Mounted here rather than composed into the page headers so
              it is a constant of the console rather than a thing each route
              remembers, and so it never crowds a screen's own title row. Body
              reserves its height as padding, so nothing hides beneath it. */}
          <SoundBar />
          <OptionsMenu />
          <ControllerMode />
          <StewardsNotice />
        </SoundProvider>
        <CrtLayer />
        <PageViewBeacon />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
