import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { carById, carPath, detailCars, type Car } from "../../../../content/cars";
import { GtBackHeader, GtCrumb, GtTitle } from "@/components/gt/GtChrome";
import { SpecSheet } from "@/components/garage/SpecSheet";
import { JsonLd } from "@/components/seo/JsonLd";
import { PERSON_NAME } from "@/lib/identity";
import { projectLede } from "@/lib/project-lede";
import { breadcrumbJsonLd, projectJsonLd } from "@/lib/jsonld";
import { pageAlternates } from "@/lib/seo";

/**
 * One project's crawlable spec-sheet page. The 3D Garage (/garage?car=<id>)
 * stays the experience; this is the same SpecSheet, server-rendered with no
 * WebGL, so every project has a URL a search engine or agent can cite.
 * Locked entries get no page: findDetailCar refuses them, so they 404 the
 * same way an unknown career slug does.
 */

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return detailCars.map((car) => ({ slug: car.id }));
}

function findDetailCar(slug: string): Car | undefined {
  const car = carById.get(slug);
  return car && car.status !== "locked" ? car : undefined;
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const car = findDetailCar(slug);
  if (!car) return {};
  return {
    title: `${car.name}: a project by ${PERSON_NAME}`,
    description: projectLede(car),
    alternates: pageAlternates(carPath(car.id)),
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const car = findDetailCar(slug);
  if (!car) notFound();

  return (
    <div className="console-page relative flex flex-1 flex-col px-5 py-6 md:px-10 md:py-8" data-pavilion="garage">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Garage", path: "/garage" },
          { name: car.name, path: carPath(car.id) },
        ])}
      />
      <JsonLd data={projectJsonLd(car)} />
      <GtCrumb label="Garage" />

      <GtBackHeader href="/garage" label="Garage" />

      <main className="flex flex-1 flex-col pb-10">
        <div className="mt-10 md:mt-12">
          <GtTitle kicker="Spec sheet">{car.name}</GtTitle>
          <p className="mt-3 max-w-[62ch] text-base text-ink leading-snug">
            {projectLede(car)}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="border border-steel px-2 py-0.5 font-display text-xs font-semibold tracking-wider text-chrome uppercase">
              {car.status === "hero" ? "Shipped" : "In development"}
            </span>
            <Link
              href={`/garage?car=${car.id}`}
              className="plate ts-hard px-3 py-1.5 font-display text-sm font-bold tracking-widest text-gt-bright uppercase outline-none hover:text-chrome focus-visible:ring-2 focus-visible:ring-gt-bright"
            >
              {car.status === "hero" ? "Inspect in 3D" : "View in the Garage"} ▸
            </Link>
          </div>
        </div>

        <div className="mt-8 max-w-3xl">
          <SpecSheet car={car} />
        </div>
      </main>
    </div>
  );
}
