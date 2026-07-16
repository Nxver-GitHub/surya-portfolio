import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { SoundProvider } from "@/components/sound/SoundProvider";
import { CrtLayer } from "@/components/crt/CrtLayer";
import { OptionsMenu } from "@/components/options/OptionsMenu";
import { PageViewBeacon } from "@/components/analytics/PageViewBeacon";
import { SITE_URL } from "@/lib/site";
import { saira, satoshi, sourceSerif } from "./fonts";
import "./globals.css";

const TITLE = "Surya Pugazhenthi — Builder, CS @ UCSC, VC Scout";
const DESCRIPTION =
  "Portfolio of Surya Pugazhenthi: computer science student, builder of AI and web projects, hackathon regular, and venture scout in the Bay Area.";

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
          {children}
          <OptionsMenu />
        </SoundProvider>
        <CrtLayer />
        <PageViewBeacon />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
