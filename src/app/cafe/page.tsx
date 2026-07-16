import type { Metadata } from "next";
import { Suspense } from "react";
import { GtCrumb, GtTitle, LozengeLink } from "@/components/gt/GtChrome";
import { CafeBrowser } from "@/components/cafe/CafeBrowser";

export const metadata: Metadata = {
  title: "GT Café — Surya Pugazhenthi",
  description:
    "Curated reading paths through Surya Pugazhenthi's portfolio: guided journeys for founders, VCs, and hiring managers, each linking to the projects, competitions, roles, and photography that matter most for them.",
  alternates: { canonical: "/cafe" },
};

export default function CafePage() {
  return (
    <div className="relative flex flex-1 flex-col px-5 py-6 md:px-10 md:py-8">
      <GtCrumb label="GT Café" />

      <header>
        <LozengeLink href="/">
          <span aria-hidden="true">←</span> World Map
        </LozengeLink>
      </header>

      <main className="flex flex-1 flex-col pb-10">
        <div className="mt-10 md:mt-12">
          <GtTitle kicker="Menu books">GT Café</GtTitle>
          <p className="mt-3 max-w-[52ch] text-base text-ink leading-snug">
            Pull up a chair. Each Menu Book is a short reading path built for a
            specific guest — founders, VCs, hiring managers — pointing you at
            the work worth seeing first.
          </p>
        </div>

        <Suspense fallback={null}>
          <CafeBrowser />
        </Suspense>
      </main>
    </div>
  );
}
