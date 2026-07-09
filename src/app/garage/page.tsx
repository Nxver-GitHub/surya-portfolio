import type { Metadata } from "next";
import { Suspense } from "react";
import { GtCrumb, GtTitle, LozengeLink } from "@/components/gt/GtChrome";
import { CarBrowser } from "@/components/garage/CarBrowser";

export const metadata: Metadata = {
  title: "Garage — Surya Pugazhenthi",
  description:
    "Surya Pugazhenthi's projects: Nodegent, TripWeaver, Credence, BenefitFinder, Calendarize, ClientSight, and more — each with tech stack, impact, and results.",
};

export default function GaragePage() {
  return (
    <div className="relative flex flex-1 flex-col px-5 py-6 md:px-10 md:py-8">
      <GtCrumb label="Garage" />

      <header>
        <LozengeLink href="/">
          <span aria-hidden="true">←</span> World Map
        </LozengeLink>
      </header>

      <main className="flex flex-1 flex-col pb-10">
        <div className="mt-10 md:mt-12">
          <GtTitle kicker="Car selection">Garage</GtTitle>
          <p className="mt-3 max-w-2xl text-base text-silver">
            Every project is a machine. Pick one off the line to inspect its
            spec sheet — drivetrain, performance, lap records.
          </p>
        </div>

        <Suspense fallback={null}>
          <CarBrowser />
        </Suspense>
      </main>
    </div>
  );
}
