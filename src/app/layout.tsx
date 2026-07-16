import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { SoundProvider } from "@/components/sound/SoundProvider";
import { PageWipe } from "@/components/gt/PageWipe";
import { ControllerMode } from "@/components/controller/ControllerMode";
import { CrtLayer } from "@/components/crt/CrtLayer";
import { OptionsMenu } from "@/components/options/OptionsMenu";
import { PageViewBeacon } from "@/components/analytics/PageViewBeacon";
import { SITE_URL } from "@/lib/site";
import { saira, satoshi, sourceSerif } from "./fonts";
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
      data-crt="on"
      className={`${satoshi.variable} ${saira.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SoundProvider>
          <PageWipe>{children}</PageWipe>
          <OptionsMenu />
          <ControllerMode />
        </SoundProvider>
        <CrtLayer />
        <PageViewBeacon />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
