import type { Metadata } from "next";
import { Suspense } from "react";
import { GtCrumb, GtTitle, LozengeLink } from "@/components/gt/GtChrome";
import { LicenseBoard } from "@/components/license/LicenseBoard";

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
          <GtTitle kicker="License tests">License Center</GtTitle>
          <p className="mt-3 max-w-[52ch] text-base text-ink leading-snug">
            Skills as license classes, B through S. Pick a class to see its
            tests — each one graded and linked to the project, competition, or
            role that earned it.
          </p>
        </div>

        <Suspense fallback={null}>
          <LicenseBoard />
        </Suspense>
      </main>
    </div>
  );
}
