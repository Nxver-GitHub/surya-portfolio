import type { Metadata } from "next";
import { Suspense } from "react";
import { GtBackHeader, GtCrumb, GtTitle } from "@/components/gt/GtChrome";
import Link from "next/link";
import { CarBrowser } from "@/components/garage/CarBrowser";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { pageAlternates } from "@/lib/seo";
import { carPath, detailCars } from "../../../content/cars";

export const metadata: Metadata = {
  title: "Garage — Surya Pugazhenthi",
  description:
    "Surya Pugazhenthi's projects: Nodegent, TripWeaver, Credence, BenefitFinder, Calendarize, ClientSight, and more — each with tech stack, impact, and results.",
  alternates: pageAlternates("/garage"),
};

export default function GaragePage() {
  return (
    <div className="console-page relative flex flex-1 flex-col px-5 py-6 md:px-10 md:py-8" data-pavilion="garage">
      <JsonLd data={breadcrumbJsonLd([{ name: "Garage", path: "/garage" }])} />
      <GtCrumb label="Garage" />

      <GtBackHeader href="/" label="World Map" />

      <main className="flex flex-1 flex-col pb-10">
        <div className="mt-10 md:mt-12">
          <GtTitle kicker="Car selection">Garage</GtTitle>
          <p className="mt-3 max-w-[52ch] text-base text-ink leading-snug">
            Every project is a machine. Pick one off the line to inspect its
            spec sheet — drivetrain, performance, lap records.
          </p>
          <p className="mt-2 max-w-[62ch] text-sm text-silver leading-snug">
            Software projects by Surya Pugazhenthi: {detailCars.length} builds,
            each with its own page listing the tech stack, team and results.
          </p>
        </div>

        {/* Crawlable index of the per-project pages. The 3D browser below is
            client-rendered, so without this list a crawler sees no project. */}
        <nav aria-label="Project spec sheets" className="mt-4">
          <ul className="flex list-none flex-wrap gap-2">
            {detailCars.map((car) => (
              <li key={car.id}>
                <Link
                  href={carPath(car.id)}
                  className="plate ts-hard inline-flex px-3 py-1.5 font-display text-xs font-bold tracking-widest text-gt-bright uppercase outline-none hover:text-chrome focus-visible:ring-2 focus-visible:ring-gt-bright"
                >
                  {car.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Suspense fallback={null}>
          <CarBrowser />
        </Suspense>
      </main>
    </div>
  );
}
