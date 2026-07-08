import type { Metadata } from "next";
import { GtCrumb, GtTitle, LozengeLink } from "@/components/gt/GtChrome";
import { CareerBoard } from "@/components/career/CareerBoard";

export const metadata: Metadata = {
  title: "Career — Surya Pugazhenthi",
  description:
    "Surya Pugazhenthi's education and work history: Diablo Valley College, UC Santa Cruz, product roles, hackathon wins, and venture scouting — season by season.",
};

export default function CareerPage() {
  return (
    <div className="relative flex flex-1 flex-col px-5 py-6 md:px-10 md:py-8">
      <GtCrumb label="Career" />

      <header>
        <LozengeLink href="/">
          <span aria-hidden="true">←</span> World Map
        </LozengeLink>
      </header>

      <main className="flex flex-1 flex-col pb-10">
        <div className="mt-10 md:mt-12">
          <GtTitle kicker="Story mode">Career</GtTitle>
          <p className="mt-3 max-w-2xl text-base text-silver">
            Three seasons so far: community college, university, and the
            venture-and-agents era. Pick a season, open an event, read the
            race report.
          </p>
        </div>

        <CareerBoard />
      </main>
    </div>
  );
}
