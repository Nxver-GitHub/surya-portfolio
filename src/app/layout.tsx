import type { Metadata } from "next";
import { PresenceProvider } from "@/components/presence/PresenceProvider";
import { SoundProvider } from "@/components/sound/SoundProvider";
import { SoundBar } from "@/components/sound/SoundBar";
import { PageWipe } from "@/components/gt/PageWipe";
import { ControllerMode } from "@/components/controller/ControllerMode";
import { StewardsNotice } from "@/components/anticheat/StewardsNotice";
import { CrtLayer } from "@/components/crt/CrtLayer";
import { OptionsMenu } from "@/components/options/OptionsMenu";
import { PageViewBeacon } from "@/components/analytics/PageViewBeacon";
import { JsonLd } from "@/components/seo/JsonLd";
import { PERSON_NAME, PERSON_PROFILES, SITE_DESCRIPTION, SITE_TITLE } from "@/lib/identity";
import { siteGraphJsonLd } from "@/lib/jsonld";
import { pageAlternates } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { pixel, saira, satoshi, sourceSerif } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: pageAlternates("/"),
  openGraph: {
    siteName: PERSON_NAME,
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
        {/* rel="me": these profiles are this person. React hoists the links
            into <head>. Paired with each profile linking back here, it is the
            identity-consolidation signal search engines and agents use. */}
        {PERSON_PROFILES.map((href) => (
          <link key={href} rel="me" href={href} />
        ))}
        <JsonLd data={siteGraphJsonLd()} />
        <SoundProvider>
          <PresenceProvider>
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
          </PresenceProvider>
        </SoundProvider>
        <CrtLayer />
        <PageViewBeacon />
      </body>
    </html>
  );
}
