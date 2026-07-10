import type { Metadata } from "next";
import { Suspense } from "react";
import { GtCrumb, GtTitle, LozengeLink } from "@/components/gt/GtChrome";
import { ScapesBrowser } from "@/components/scapes/ScapesBrowser";
import { pavilions } from "../../../content/pavilions";

export const metadata: Metadata = {
  title: "Scapes — Surya Pugazhenthi",
  description:
    "Photography and interests: nature, cars, and life on the road. A gallery of frames, some tied to the projects and events they sit alongside.",
};

const scapesPavilion = pavilions.find((p) => p.slug === "scapes");
const livery = scapesPavilion?.livery ?? "leyton";

export default function ScapesPage() {
  return (
    <div className="relative flex flex-1 flex-col px-5 py-6 md:px-10 md:py-8">
      <GtCrumb label="Scapes" />

      <header>
        <LozengeLink href="/">
          <span aria-hidden="true">←</span> World Map
        </LozengeLink>
      </header>

      <main className="flex flex-1 flex-col pb-10">
        <div className="mt-10 md:mt-12">
          <GtTitle kicker="Photo mode">Scapes</GtTitle>
          <p className="mt-3 max-w-2xl text-base text-silver">
            Frames between the races — nature, cars, and life on the road.
            Pick a category; a few shots link back to the machine or event
            they sit alongside.
          </p>
          <p className="mt-2 max-w-2xl text-sm text-silver/70">
            Gallery is under construction: every frame here is a reserved slot
            awaiting the real scan.
          </p>
        </div>

        <Suspense fallback={null}>
          <ScapesBrowser livery={livery} />
        </Suspense>
      </main>
    </div>
  );
}
