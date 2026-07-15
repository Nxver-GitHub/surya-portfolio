import Link from "next/link";
import { BootSequence } from "@/components/boot/BootSequence";
import { GtCrumb, GtTitle } from "@/components/gt/GtChrome";
import { CircuitMap } from "@/components/world-map/CircuitMap";
import { PavilionList } from "@/components/world-map/PavilionList";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col px-5 py-6 md:px-10 md:py-8">
      <BootSequence />
      <GtCrumb label="World Map" />

      <header className="flex items-baseline justify-between">
        <p className="ts-hard font-display text-lg font-black tracking-wide uppercase">
          Surya <span className="text-gt-bright">Racing</span>
        </p>
      </header>

      <main className="flex flex-1 flex-col">
        <div className="mt-10 md:mt-12">
          <GtTitle>World Map</GtTitle>
          <p className="mt-3 text-base text-silver">
            Pick a pavilion to explore work, skills, and projects.
          </p>
          <Link
            href="/cafe"
            className="plate ts-hard mt-4 mb-8 inline-block px-3 py-1.5 font-display text-xs font-bold tracking-widest text-gt-bright uppercase outline-none hover:text-chrome focus-visible:ring-2 focus-visible:ring-gt-bright md:mb-10"
          >
            New here? → Start with the GT Café menus
          </Link>
        </div>

        {/* Desktop: circuit map. Mobile: plate-button menu. */}
        <div className="hidden flex-1 md:block">
          <CircuitMap />
        </div>
        <div className="md:hidden">
          <PavilionList />
        </div>
      </main>
    </div>
  );
}
