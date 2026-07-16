import type { Metadata } from "next";
import { GtCrumb, GtTitle, LozengeLink } from "@/components/gt/GtChrome";
import { TrophyWall } from "@/components/license/TrophyWall";

export const metadata: Metadata = {
  title: "License Center — Surya Pugazhenthi",
  description:
    "Surya Pugazhenthi's skills as license tiers, each backed by real work: front-end fundamentals, full-stack shipping, WebGL/Three.js, AI agents, and venture — with links to the projects, competitions, and roles that prove them.",
  alternates: { canonical: "/license-center" },
};

export default function LicenseCenterPage() {
  return (
    <div className="relative flex flex-1 flex-col px-5 py-6 md:px-10 md:py-8">
      <GtCrumb label="License Center" />

      <header>
        <LozengeLink href="/">
          <span aria-hidden="true">←</span> World Map
        </LozengeLink>
      </header>

      <main className="flex flex-1 flex-col pb-10">
        <div className="mt-10 md:mt-12">
          <GtTitle kicker="Trophy wall">License Center</GtTitle>
          <p className="mt-3 max-w-[52ch] text-base text-ink leading-snug">
            Every medal here was earned by shipped work. Tap one to inspect
            the machine, race, or role behind it.
          </p>
        </div>

        <TrophyWall />
      </main>
    </div>
  );
}
