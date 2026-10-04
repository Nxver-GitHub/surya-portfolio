import type { Metadata } from "next";
import { GtBackHeader, GtCrumb, GtTitle } from "@/components/gt/GtChrome";
import { DriverProfile } from "@/components/license/DriverProfile";
import { TrophyWall } from "@/components/license/TrophyWall";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, personDetailJsonLd } from "@/lib/jsonld";
import { pageAlternates } from "@/lib/seo";

export const metadata: Metadata = {
  title: "License Center — Surya Pugazhenthi",
  description:
    "Surya Pugazhenthi's skills as license tiers, each backed by real work: front-end fundamentals, full-stack shipping, WebGL/Three.js, AI agents, go-to-market engineering, and venture — with links to the projects, competitions, and roles that prove them.",
  alternates: pageAlternates("/license-center"),
};

export default function LicenseCenterPage() {
  return (
    <div className="console-page relative flex flex-1 flex-col px-5 py-6 md:px-10 md:py-8" data-pavilion="license-center">
      <JsonLd data={breadcrumbJsonLd([{ name: "License Center", path: "/license-center" }])} />
      <JsonLd data={personDetailJsonLd()} />
      <GtCrumb label="License Center" />

      <GtBackHeader href="/" label="World Map" />

      <main className="flex flex-1 flex-col pb-10">
        <div className="mt-10 md:mt-12">
          <GtTitle kicker="Trophy wall">License Center</GtTitle>
          <p className="mt-3 max-w-[52ch] text-base text-ink leading-snug">
            Every medal here was earned by shipped work. Tap one to inspect
            the machine, race, or role behind it.
          </p>
          <p className="mt-2 max-w-[62ch] text-sm text-silver leading-snug">
            Surya Pugazhenthi&apos;s skills, from front-end fundamentals and
            full-stack shipping to AI agents, GTM engineering and venture, each
            linked to the project, competition or role that proves it.
          </p>
        </div>

        <DriverProfile />

        <TrophyWall />
      </main>
    </div>
  );
}
